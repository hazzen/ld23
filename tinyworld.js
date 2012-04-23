function normalizeTheta(theta) {
  return theta % (2 * Math.PI) + (theta < 0 ? 2 * Math.PI : 0);
};

function Cloud(p, w, h, c) {
  this.p = p;
  this.w = w;
  this.h = h;
  this.c = c;
  this.speedMod = randFlt(0.8, 1.2);
  this.v = 0;
};

Cloud.prototype.tick = function(t) {
  var vd = this.planet.wind - this.v;
  this.v += vd * t / 2;
  this.v -= (this.v * 0.98 * t);

  this.p = PolarPoint.rotate(this.p, this.speedMod * t * this.v);
};

Cloud.prototype.render = function(renderer) {
  var ctx = renderer.context();

  var dt = this.planet.visualDistanceToTheta(this.w / 2, this.p.r);

  var pi = PolarPoint.rotate(this.p, -dt + renderer.t);
  var pj = PolarPoint.rotate(this.p, dt + renderer.t);
  var carta = PolarPoint.grow(pi, this.h / 2).toCart();
  var cartb = PolarPoint.grow(pj, this.h / 2).toCart();
  var cartc = PolarPoint.grow(pj, -this.h / 2).toCart();
  var cartd = PolarPoint.grow(pi, -this.h / 2).toCart();

  ctx.fillStyle = this.c.toRgbString();
  ctx.beginPath();
  ctx.moveTo(carta.x, carta.y);
  ctx.lineTo(cartb.x, cartb.y);
  ctx.lineTo(cartc.x, cartc.y);
  ctx.lineTo(cartd.x, cartd.y);
  ctx.fill();
};

function Frisbee(p, vr, vt) {
  this.p = p;
  this.vr = vr;
  this.vt = vt;
  this.frame = 0;
};

Frisbee.prototype.asSlice = function() {
  var dt = this.planet.distanceToTheta(16);
  return new PolarSlice(this.p, 4, dt);
};

Frisbee.prototype.tick = function(t) {
  this.vr -= 10 * t;
  if (sgn(this.vt) == sgn(this.planet.wind)) {
    if (Math.abs(this.vt) < Math.abs(this.planet.wind)) {
      this.vt += this.planet.wind * t / 15;
    }
  } else {
    this.vt += this.planet.wind * t / 5;
  }
  this.frame += 10 * t;
  this.p.r += this.vr * t;
  this.p.t += normalizeTheta(this.vt * t);
  var ground = this.planet.groundAt(this.p.t);
  var dt = this.planet.distanceToTheta(10);
  var pmin = PolarPoint.rotate(this.p, -dt);
  var pmax = PolarPoint.rotate(this.p, dt);
  if (this.asSlice().overlaps(this.planet.player.asSlice())) {
    this.dead = true;
    SOUNDS.PICKUP.play();
  }
  if (this.p.r - 2 < ground.height ||
      pmin.r - 2 < ground.height ||
      pmax.r - 2 < ground.height) {
    this.dead = true;
    SOUNDS.DROP.play();
  }
};

Frisbee.prototype.render = function(renderer) {
  var ctx = renderer.context();

  var rp = PolarPoint.rotate(this.p, renderer.t);

  var dt = this.planet.visualDistanceToTheta(16, this.p.r);
  var pa = PolarPoint.rotate(rp, -dt);
  var carta = pa.toCart();

  if (this.frame >= SPRITES.FRISBEE.numFrames()) {
    this.frame -= SPRITES.FRISBEE.numFrames();
  }
  var dx = carta.x;
  var dy = carta.y;
  SPRITES.FRISBEE.renderFrameScaled(
      renderer, sgn(this.vt) ? Math.floor(this.frame) : 0, dx, dy,
      16, 4,
      this.facing < 0 ? Sprite.RENDER_FLIPPED : 0)
};

function Dog(theta) {
  this.theta = theta;
  this.grounded = true;
  this.jumping = false;
  this.v = 0;
  this.vy = 0;
  this.facing = 1;
  this.MAX_V = 30;
  this.ACCEL = 35;
  this.lastSlope = null;
  this.frame = 0;
};

