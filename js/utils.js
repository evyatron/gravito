utils = (function() {
  return {
    addEventsSupport: function addEventsSupport(obj) {
      var proto = obj.prototype || obj;
      
      proto.addEventListener = function addEventListener(eventName, callback) {
        var listeners = this._listeners || {};

        if (!listeners[eventName]) {
          listeners[eventName] = [];
        }
        listeners[eventName].push(callback);

        this._listeners = listeners;
      };

      proto.removeEventListener = function removeEventListener(eventName, callback) {
        var listeners = (this._listeners || {})[eventName];
        if (!listeners) {
          return;
        }

        for (var i = 0, cb; cb = listeners[i++];) {
          if (cb === callback) {
            i--;
            listeners.splice(i, 1);
          }
        }
      };

      proto.trigger = function trigger() {
        var args = Array.prototype.slice.call(arguments),
            eventName = args.shift(),
            listeners = (this._listeners || {})[eventName] || [];

        for (var i = 0, callback; callback = listeners[i++];) {
          callback.apply(this, args);
        }
      };
    },

    Storage: {
      get: function get(key, callback) {
        var value = localStorage[key];
        if (value) {
          try {
            value = JSON.parse(value);
          } catch(ex) {}
        }

        callback && callback(value && value.value || value);
      },

      set: function set(key, value, callback) {
        value = {
          'value': value
        };

        localStorage[key] = JSON.stringify(value);
        callback && callback();
      }
    }
  };
}());

Vector = (function() {
  var TO_RAD = (180 / Math.PI),
      TO_DEG = (Math.PI / 180);

  function Vector(x, y) {
    this.x = x;
    this.y = y;
  }

  Vector.prototype = {
    add: function add(vector) {
      return new Vector(this.x + vector.x, this.y + vector.y);
    },

    substract: function substract(vector) {
      return new Vector(this.x - vector.x, this.y - vector.y);
    },

    multiply: function multiply(vector) {
      return new Vector(this.x * vector.x, this.y * vector.y);
    },

    divide: function divide(vector) {
      return new Vector(this.x / vector.x, this.y / vector.y);
    },

    scale: function scale(by) {
      return new Vector(this.x * by, this.y * by);
    },

    dot: function dot(vector) {
      return new Vector(this.x * vector.x + this.y * vector.y);
    },

    cross: function cross(vector) {
      return new Vector(this.x * vector.y - this.y * vector.x);
    },

    flip: function flip() {
      return new Vector(this.y, this.x);
    },

    angle: function angle() {
      var theta = Math.atan2(-this.y, this.x) * TO_RAD;
      return theta;
    },

    rotate: function rotate(angle) {
      var radians = TO_DEG * angle,
          cos = Math.cos(radians),
          sin = Math.sin(radians),
          nx = (cos * this.x) - (sin * this.y),
          ny = (sin * this.x) + (cos * this.y);

      return new Vector(nx, ny);
    }
  };

  Vector.BLANK = new Vector(0, 0);

  return Vector;
}());



function fillWith(to, from, defaults) {
  for (var k in defaults) {
    if (!from.hasOwnProperty(k)) {
      to[k] = from[k];
    }
  }

  for (var k in from) {
    if (to.hasOwnProperty(k)) {
      to[k] = from[k];
    }
  }
}