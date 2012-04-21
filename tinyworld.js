function normalizeTheta(theta) {
  return theta % (2 * Math.PI) + (theta < 0 ? 2 * Math.PI : 0);
};

function Dog(theta) {
  this.theta = theta;
  this.grounded = true;
  this.v = 0;
  this.vy = 0;
  this.facing = 1;
};

Dog.prototype.tick = function(t) {
  var ground = this.planet.groundAt(this.theta);
  if (this.grounded) {
    this.r = ground.height;
    if (KB.keyPressed('z')) {
      this.grounded = false;
      this.vy = 1;
      this.r += 1;
    }
  } else {
    this.vy -= 4.9 * t;
    this.r += this.vy;
    if (this.r < ground.height) {
      this.grounded = true;
      this.r = ground.height;
    }
  }
  if (KB.keyDown(Keys.LEFT)) {
    this.v -= 15 * t;
    this.facing = -1;
  }
  if (KB.keyDown(Keys.RIGHT)) {
    this.v += 15 * t;
    this.facing = 1;
  }
  /*
  var dv = sgn(this.v) == sgn(ground.slope) ?
               this.v * (1 - Math.abs(ground.slope) / 3) :
               this.v * (1 + Math.abs(ground.slope) / 3);
               */
  var ev = this.v * Math.cos(Math.abs(ground.slope * Math.PI / 2));
  var newTheta = normalizeTheta(
      this.theta + t * ev / (this.planet.radius / 2 / Math.PI));
  dlog('v: ', this.v, ', nt: ', newTheta, ', slope: ', ground.slope, ', ev: ', ev);
  this.theta = newTheta;
  this.v *= 0.98;
  if (Math.abs(this.v) < 0.1) {
    this.v = 0;
  }
};

Dog.prototype.render = function(renderer) {
  var ctx = renderer.context();

  var height = this.r;
  var pi = new PolarPoint(height + 5, this.theta - Math.PI / 100 + renderer.t);
  var pj = new PolarPoint(height + 5, this.theta + Math.PI / 100 + renderer.t);
  var carta = pi.toCart();
  var cartb = pj.toCart();
  var tanx = cartb.y - carta.y;
  var tany = carta.x - cartb.x;
  var slope = Math.atan2(carta.x - cartb.x, carta.y - cartb.y);

  var cartc;
  var cartd;

  var cxoff = 3;
  var cyoff = -3;
  var dxoff = -3;
  var dyoff = -5;

  if (this.facing < 0) {
    var tmp = cxoff;
    cxoff = -dxoff;
    dxoff = -tmp;
    tmp = cyoff;
    cyoff = dyoff;
    dyoff = tmp;
  }

  var ct = Math.atan2(cxoff, cyoff) + slope;
  var dt = Math.atan2(dxoff, dyoff) + slope;

  var cx = Math.sqrt(cxoff * cxoff + cyoff * cyoff) * Math.cos(ct);
  var cy = Math.sqrt(cxoff * cxoff + cyoff * cyoff) * Math.sin(ct);
  var dx = Math.sqrt(dxoff * dxoff + dyoff * dyoff) * Math.cos(dt);
  var dy = Math.sqrt(dxoff * dxoff + dyoff * dyoff) * Math.sin(dt);

  cartc = pj.toCart().add(cx, cy);
  cartd = pi.toCart().add(dx, dy);

  ctx.fillStyle = 'rgb(56, 37, 10)';
  ctx.beginPath();
  ctx.moveTo(carta.x, carta.y);
  ctx.lineTo(cartb.x, cartb.y);
  ctx.lineTo(cartc.x, cartc.y);
  ctx.lineTo(cartd.x, cartd.y);
  ctx.fill();

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

PolarPoint.grow = function(polar, r) {
  return new PolarPoint(polar.r + r, polar.t, polar.depth);
};

PolarPoint.prototype.toCart = function() {
  var x = this.r * Math.cos(this.t);
  var y = this.r * Math.sin(this.t);
  return new CartPoint(x, y, this.depth);
};

function Planet(points, radius) {
  this.points = points;
  this.radius = radius;
};

Planet.prototype.render = function(renderer) {
  var ctx = renderer.context();

  for(var i = 0; i < this.points.length; ++i) {
    var j = (i == 0) ? this.points.length - 1 : i - 1;
    var pi = PolarPoint.rotate(this.points[i].polar, renderer.t);
    var pj = PolarPoint.rotate(this.points[j].polar, renderer.t);
    var carta = pi.toCart();
    var cartb = pj.toCart();
    var cartc = PolarPoint.grow(pj, this.radius / 2 - pj.r).toCart();
    var cartd = PolarPoint.grow(pi, this.radius / 2 - pi.r).toCart();

    ctx.fillStyle = this.points[i].color.toRgbString();
    ctx.beginPath();
    ctx.moveTo(carta.x, carta.y);
    ctx.lineTo(cartb.x, cartb.y);
    ctx.lineTo(cartc.x, cartc.y);
    ctx.lineTo(cartd.x, cartd.y);
    ctx.fill();
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
  var dx = (pi.t - pj.t) * this.radius;
  var slope = dy / dx;
  return {
    height: height,
    slope: slope
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
  this.zoom = 2;
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
  this.context_.fillStyle = 'rgb(50, 50, 40)';
  this.context_.fillRect(0, 0, this.w_, this.h_);

  this.context_.save();
  this.context_.translate(this.w_ / 2, this.h_ / 2);
  this.context_.scale(this.zoom, this.zoom);
  this.context_.translate(0, this.planet.radius);

  cb(this);

  this.context_.restore();
};

var points = [];
var NUM_POINTS = 50;
var RADIUS = 100;
for (var i = 0; i < NUM_POINTS; ++i) {
  points.push({
    color: new Rgb(randFlt(100), 128 + randFlt(-50, 50), 0),
    polar: new PolarPoint(RADIUS + randFlt(-RADIUS * 0.05, RADIUS * 0.05), 2 * Math.PI * i / NUM_POINTS)
  });
}
var planet = new Planet(points, RADIUS);
var dog = new Dog(-Math.PI / 4);
dog.planet = planet;

var gameElem = document.getElementById('game');
var daRenderer = new Renderer(gameElem, 640, 480);

daRenderer.planet = planet;


function renderFn() {
  daRenderer.render(function(renderer) {
    planet.render(renderer);
    dog.render(renderer);
  });
}

function tickFn(t) {
  if (KB.keyDown(Keys.DOWN)) {
    daRenderer.zoom *= (1 - t);
  }
  if (KB.keyDown(Keys.UP)) {
    daRenderer.zoom *= (1 + t);
  }
  dog.tick(t);
  daRenderer.t = -dog.theta - Math.PI / 2 + dog.v / planet.radius;
}

var gameStruct = {
  'elem': gameElem,
  'tick': tickFn,
  'render': renderFn
};
Pidgine.run(gameStruct);