Dog.prototype.asSlice = function() {
  var dt = this.planet.distanceToTheta(10);
  return new PolarSlice(new PolarPoint(this.r, this.theta), 5, dt);
};

Dog.prototype.tick = function(t) {
  this.frame += 10 * t * Math.max(0.2, Math.abs(this.v) / this.MAX_V);
  var ground = this.planet.groundAt(this.theta);
  var newSlope = ground.slope;
  var slopeChanged = this.lastSlope != null && newSlope != this.lastSlope;
  if (slopeChanged) {
    var slopeDiff = newSlope - this.lastSlope;
    var slopeMag = Math.abs(slopeDiff);
    if (sgn(this.lastSlope) != sgn(newSlope)) {
      if (sgn(this.v) != sgn(newSlope)) {
        if (this.grounded) this.r = ground.height;
        this.grounded = false;
        this.vy += Math.abs(this.v) * slopeMag * 100 * t;
      }
    } else if (sgn(this.v) != sgn(slopeDiff)) {
      if (this.grounded) this.r = ground.height;
      this.grounded = false;
      this.vy += Math.abs(this.v) * slopeMag * 100 * t;
    }
  }
  if (!this.jumping && KB.keyDown('z') && this.r) {
    SOUNDS.JUMP.play();
    this.grounded = false;
    this.jumping = true;
    this.vy = 100;
    this.r += 1;
  }
  if (this.grounded) {
    this.vy = 0;
    this.jumping = false;
    this.r = ground.height;
  } else {
    var dr = this.vy * t;// * Math.sin(ground.slopeAtan);
    var dt = this.planet.distanceToTheta(100 * this.vy) * t * -Math.cos(ground.slopeAtan);
    this.vy -= t * 200;
    this.v += dt;
    this.r += dr;
    if (this.r < ground.height) {
      this.grounded = true;
      this.r = ground.height;
    }
  }
  var MIN_SPEED = 0.5;
  var moving = false;
  if (KB.keyDown(Keys.LEFT)) {
    moving = true;
    if (Math.abs(this.v) < MIN_SPEED) {
      this.frame = 1;
      this.v = -MIN_SPEED;
    }
    this.v -= this.ACCEL * t;
    this.facing = -1;
  }
  if (KB.keyDown(Keys.RIGHT)) {
    moving = true;
    if (Math.abs(this.v) < MIN_SPEED) {
      this.frame = 1;
      this.v = MIN_SPEED;
    }
    this.v += this.ACCEL * t;
    this.facing = 1;
  }
  var maxv = sgn(this.v) == sgn(ground.slope) ?
      this.MAX_V * (1 - Math.abs(ground.slope) / 3) :
      this.MAX_V * (1 + Math.abs(ground.slope) / 3);
  var ev = this.v * Math.cos(Math.atan(ground.slope));
  var newTheta = normalizeTheta(
      this.theta + t * ev / (this.planet.radius / 2 / Math.PI));
  this.theta = newTheta;
  this.v -= (this.v * 0.98 * t);
  if (!moving && Math.abs(this.v) < MIN_SPEED) {
    this.v = 0;
  } else if (Math.abs(this.v) > (this.grounded ? maxv : this.MAX_V)) {
    this.v -= t * sgn(this.v) * this.ACCEL * 2;
  }
  this.lastSlope = newSlope;
};

Dog.prototype.render = function(renderer) {
  var ctx = renderer.context();

  var height = this.r;
  var dt = this.planet.visualDistanceToTheta(10, this.r);
  var pi = PolarPoint.rotate(
    new PolarPoint(height + 5, this.theta + renderer.t),
    -dt);
  var carta = pi.toCart();

  if (this.frame >= SPRITES.DOG.numFrames()) {
    this.frame -= SPRITES.DOG.numFrames();
  }
  var dx = carta.x;
  var dy = carta.y;
  SPRITES.DOG.renderFrameScaled(
      renderer, sgn(this.v) ? Math.floor(this.frame) : 0, dx, dy,
      20, 10,
      this.facing < 0 ? Sprite.RENDER_FLIPPED : 0)
}

