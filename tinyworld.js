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
  this.latOff = 0;
  this.lngOff = 0;
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

  this.context_.fillStyle = 'rgb(0, 0, 0)';
  this.context_.fillRect(-1, -1, 2, 2);

  cb(this);

  this.context_.restore();
};

var gameElem = document.getElementById('game');
var daRenderer = new Renderer(gameElem, 640, 480);

function renderFn() {
  daRenderer.render(function(renderer) {
  });
}

function tickFn(t) {
}

var gameStruct = {
  'elem': gameElem,
  'tick': tickFn,
  'render': renderFn
};
Pidgine.run(gameStruct);
