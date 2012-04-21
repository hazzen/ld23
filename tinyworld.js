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

function Point(x, y) {
  this.x = x;
  this.y = y;
};

function clampLat(lat) {
  lat = clampLng(lat);
  return lat;
}

function clampLng(lng) {
  //lng = lng % (2 * Math.PI);
  /*
  if (Math.abs(lng) > Math.PI) {
    lng = -Math.PI - (Math.PI - lng);
  }
  */
  return lng;
}

function GlobePoint(lat, lng, r) {
  //window.console.log('Making new from ' + lat + ', ' + lng);
  this.lat = clampLat(lat);
  this.lng = clampLng(lng);
  //window.console.log('  clamped to    ' + this.lat + ', ' + this.lng);
  if (Math.abs(this.lat) > Math.PI / 2) {
    var pi = this.lat > 0 ? Math.PI / 2 : -Math.PI / 2;
    this.lat = pi - (this.lat - pi);
    var pi = this.lng > 0 ? Math.PI / 2 : -Math.PI / 2;
    this.lng = clampLng(pi - (this.lng - pi));
    //window.console.log('  flipped to    ' + this.lat + ', ' + this.lng);
  }
  this.r = r || 1;
}

GlobePoint.prototype.offset = function(latOff, lngOff) {
  return new GlobePoint(this.lat + latOff, this.lng + lngOff, this.r);
};

GlobePoint.prototype.toString = function() {
  return '{lat: ' + this.lat + ', lng: ' + this.lng + '}';
};

GlobePoint.prototype.project = function(latOff, lngOff) {
  var nlat = clampLat(latOff + this.lat);
  var nlng = clampLng(lngOff + this.lng);

  var x = Math.cos(nlng) * Math.abs(Math.sin(nlat)) * this.r;
  var y = Math.sin(nlng) * Math.sin(nlat) * this.r;
  var z = Math.cos(nlat) * this.r;
  var p = new Point(y, z);
  p.z = x;
  return p;
};

function GlobePoly(points, color) {
  this.points = points;
  this.color = color;
  this.calculateMid();
};

GlobePoly.prototype.calculateMid = function() {
  var cmpLat = function(p1, p2) {
    return (p1.lat + 2 * Math.PI) % (2 * Math.PI) - (p2.lat + 2 * Math.PI) % (2 * Math.PI);
  };
  var cmpLng = function(p1, p2) {
    return (p1.lng + 2 * Math.PI) % (2 * Math.PI) - (p2.lng + 2 * Math.PI) % (2 * Math.PI);
  };
  var latMin = min(this.points, cmpLat);
  var latMax = max(this.points, cmpLat);
  var lngMin = min(this.points, cmpLng);
  var lngMax = max(this.points, cmpLng);

  this.minPoint = new GlobePoint(latMin.lat, lngMin.lng);
  this.maxPoint = new GlobePoint(latMax.lat, lngMax.lng);
  this.midPoint = new GlobePoint((latMin.lat + latMax.lat) / 2,
                                 (lngMin.lng + lngMax.lng) / 2);
};

GlobePoly.prototype.render = function(renderer) {
  var latOff = renderer.latOff;
  var lngOff = renderer.lngOff;
  var ctx = renderer.context();
  ctx.fillStyle = this.color.toRgbString();

  var center = this.midPoint.project(latOff, lngOff);
  var d2 = center.x * center.x + center.y * center.y;
  var newColorHsl = this.color.toHsl();
  newColorHsl.l *= 1 - (d2 / 2);
  ctx.fillStyle = newColorHsl.toRgb().toRgbString();

  ctx.strokeStlye = 'rgb(0,255,0)';
  ctx.lineWidth = 1 / 200;

  for (var mode = 0; mode < 2; ++mode) {
    ctx.beginPath();
    var projPoint = this.points[0].project(latOff, lngOff);
    ctx.moveTo(projPoint.x, projPoint.y);
    for (var i = 1; i < this.points.length; ++i) {
      var projPoint = this.points[i].project(latOff, lngOff);
      ctx.lineTo(projPoint.x, projPoint.y);
    }
    if (mode) {
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.fill();
    }
  }
};

var gameElem = document.getElementById('game');
var daRenderer = new Renderer(gameElem, 640, 480);