function CartPoint(x, y, opt_depth) {
  this.x = x;
  this.y = y;
  this.depth = (opt_depth == null ? 0 : opt_depth);
};

CartPoint.prototype.add = function(x, y) {
  this.x += x;
  this.y += y;
  return this;
};

CartPoint.prototype.toPolar = function() {
  var t = Math.atan2(this.y, this.x);
  var r = Math.sqrt(this.x * this.x + this.y * this.y);
  return new PolarPoint(r, t, this.depth);
};

function PolarPoint(r, t, opt_depth) {
  this.r = r;
  this.t = normalizeTheta(t);
  this.depth = (opt_depth == null ? 0 : opt_depth);
};

PolarPoint.rotate = function(polar, theta) {
  return new PolarPoint(polar.r, polar.t + theta, polar.depth);
};

PolarPoint.rotateUnits = function(polar, radius, amount) {
  var td = amount / radius / 2 / Math.PI;
  return new PolarPoint(polar.r, polar.t + td, polar.depth);
};

PolarPoint.grow = function(polar, r) {
  return new PolarPoint(polar.r + r, polar.t, polar.depth);
};

PolarPoint.prototype.toCart = function() {
  var x = this.r * Math.cos(this.t);
  var y = this.r * Math.sin(this.t);
  return new CartPoint(x, y, this.depth);
};

function PolarSlice(center, r, t) {
  this.center = center;
  this.r = r;
  this.t = t;
};

PolarSlice.prototype.toString = function() {
  return '[r' + this.center.r + ' +/- ' + this.r + ', ' +
          't' + this.center.t + ' +/- ' + this.t + ']';
};

PolarSlice.prototype.overlaps = function(other) {
  var ar1 = this.center.r - this.r;
  var ar2 = this.center.r + this.r;
  var at1 = this.center.t - this.t;
  var at2 = this.center.t + this.t;

  var br1 = other.center.r - other.r;
  var br2 = other.center.r + other.r;
  var bt1 = other.center.t - other.t;
  var bt2 = other.center.t + other.t;


  if (ar1 <= br2 && br1 <= ar2) {
    return (normalizeTheta(bt1 - at1) <= normalizeTheta(at2 - at1) ||
            normalizeTheta(bt2 - at1) <= normalizeTheta(bt1 - at1));
  }
  return false;
};

function Planet(points, radius) {
  this.points = points;
  this.radius = radius;
  this.actors = [];
  this.wind = Math.PI / 8;
  for (var i = 0; i < 50; ++i) {
    this.actors.push(null);
  }
  this.time = 0;
  this.nextFrisbee = 1;
  this.nextWindChange = 2;
};

Planet.prototype.distanceToTheta = function(d) {
  return d / this.radius;
};

Planet.prototype.visualDistanceToTheta = function(d, r) {
  return d / (this.radius + (r - this.radius));
};

Planet.prototype.addActor = function(a) {
  var i;
  for (i = 0; i < this.actors.length; ++i) {
    if (!this.actors[i] || this.actors[i].dead) {
      break;
    }
  }
  if (i == this.actors.length) {
    this.actors.push(null);
  }
  this.actors[i] = a;
  a.planet = this;
};

Planet.prototype.newFrisbee = function() {
  var speedMin = this.distanceToTheta(50);
  var speedMax = this.distanceToTheta(150);
  var basePos = this.player.theta;
  var frisbee = new Frisbee(
    new PolarPoint(this.player.r + randFlt(100, 150), basePos + randSgn() * randFlt(Math.PI / 8)),
    -1,
    sgn(this.player.v) * randFlt(speedMin, speedMax));
  this.addActor(frisbee);
};

