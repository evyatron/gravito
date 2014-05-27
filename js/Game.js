Game = (function() {

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


  var DEFAULT_GRAVITY = new Vector(0, 40);

  function Game(options) {
    this.el = null;

    this.width = 0;
    this.height = 0;

    this.layers = [];

    this.colliders = [];
    this.solids = [];

    this.running = false;
    this.lastUpdate = 0;
    this.previousDt = 0;

    this.onBeforeTick = null;
    this.onAfterTick = null;

    this.VELOCITY_THRESHOLD = 50;

    this.GRAVITY_AXIS = '';

    this.init(options);
  }

  Game.prototype = {
    init: function init(options) {
      fillWith(this, options);

      this._tick =  this.tick.bind(this);

      this.setGravity(options.gravity || DEFAULT_GRAVITY);

      console.log('[Game] init', this);
    },

    setGravity: function setGravity(gravity) {
      window.GRAVITY = gravity;

      var gravityX = window.GRAVITY.x,
          gravityY = window.GRAVITY.y;

      gravityX = gravityX > 0? 1 : gravityX < 0? -1 : 0;
      gravityY = gravityY > 0? 1 : gravityY < 0? -1 : 0;

      window.GRAVITY_DIRECTION = new Vector(gravityX, gravityY);
    },

    addLayer: function addLayer(layer) {
      console.log('[Game] addLayer', this, layer);

      layer.addEventListener('addSprite', this.onLayerSpriteAdd.bind(this));

      layer.createCanvas(this.width, this.height);

      this.layers.push(layer);

      this.el.appendChild(layer.context.canvas);
    },

    onLayerSpriteAdd: function onLayerSpriteAdd(layer, sprite) {
      if (sprite.solid) {
        this.solids.push(sprite);

        if (sprite.movable) {
          this.colliders.push(sprite);
        }
      }
    },

    start: function start() {
      if (this.running == true) {
        return false;
      }

      console.log('[Game] start', this);

      this.running = true;
      this.lastUpdate = Date.now();
      window.requestAnimationFrame(this._tick);

      return true;
    },

    tick: function tick() {
      var now = Date.now(),
          dt = (now - this.lastUpdate) / 1000,

          layers = this.layers,
          colliders = this.colliders,
          solids = this.solids,

          // make sure sprite is "resting" according to current gravity
          gravityDirection = window.GRAVITY_DIRECTION,
          gravityDirX = gravityDirection.x,
          gravityDirY = gravityDirection.y,

          restOnBottom = gravityDirY > 0,
          restOnTop = gravityDirY < 0,
          restOnRight = gravityDirX > 0,
          restOnLeft = gravityDirX < 0,

          gravity = restOnBottom? 'bottom' :
                    restOnTop? 'top' :
                    restOnRight? 'right' :
                    restOnLeft? 'left' : '',

          gravityAxis = gravityDirY? 'y' : 'x',
          movementAxis = gravityDirY? 'x' : 'y',

          i = 0, layer, sprite, spriteWith, collision;


      // limit tick interval to 60FPS
      dt = Math.min(dt, 0.06);

      Log.clear();
      Log.add('gravity', gravity);
      Log.separator();

      this.onBeforeTick && this.onBeforeTick(dt);

      // move all movables
      for (i = 0; layer = layers[i++];) {
        layer.update(dt);
      }

      // collisions
      for (i = 0; sprite = colliders[i++];) {
        sprite.resting = false;

        var sCollisions = [];

        for (j = 0; spriteWith = solids[j++];) {
          // don't compare sprite with itself
          if (sprite.id === spriteWith.id) {
            continue;
          }

          collision = sprite.collidesWith(spriteWith, dt);

          // no collision - don't resolve
          if (!collision) {
            continue;
          }

          if (gravity === collision) {
            sprite.resting = true;
          }

          var spriteToMove,
              headStuck = false;

          if (sprite.id === 'player') {
            sCollisions.push(collision + ' (' + spriteWith.id + ')');
          }


          if (collision === 'bottom') {
            sprite.set(null, spriteWith.topLeft.y - sprite.height);
            
            if (restOnBottom) {
              sprite.velocity.y = -sprite.velocity.y * Math.min((spriteWith.bounce.top + sprite.bounce.bottom)/2, 0.4);
            } else {
              if (spriteWith.movable) {
                
              } else {
                restOnTop && (headStuck = true);
              }
            }
          } else if (collision === 'top') {
            if (!spriteWith.movable) {
              sprite.set(null, spriteWith.bottomLeft.y);
            }

            if (restOnTop) {
              sprite.velocity.y = -sprite.velocity.y * (spriteWith.bounce.bottom + sprite.bounce.top)/2;
            } else {
              if (spriteWith.movable) {
                
              } else {
                restOnBottom && (headStuck = true);
              }
            }
          } else if (collision === 'left') {
            sprite.set(spriteWith.topRight.x, null);
            
            if (restOnLeft) {
              sprite.velocity.x = -sprite.velocity.x * (spriteWith.bounce.right + sprite.bounce.left)/2;
            } else {
              if (spriteWith.movable) {
                spriteToMove = spriteWith.movable && sprite.velocity.x < 0 && spriteWith;
              } else {
                restOnRight && (headStuck = true);
              }
            }
          } else if (collision === 'right') {
            sprite.set(spriteWith.topLeft.x - sprite.width, null);

            if (restOnRight) {
              sprite.velocity.x = -sprite.velocity.x * (spriteWith.bounce.left + sprite.bounce.right)/2;
            } else {
              if (spriteWith.movable) {
                spriteToMove = spriteWith.movable && sprite.velocity.x > 0 && spriteWith;
              } else {
                restOnLeft && (headStuck = true);
              }
            }
          }

          // report collision to sprite - to propogate to event listeners etc.
          sprite.collide(spriteWith, collision);

          if (headStuck) {
            // when jumping up and banging head - send back down
            sprite.velocity[gravityAxis] *= -0.1;

            if (Math.abs(sprite.velocity[gravityAxis]) < Math.abs(GRAVITY[gravityAxis] * dt)) {
              sprite.velocity[gravityAxis] = GRAVITY[gravityAxis] * dt;
            }
          }

          // apply friction and limit bounce
          if (sprite.resting) {
            sprite.velocity[movementAxis] -= sprite.velocity[movementAxis] * spriteWith.friction[movementAxis];

            if (Math.abs(sprite.velocity[gravityAxis]) <= Math.abs(GRAVITY[gravityAxis] * dt)) {
              sprite.velocity[gravityAxis] = 0;
            }
          }

          // if need to move the sprite collided with
          if (spriteToMove) {
            spriteToMove.velocity[movementAxis] = sprite.velocity[movementAxis];
            if (spriteToMove.resting) {
              sprite.velocity[movementAxis] -= sprite.velocity[movementAxis] * spriteToMove.friction[movementAxis];
            }
          }
        }

        if (sprite.id === 'player') {
          Log.separator();
          Log.add('collision', sCollisions.join(', '));
        }
      }

      // draw
      for (i = 0, layer; layer = layers[i++];) {
        layer.draw();
      }

      Log.draw();

      this.onAfterTick && this.onAfterTick(dt);

      this.lastUpdate = now;
      window.requestAnimationFrame(this._tick);
    }
  }

  return Game;
}());