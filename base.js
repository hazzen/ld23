EPSILON = 0.001;

UID = 1;
UID_PROP_NAME = '__uuid_field__';

function getUid(obj) {
  return obj[UID_PROP_NAME] || (obj[UID_PROP_NAME] = ++UID);
};

function makeSet() {
  var set = {};
  for (var i = 0; i < arguments.length; ++i) {
    set[arguments[i]] = true;
  }
  return set;
};

function randFlt(a, opt_b) {
  var low = 0;
  var high = a;
  if (opt_b != undefined) {
    low = a;
    high = opt_b;
  }
  return low + Math.random() * (high - low);
};

function randInt(a, opt_b) {
  var low = 0;
  var high = a;
  if (opt_b != undefined) {
    low = a;
    high = opt_b;
  }
  low = Math.ceil(low);
  high = Math.ceil(high);
  return low + Math.floor(Math.random() * (high - low));
};

function pick(arr) {
  return arr[randInt(arr.length)];
};

function sgn(n) {
  return n < 0 ? -1 : (n > 0 ? 1 : 0);
};

function max(arr, opt_cmp) {
  var l = arr.length;
  var b = arr[0];
  for (var i = 1; i < l; ++i) {
    if (opt_cmp) {
      if (opt_cmp(b, arr[i]) < 0) {
        b = arr[i];
      }
    } else if (arr[i] > b) {
      b = arr[i];
    }
  }
  return b;
}

function min(arr, opt_cmp) {
  var l = arr.length;
  var b = arr[0];
  for (var i = 1; i < l; ++i) {
    if (opt_cmp) {
      if (opt_cmp(b, arr[i]) > 0) {
        b = arr[i];
      }
    } else if (arr[i] < b) {
      b = arr[i];
    }
  }
  return b;
}

function bind(obj, method) {
  var args = Array.prototype.slice.call(arguments, 2);
  return function() {
    var foundArgs = Array.prototype.slice.call(arguments);
    return method.apply(obj, args.concat(foundArgs));
  };
};

// from: http://paulirish.com/2011/requestanimationrender-for-smart-animating/
var requestAnimFrame = (function(){
  return window.requestAnimationFrame
  || window.webkitRequestAnimationFrame
  || window.mozRequestAnimationFrame
  || window.oRequestAnimationFrame
  || window.msRequestAnimationFrame
  || function(callback, element){ window.setTimeout(callback, 1000 / 60); };
}());

function Rgb(r, g, b) {
  this.r = Math.round(r);
  this.g = Math.round(g);
  this.b = Math.round(b);
};

Rgb.fromCss = function(cssStr) {
  var r, g, b;
  if (cssStr.length == 7) {
    r = cssStr.substr(1, 2);
    g = cssStr.substr(3, 2);
    b = cssStr.substr(5, 2);
  } else if (cssStr.length == 4) {
    r = cssStr.charAt(1);
    g = cssStr.charAt(2);
    b = cssStr.substr(3);
    r += r;
    g += g;
    b += b;
  }
  return new Rgb(parseInt(r, 16), parseInt(g, 16), parseInt(b, 16));
};

Rgb.prototype.toCssString = function() {
  if (!this.css_) {
    var as16 = function(n) {
      var s = n.toString(16);
      while (s.length < 2) {
        s = '0' + s;
      }
      if (s.length > 2) {
        s = s.substr(0, 2);
      }
      return s;
    };
    this.css_ = '#' + as16(this.r) + as16(this.g) + as16(this.b);
  }
  return this.css_;
};

Rgb.prototype.toRgbString = function() {
  if (!this.rgb_) {
   this.rgb_ = 'rgb(' + this.r + ',' +
                        this.g + ',' +
                        this.b + ')';
  }
  return this.rgb_;
};

Rgb.prototype.toHsl = function() {
  var r = this.r / 255;
  var g = this.g / 255;
  var b = this.b / 255;
  var M = max([r, g, b]);
  var m = min([r, g, b]);
  var c = M - m;
  var h;
  if (M == m) {
    h = 0;
  } else if (M == r) {
    h = ((g - b) / c) % 6;
  } else if (M == g) {
    h = (b - r) / c + 2;
  } else {
    h = (r - g) / c + 4;
  }
  h = h / 6;
  var l = (M + m) / 2;
  var s = c == 0 ? c : (c / (1 - Math.abs(2 * l - 1)));
  return new Hsl(h, s, l);
};