Planet.prototype.tick = function(t) {
  this.time += t;

  if (this.time > this.nextFrisbee) {
    this.newFrisbee();
    this.nextFrisbee += randFlt(5, 10);
  }

  if (this.time > this.nextWindChange) {
    var newWind = randFlt(-Math.PI / 8, Math.PI / 8);
    this.wind = (1 - 0.9) * this.wind + 0.9 * newWind;
    this.nextWindChange += randFlt(5, 10);
  }

  for (var i = 0; i < this.actors.length; ++i) {
    if (this.actors[i] && !this.actors[i].dead) {
      this.actors[i].tick(t);
    }
  }
};

Planet.prototype.render = function(renderer) {
  var ctx = renderer.context();

  ctx.fillStyle = 'rgb(0, 87, 0)';
  ctx.beginPath();
  var dt = 2 * Math.PI / this.points.length;
  for (var i = 0; i < this.points.length; ++i) {
    var pi = new PolarPoint(this.radius, dt * i + renderer.t);
    var cart = pi.toCart();
    if (i == 0) {
      ctx.moveTo(cart.x, cart.y)
    } else {
      ctx.lineTo(cart.x, cart.y)
    }
  }
  ctx.fill();

  for(var i = 0; i < this.points.length; ++i) {
    var j = (i == 0) ? this.points.length - 1 : i - 1;
    var pi = PolarPoint.rotate(this.points[i].polar, renderer.t);
    var pj = PolarPoint.rotate(this.points[j].polar, renderer.t);
    var carta = pi.toCart();
    var cartb = pj.toCart();
    var cartc = PolarPoint.grow(pj, -pj.r).toCart();
    var cartd = PolarPoint.grow(pi, -pi.r).toCart();

    ctx.fillStyle = this.points[i].color.toRgbString();
    ctx.beginPath();
    ctx.moveTo(carta.x, carta.y);
    ctx.lineTo(cartb.x, cartb.y);
    ctx.lineTo(cartc.x, cartc.y);
    ctx.lineTo(cartd.x, cartd.y);
    ctx.fill();

    var fc = this.points[i].color.toHsl();
    ctx.fillStyle = this.points[i].color.toRgbString();

    // draw some grass?
    var ga = PolarPoint.grow(pi, 5).toCart();
    var lx = ga.x - carta.x;
    var ly = ga.y - carta.y;

    var dx = cartb.x - carta.x;
    var dy = cartb.y - carta.y;
    var jitterx = new DetRand(i);
    var width = new DetRand(i * 63);
    var color = new DetRand(this.points[i].polar.t);
    for (var jx = 0; jx < 1; jx += 0.05 + 0.1 * jitterx.next()) {
      fc.l += -0.025 + 0.05 * color.next();
      ctx.strokeStyle = fc.toRgb().toRgbString();
      ctx.beginPath();
      ctx.lineWidth = (1 + color.next()) * renderer.zoom;
      var length = width.next();
      ctx.moveTo(carta.x + dx * jx - length * lx, carta.y + dy * jx - length * ly);
      ctx.lineTo(carta.x + dx * jx + length * lx, carta.y + dy * jx + length * ly);
      ctx.stroke();
    }
  }

  for (var i = 0; i < this.actors.length; ++i) {
    if (this.actors[i] && !this.actors[i].dead) {
      this.actors[i].render(renderer);
    }
  }
};

Planet.prototype.groundAt = function(theta) {
  theta = normalizeTheta(theta);
  var next = 1;
  for (var i = 0; i < this.points.length + 1; ++i) {
    if (i == this.points.length) {
      if (this.points[i - 1].polar.t < theta) {
        next = 0;
      }
    } else {
      if (this.points[i].polar.t > theta) {
        next = i;
        break;
      }
    }
  }
  var prev = (next == 0) ? this.points.length - 1 : next - 1;
  var pi = this.points[next].polar;
  var pj = this.points[prev].polar;
  var a = normalizeTheta(pi.t - theta) / normalizeTheta(pi.t - pj.t);
  var height = pj.r * a + pi.r * (1 - a);
  var dy = pi.r - pj.r;
  var dx = normalizeTheta((pi.t - pj.t)) * this.radius;
  var slope = dy / dx;
  return {
    height: height,
    slope: slope,
    slopeAtan: Math.atan2(dx, dy)
  };
};

