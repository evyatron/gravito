utils = (function() {
  window.Log = {
    el: document.getElementById('log'),
    message: [],

    clear: function() {
      this.message = [];
      this.draw();
    },

    add: function add() {
      var label = arguments.length > 1? arguments[0] : '',
          message = (arguments.length > 1? arguments[1] : arguments[0]);

      this.message.push('<div>' +
                          (label? '<label>' + label + '</label>' : '') +
                          (message !== undefined? '<span>' + message + '</span>' : '') +
                        '</div>');
    },

    title: function title(s) {
      this.separator();
      this.add(s.toUpperCase());
      this.separator();
    },

    separator: function separator() {
      this.message.push('<hr />');
    },

    draw: function draw() {
      this.el.innerHTML = this.message.join('');
    }
  };

  String.prototype.format = function format(args) {
    return this.replace(/{{([^\}]+)}}/g, function match(original, k) {
      var value = args,
          properties = k = k.split('.');

      for (var i = 0, property; property = properties[i++];) {
        value = value && value[property];
      }

      return value === undefined? '' : value;
    });
  };

  return {
    random: function random(min, max) {
      return (Math.random() * (max - min)) + min;
    },

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

    rectIntersect: function rectIntersect(r1, r2) {
      return !(r2.x > r1.x + r1.width || 
               r2.x + r2.width < r1.x || 
               r2.y > r1.bottom + r1.height ||
               r2.y + r2.height < r1.y);
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
    },

    l10n: {
      translations: {},

      DEFAULT_LANGUAGE: 'en',

      init: function init(options) {
        !options && (options = {});

        this.load(options.language, options.onReady);
      },

      get: function get(key, args) {
        return (this.translations[key] || '').format(args);
      },

      load: function load(language, callback) {
        !language && (language = this.DEFAULT_LANGUAGE);

        var self = this,
            request = new XMLHttpRequest();

        request.open('GET', 'data/localization/' + language.toLowerCase() + '.json');
        request.onload = function(data) {
          if (request.response) {
            self.translations = request.response;
            callback && callback(language);
          } else if (language !== self.DEFAULT_LANGUAGE) {
            self.load(self.DEFAULT_LANGUAGE, callback);
          }
        };
        request.responseType = 'json';
        request.send();
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
    to[k] = defaults[k];
  }

  for (var k in from) {
    if (to.hasOwnProperty(k)) {
      to[k] = from[k];
    }
  }
}