Hsl = function(h, s, l) {
  this.h = h;
  this.s = s;
  this.l = l;
}

Hsl.prototype.toRgb = function() {
  var chroma = (1 - Math.abs(2 * this.l - 1)) * this.s;
  if (this.h < 0 || this.h >= 1) {
    return new Rgb(0, 0, 0);
  }
  var h = this.h * 6;
  var x = chroma * (1 - Math.abs(h % 2 - 1));
  var rgb;
  switch (Math.floor(h)) {
    case 0: rgb = [chroma, x, 0]; break;
    case 1: rgb = [x, chroma, 0]; break;
    case 2: rgb = [0, chroma, x]; break;
    case 3: rgb = [0, x, chroma]; break;
    case 4: rgb = [x, 0, chroma]; break;
    case 5: rgb = [chroma, 0, x]; break;
  }
  var m = this.l - 0.5 * chroma;
  return new Rgb(255 * (rgb[0] + m), 255 * (rgb[1] + m), 255 * (rgb[2]+ m));
};

Keys = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40
};

// +----------------------------------------------------------------------------
// | Geom
var geom = geom || {};

// +----------------------------------------------------------------------------
// | Point
geom.Point = function(x, y) {
  this.x = x;
  this.y = y;
};

geom.Point.prototype.plus = function(o) {
  return new Point(this.x + o.x, this.y + o.y);
};

geom.Point.prototype.minus = function(o) {
  return new Point(this.x - o.x, this.y - o.y);
};

geom.Point.prototype.times = function(v) {
  return new Point(this.x * v, this.y * v);
};

geom.Point.prototype.dot = function(o) {
  return this.x * o.x + this.y * o.y;
};

// +----------------------------------------------------------------------------
// | Range
geom.Range = function(v1, v2) {
  this.lo = v1;
  this.hi = v2;
};

geom.Range.copyOrNew = function(lo, hi, opt_range) {
  var range = opt_range || new geom.Range(lo, hi);
  range.lo = lo;
  range.hi = hi;
  return range;
};

geom.Range.prototype.overlaps = function(other) {
  return !(this.lo > other.hi || other.lo > this.hi);
};

// Returns   null   if they never collide.
// Returns [t1, t2] if they start colliding at t1 and end colliding at t2.
geom.Range.collides = function(r1, v1, r2, v2, opt_range) {
  if (v1 == v2) {
    return null;
  }
  var t1 = (r2.hi - r1.lo) / (v1 - v2);
  var t2 = (r1.hi - r2.lo) / (v2 - v1);
  return geom.Range.copyOrNew(Math.min(t1, t2), Math.max(t1, t2), opt_range);
};

// +----------------------------------------------------------------------------
// | AABB
geom.AABB = function(x, y, w, h) {
  this.p1 = new geom.Point(x, y);
  this.p2 = new geom.Point(x + w, y + h);
};

geom.AABB.prototype.addXY = function(x, y) {
  this.p1.x += x;
  this.p2.x += x;
  this.p1.y += y;
  this.p2.y += y;
};

geom.AABB.prototype.xRange = function(opt_range) {
  return geom.Range.copyOrNew(this.p1.x, this.p2.x, opt_range);
};

geom.AABB.prototype.yRange = function(opt_range) {
  return geom.Range.copyOrNew(this.p1.y, this.p2.y, opt_range);
};

geom.AABB.prototype.clone = function() {
  return new geom.AABB(this.p1.x, this.p1.y,
                       this.p2.x - this.p1.x, this.p2.y - this.p1.y);
};

geom.AABB.prototype.contains = function(pointOrX, opt_y) {
  var x, y;
  if (opt_y == undefined) {
    x = pointOrX.x;
    y = pointOrX.y;
  } else {
    x = pointOrX;
    y = opt_y;
  }
  return (this.p1.x <= x && this.p1.y <= y &&
          this.p2.x >= x && this.p2.y >= y);
};

geom.AABB.prototype.overlaps = function(aabb) {
  return !(this.p1.x > aabb.p2.x || this.p2.x < aabb.p1.x ||
           this.p1.y > aabb.p2.y || this.p2.y < aabb.p1.y);
};

geom.AABB.prototype.toString = function() {
  return '[(' + this.p1.x + ', ' + this.p1.y + ') --> (' +
                this.p2.x + ', ' + this.p2.y + ')]';
};