var polys = [];
polys.push(new GlobePoly([
               new GlobePoint(0, 0),
               new GlobePoint(Math.PI / 4, 0),
               new GlobePoint(Math.PI / 8, Math.PI / 8)
           ],  new Rgb(128, 0, 0)));
polys.push(new GlobePoly([
               new GlobePoint(0, 0),
               new GlobePoint(Math.PI / 4, 0),
               new GlobePoint(Math.PI / 8, -Math.PI / 8)
           ],  new Rgb(0, 128, 0)));
function makeGlobe() {
  var POINTS = 45;
  var STEPS = 10;
  var lats = [];
  for (var step = 0; step < STEPS; ++step) {
    var stepf = step / STEPS;
    var points = [];
    for (var i = 0; i < POINTS; ++i) {
      points.push({lng: 2 * Math.PI * (1 - i / POINTS),
                   r: 1 + randFlt(-0.1, 0.1)});
    }
    lats.push(points);
  }
  var polys = [];
  for (var MULT = -1; MULT < 1; MULT += 2) {
  for (var i = 0; i < lats.length - 1; ++i) {
    var alngs = lats[i];
    var blngs = lats[i + 1];
    var alat = MULT * Math.PI / 2 * i / STEPS;
    var blat = MULT * Math.PI / 2 * (i + 1) / STEPS;
    if (alngs.length == blngs.length) {
      for (var j = 0; j < alngs.length; ++j) {
        //if (j != 22 && j != 23) continue;
        var a1 = j;
        var a2 = (j + 1) % alngs.length;
        var b1 = a1;
        var b2 = a2;
        polys.push(new GlobePoly(
            [
             new GlobePoint(alat, alngs[a1].lng, alngs[a1].r),
             new GlobePoint(alat, alngs[a2].lng, alngs[a2].r),
             new GlobePoint(blat, blngs[b2].lng, blngs[b2].r),
             new GlobePoint(blat, blngs[b1].lng, blngs[b1].r)
            ],
            j == 22 ? new Rgb(255, 0, 0) : (j == 23 ? new Rgb(0, 0, 255) :
            new Rgb(255 * j / alngs.length, 255, 0))));
        /*
        window.console.log('A POINt');
        window.console.log(alat);
        window.console.log(alngs[a1].lng);
        window.console.log(alngs[a2].lng);
        window.console.log(polys[polys.length - 1].points[0].lng);
        window.console.log(polys[polys.length - 1].points[1].lng);
        */
      }
    } else {
      throw Error('Bad lens; ' + alngs.length + ' vs ' + blngs.length);
    }
    }
  }
  return polys;
};
polys = makeGlobe();
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
    var sides = [];
    var front = [];
    for (var i = 0; i < polys.length; ++i) {
      var polyMin = polys[i].minPoint.project(latOff, lngOff);
      var polyMax = polys[i].maxPoint.project(latOff, lngOff);
      var polyMid = polys[i].midPoint.project(latOff, lngOff);
      var minOnFront = polyMin.z > 0;
      var maxOnFront = polyMax.z > 0;
      if (KB.keyPressed('z')) {
        window.console.log(polys[i].minPoint.offset(latOff, lngOff).toString());
        window.console.log(polys[i].maxPoint.offset(latOff, lngOff).toString());
        window.console.log(polys[i].midPoint.offset(latOff, lngOff).toString());
        window.console.log(polyMin.z + ' , ' + polyMax.z + ' --> ' + polyMid.z);
      }
      if (false && minOnFront && maxOnFront) {
        front.push(i);
      } else if (true || minOnFront != maxOnFront) {
        sides.push(i);
      }
    }
    if (sides.length) {
      var sortSides = [];
      if (KB.keyPressed('z')) {
        window.console.log('zzzzz');
      }
      for (var i = 0; i < sides.length; ++i) {
        var poly = polys[sides[i]];
        var polyMid = poly.midPoint.project(latOff, lngOff);
        if (KB.keyPressed('z')) {
          window.console.log(polyMid.z);
        }
        sortSides.push({'poly': poly, 'z': polyMid.z});
      }
      sortSides.sort(function(a, b) { return b['z'] - a['z']; });
      for (var i = 0; i < sortSides.length; ++i) {
        sortSides[i]['poly'].render(renderer);
      }
    }
    for (var i = 0; i < front.length; ++i) {
      polys[front[i]].render(renderer);
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
