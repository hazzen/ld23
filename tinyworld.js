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
  this.zoom = 50;
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

  this.context_.fillStyle = 'rgb(255, 0, 0)';
  this.context_.fillRect(-1, -1, 2, 2);

  cb(this);

  this.context_.restore();
};

function Point(x, y) {
  this.x = x;
  this.y = y;
};

function clampLat(lat) {
  lat = clampLng(lat);
  /*
  if (Math.abs(lat) > Math.PI / 2) {
    lat = sgn(lat) * Math.PI;
  }
  */
  return lat;
}

function clampLng(lng) {
  if (lng < 0) {
    lng = 2 * Math.PI - lng;
  }
  lng = lng % (2 * Math.PI);
  if (lng > Math.PI) {
    lng = -2 * Math.PI + lng;
  }
  return lng;
}

function GlobePoint(lat, lng) {
  this.lat = clampLat(lat);
  this.lng = clampLng(lng);
}

GlobePoint.prototype.offset = function(latOff, lngOff) {
  return new GlobePoint(this.lat + latOff, this.lng + lngOff);
};

GlobePoint.prototype.project = function(latOff, lngOff) {
  var x = Math.sin(lngOff + this.lng);
  var y = Math.sin(latOff + this.lat);
  return new Point(x, y);
};

GlobePoint.prototype.onFront = function() {
  var latOnFront = this.lat >= -Math.PI / 2 && this.lat <= Math.PI / 2;
  var lngOnFront = this.lng >= -Math.PI / 2 && this.lng <= Math.PI / 2;
  return (latOnFront == lngOnFront);
};

function GlobePoly(points, color) {
  this.points = points;
  this.color = color;
  this.calculateMid();
};

GlobePoly.prototype.calculateMid = function() {
  var cmpLat = function(p1, p2) { return p1.lat - p2.lat; };
  var cmpLng = function(p1, p2) { return p1.lng - p2.lng; };
  var latMin = min(this.points, cmpLat);
  var latMax = max(this.points, cmpLat);
  var lngMin = min(this.points, cmpLng);
  var lngMax = max(this.points, cmpLng);

  this.minPoint = new GlobePoint(latMin.lat, lngMin.lng);
  this.maxPoint = new GlobePoint(latMax.lat, lngMax.lng);
};

GlobePoly.prototype.render = function(renderer) {
  var latOff = renderer.latOff;
  var lngOff = renderer.lngOff;
  var ctx = renderer.context();

  ctx.fillStyle = this.color;
  ctx.strokeColor = 'rgb(0, 0, 0)';

  ctx.beginPath();
  var projPoint = this.points[0].project(latOff, lngOff);
  ctx.moveTo(projPoint.x, projPoint.y);
  for (var i = 1; i < this.points.length; ++i) {
    var projPoint = this.points[i].project(latOff, lngOff);
    ctx.lineTo(projPoint.x, projPoint.y);
  }
  ctx.fill();
};

var gameElem = document.getElementById('game');
var daRenderer = new Renderer(gameElem, 640, 480);

var polys = [];
polys.push(new GlobePoly([
               new GlobePoint(0, 0),
               new GlobePoint(Math.PI / 4, 0),
               new GlobePoint(Math.PI / 8, Math.PI / 8)
           ], 'rgb(128, 0, 0)'));
/*
polys.push(new GlobePoly([
               new GlobePoint(3 * Math.PI / 2, 0),
               new GlobePoint(Math.PI / 4, 0),
               new GlobePoint(Math.PI / 8, Math.PI / 8)
           ], 'rgb(256, 256, 0)'));
*/

function renderFn() {
  daRenderer.render(function(renderer) {
    var latOff = renderer.latOff;
    var lngOff = renderer.lngOff;
    for (var i = 0; i < polys.length; ++i) {
      var polyMin = polys[i].minPoint.offset(latOff, lngOff);
      var polyMax = polys[i].maxPoint.offset(latOff, lngOff);
      if (polyMin.onFront() || polyMax.onFront()) {
        polys[i].render(renderer);
      }
    }
  });
}

function tickFn(t) {
  if (KB.keyDown(Keys.LEFT)) {
    daRenderer.lngOff -= t * Math.PI / 4;
  }
  if (KB.keyDown(Keys.RIGHT)) {
    daRenderer.lngOff += t * Math.PI / 4;
  }
  if (KB.keyDown(Keys.UP)) {
    daRenderer.latOff -= t * Math.PI / 4;
  }
  if (KB.keyDown(Keys.DOWN)) {
    daRenderer.latOff += t * Math.PI / 4;
  }
}

var gameStruct = {
  'elem': gameElem,
  'tick': tickFn,
  'render': renderFn
};
Pidgine.run(gameStruct);