function Renderer(attachTo, width, height) {
  $(attachTo).width(width);
  this.canvasElem_ = $('<canvas />')
      .attr('width', width)
      .attr('height', height)
      .appendTo(attachTo)
      .get(0);
  this.context_ = this.canvasElem_.getContext('2d');
  this.w_ = this.canvasElem_.width;
  this.h_ = this.canvasElem_.height;
  this.t = 0;
  this.zoom = 1.7;
}

Renderer.prototype.width = function() {
  return this.w_;
};

Renderer.prototype.height = function() {
  return this.h_;
};

Renderer.prototype.context = function() {
  return this.context_;
};

Renderer.prototype.render = function(cb) {
  this.context_.clearRect(0, 0, this.w_, this.h_);
  this.context_.fillStyle = 'rgb(180, 200, 255)';
  this.context_.fillRect(0, 0, this.w_, this.h_);

  this.context_.save();
  this.zoom = Math.max(1, Math.min(2.5, this.zoom));
  this.context_.translate(this.w_ / 2, this.h_ / 2);
  this.context_.scale(this.zoom, this.zoom);
  this.context_.translate(0, this.planet.radius * 1.1);

  cb(this);

  this.context_.restore();
};

var RADIUS = 500;

function genPoints() {
  var points = [];
  var NUM_POINTS = 50;
  for (var i = 0; i < NUM_POINTS; ++i) {
    points.push({
      color: new Rgb(0, 128, 0),
      polar: new PolarPoint(RADIUS + randFlt(-RADIUS * 0.05, RADIUS * 0.05),
                            2 * Math.PI * i / NUM_POINTS)
    });
  }
  // modulate colors randomly
  for (var i = 0; i < NUM_POINTS; ++i) {
    var targetPoint = randInt(NUM_POINTS);
    var satMod = randFlt(0.01, 0.1);
    for (var target = i - 3; target <= i + 3; ++target) {
      var ti = target % NUM_POINTS;
      if (ti < 0) ti += NUM_POINTS;
      var td = 1 / (1 + Math.abs(target - i));
      var c = points[ti].color.toHsl();
      c.s -= satMod * td;
      points[ti].color = c.toRgb();
    }
  }
  return points;
}

function genPlanet() {
  var daPlanet = new Planet(genPoints(), RADIUS);
  var dog = new Dog(-Math.PI / 4);
  daPlanet.player = dog;

  var NUM_CLOUDS = 75;
  function newCloud(planet) {
    var cr = RADIUS + randFlt(RADIUS * 0.1, RADIUS * 0.3);
    var ct = randFlt(0, 2 * Math.PI);
    var w = randFlt(10, 100);
    var h = randFlt(10, 50);
    var color = new Hsl(0.63, 1, 0.95);
    color.l += randFlt(-0.05, 0.05);
    var cloud = new Cloud(new PolarPoint(cr, ct), w, h, color.toRgb());
    planet.addActor(cloud);
  }
  // "behind" clouds
  for (var i = 0; i < NUM_CLOUDS / 2; ++i) {
    newCloud(daPlanet);
  }
  daPlanet.addActor(dog);
  // "front" clouds
  for (var i = 0; i < NUM_CLOUDS / 2; ++i) {
    newCloud(daPlanet);
  }
  return daPlanet;
}

var gameElem = document.getElementById('game');
$(gameElem).blur(function() {
  KB.clearAll();
  FOCUSED = false;
});
$(gameElem).focus(function() {
  FOCUSED = true;
});
var daRenderer = new Renderer(gameElem, 640, 480);

daPlanet = genPlanet();
daSplash = new SplashScreen();
daRenderer.planet = daPlanet;
FOCUSED = true;

