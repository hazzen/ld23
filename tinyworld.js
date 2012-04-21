function CartPoint(x, y, opt_depth) {
  this.x = x;
  this.y = y;
  this.depth = (opt_depth == null ? 0 : opt_depth);
};

CartPoint.prototype.toPolar = function() {
  var t = Math.atan2(this.y, this.x);
  var r = Math.sqrt(this.x * this.x + this.y * this.y);
  return new PolarPoint(r, t, this.depth);
};

function PolarPoint(r, t, opt_depth) {
  this.r = r;
  this.t = t % (2 * Math.PI);
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

function Planet(points) {
  this.points = points;
};

Planet.prototype.render = function(renderer) {
  var ctx = renderer.context();

  for(var i = 0; i < this.points.length; ++i) {
    var j = (i == 0) ? this.points.length - 1 : i - 1;
    var pi = PolarPoint.rotate(this.points[i].polar, renderer.t);
    var pj = PolarPoint.rotate(this.points[j].polar, renderer.t);
    var carta = pi.toCart();
    var cartb = pj.toCart();
    var cartc = PolarPoint.grow(pj, -0.1).toCart();
    var cartd = PolarPoint.grow(pi, -0.1).toCart();

    ctx.fillStyle = Rgb.Blend(this.points[i].color,
                              this.points[j].color).toRgbString();
    ctx.beginPath();
    ctx.moveTo(carta.x, carta.y);
    ctx.lineTo(cartb.x, cartb.y);
    ctx.lineTo(cartc.x, cartc.y);
    ctx.lineTo(cartd.x, cartd.y);
    ctx.fill();
  }
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
  this.zoom = 200;
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
  this.context_.translate(0, 1);

  this.context_.fillStyle = 'rgb(0, 0, 0)';
  this.context_.fillRect(-1, -1, 2, 2);

  cb(this);

  this.context_.restore();
};

var points = [];
var NUM_POINTS = 50;
for (var i = 0; i < NUM_POINTS; ++i) {
  points.push({
    color: new Rgb(randFlt(100), 128 + randFlt(-50, 50), 0),
    polar: new PolarPoint(1, 2 * Math.PI * i / NUM_POINTS)
  });
}
var planet = new Planet(points);

var gameElem = document.getElementById('game');
var daRenderer = new Renderer(gameElem, 640, 480);


function renderFn() {
  daRenderer.render(function(renderer) {
    planet.render(renderer);
  });
}

function tickFn(t) {
  if (KB.keyDown(Keys.LEFT)) {
    daRenderer.t -= t * Math.PI / 8;
  }
  if (KB.keyDown(Keys.RIGHT)) {
    daRenderer.t += t * Math.PI / 8;
  }
  if (KB.keyDown(Keys.DOWN)) {
    daRenderer.zoom *= (1 - t);
  }
  if (KB.keyDown(Keys.UP)) {
    daRenderer.zoom *= (1 + t);
  }
}

var gameStruct = {
  'elem': gameElem,
  'tick': tickFn,
  'render': renderFn
};
Pidgine.run(gameStruct);