function renderFn() {
  if (GAME_STARTED) {
    daRenderer.render(function(renderer) {
      daPlanet.render(renderer);
    });
  } else {
    daSplash.render(daRenderer);
  }
  if (!FOCUSED) {
    var ctx = daRenderer.context();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(0, 0, daRenderer.width(), daRenderer.height());
    ctx.fillStyle = 'rgb(66, 66, 66)';
    ctx.font = '36 arial';
    ctx.fillText('focus lost. click to regain.', 0, 320);
  }
}

GAME_STARTED = false;

function tickFn(t) {
  if (GAME_STARTED) {
    daPlanet.tick(t);
    if (KB.keyDown(Keys.DOWN)) {
      daRenderer.zoom *= (1 - t);
    }
    if (KB.keyDown(Keys.UP)) {
      daRenderer.zoom *= (1 + t);
    }
    if (KB.keyPressed('s')) {
      daPlanet.newFrisbee();
    }
    var newRendererT = -daPlanet.player.theta - Math.PI / 2 +
        daPlanet.distanceToTheta(
            sgn(daPlanet.player.v) * Math.pow(Math.abs(daPlanet.player.v),
            1.15));
    daRenderer.t = newRendererT;
  } else {
    daSplash.tick(t);
  }
}

function SplashScreen() {
  this.t = 0;
  this.state = 0;
}

SplashScreen.prototype.reset = function() {
  this.t = 0;
  this.state = 0;
};

SplashScreen.prototype.render = function(renderer) {
  var ctx = renderer.context();
  if (this.state == 0) {
    SPRITES.SPLASH.renderFrame(daRenderer, 0, 0, 0, 0);
    if (this.t > 1) {
      ctx.fillStyle = 'rgb(44, 44, 44)';
      ctx.font = '36 arial';
      ctx.fillText('press Z to begin', 0, 400);
    }
  } else if (this.state == 1) {
    ctx.font = '20 arial';
    ctx.fillStyle = 'rgb(240, 240, 255)';
    ctx.fillRect(0, 0, renderer.width(), renderer.height());
    ctx.fillStyle = 'rgb(66, 66, 66)';
    ctx.fillText('dog was playing fetch one day', 0, 40);
    ctx.fillText('dog didn\'t hear the car', 0, 70);
    ctx.fillText('now dog gets to play fetch all day', 0, 100);
    ctx.fillText('in his own little world', 0, 130);
    ctx.fillText('run left and right with the arrows', 0, 300);
    ctx.fillText('and make dog jump with "z"', 0, 330);
  }
};
SplashScreen.prototype.tick = function(t) {
  if (KB.keyPressed('z')) {
    if (this.state == 0) {
      this.state = 1;
    } else if (this.state == 1) {
      this.state = 2;
      SPLASH_MUSIC.stop();
      MUSIC.play();
      GAME_STARTED = true;
    }
  }
  this.t += t;
  if (this.t > 2) {
    this.t -= 2;
  }
};

var SPRITES = {
  SPLASH: new Sprite('splash.png'),
  DOG: new Sprite('dog.png', 32),
  FRISBEE: new Sprite('frisbee.png', 16)
};
var imgLoader = new ImgLoader();
for (var spr in SPRITES) {
  imgLoader.load(SPRITES[spr]);
}
var SOUNDS = {
  'JUMP': new Sound('jump.mp3'),
  'PICKUP': new Sound('pickup.mp3'),
  'DROP': new Sound('drop.mp3')
};
for (var snd in SOUNDS) {
  imgLoader.load(SOUNDS[snd]);
}
var MUSIC = new Sound('music.mp3');
var SPLASH_MUSIC = new Sound('bg.mp3');
imgLoader.load(MUSIC);
MUSIC.loop(true);
SPLASH_MUSIC.loop(true);

var gameStruct = {
  'elem': gameElem,
  'tick': tickFn,
  'render': renderFn
};
imgLoader.whenDone(function() {
  SPLASH_MUSIC.play();
  $(gameElem).focus();
  Pidgine.run(gameStruct);
});
