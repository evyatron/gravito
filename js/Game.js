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
    this.collisionables = [];

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
      layer.addEventListener('removeSprite', this.onLayerSpriteRemove.bind(this));

      layer.createCanvas(this.width, this.height);

      this.layers.push(layer);

      this.el.appendChild(layer.context.canvas);
    },

    onLayerSpriteAdd: function onLayerSpriteAdd(layer, spriteAdded) {
      if (spriteAdded.collisionable) {
        this.collisionables.push(spriteAdded);

        if (spriteAdded.movable) {
          this.colliders.push(spriteAdded);
        }
      }
    },

    onLayerSpriteRemove: function onLayerSpriteRemove(layer, spriteRemoved) {
      if (spriteRemoved.collisionable) {
        for (var i = 0, sprite; sprite = this.collisionables[i++];) {
          if (sprite.id === spriteRemoved.id) {
            this.collisionables.splice(i - 1, 1);
            break;
          }
        }

        if (spriteRemoved.movable) {
          for (var i = 0, sprite; sprite = this.colliders[i++];) {
            if (sprite.id === spriteRemoved.id) {
              this.colliders.splice(i - 1, 1);
              break;
            }
          }
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
          collisionables = this.collisionables,

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

        if (sprite.id === 'movable_1') {
          Log.title('collisions');
        }

        for (j = 0; spriteWith = collisionables[j++];) {
          // don't compare sprite with itself
          if (sprite.id === spriteWith.id) {
            continue;
          }

          collision = sprite.collidesWith(spriteWith, dt);

          // no collision - don't resolve
          if (!collision) {
            continue;
          }

          // report collision to sprite - to propogate to event listeners etc.
          sprite.collide(spriteWith, collision);

          if (!spriteWith.solid) {
            continue;
          }

          if (gravity === collision) {
            sprite.resting = true;
          }

          var spriteToMove,
              headStuck = false;

          if (sprite.id === 'movable_1') {
            Log.add(collision + ' (' + spriteWith.id + ')');
          }


          if (collision === 'bottom') {
            sprite.set(null, spriteWith.topLeft.y - sprite.height);

            if (restOnBottom) {
              sprite.velocity.y = -sprite.velocity.y * Math.min((spriteWith.bounce.top + sprite.bounce.bottom)/2, 0.4);
            } else {
              if (spriteWith.movable) {
                spriteToMove = sprite.velocity[movementAxis] * gravityDirection[gravityAxis] < 0 && spriteWith;
              } else {
                restOnTop && (headStuck = true);
              }
            }
          } else if (collision === 'top') {
            sprite.set(null, spriteWith.bottomLeft.y);

            if (restOnTop) {
              sprite.velocity.y = -sprite.velocity.y * (spriteWith.bounce.bottom + sprite.bounce.top)/2;
            } else {
              if (spriteWith.movable) {
                spriteToMove = sprite.velocity[movementAxis] * gravityDirection[gravityAxis] > 0 && spriteWith;
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
                spriteToMove = sprite.velocity[movementAxis] * gravityDirection[gravityAxis] < 0 && spriteWith;
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
                spriteToMove = sprite.velocity[movementAxis] * gravityDirection[gravityAxis] > 0 && spriteWith;
              } else {
                restOnLeft && (headStuck = true);
              }
            }
          }

          if (headStuck) {
            // when jumping up and banging head - send back down
            sprite.velocity[gravityAxis] *= -0.1;

            if (Math.abs(sprite.velocity[gravityAxis]) < Math.abs(GRAVITY[gravityAxis] * dt)) {
              sprite.velocity[gravityAxis] = GRAVITY[gravityAxis] * dt;
            }
          }

          // apply friction and limit bounce
          if (sprite.resting) {
            // only apply friction with the sprite resting-on
            if (gravity === collision) {
              sprite.velocity[movementAxis] -= sprite.velocity[movementAxis] * spriteWith.friction[movementAxis];
            }

            if (Math.abs(sprite.velocity[gravityAxis]) <= Math.abs(GRAVITY[gravityAxis] * dt)) {
              sprite.velocity[gravityAxis] = 0;
            }
          }

          // if need to move the sprite collided with
          if (spriteToMove && !spriteToMove.isPlayer) {
            spriteToMove.velocity[movementAxis] = sprite.velocity[movementAxis];

            // TODO continue applying moved objects' frictions
            //if (spriteToMove.resting) {
            //  sprite.velocity[movementAxis] -= sprite.velocity[movementAxis] * spriteToMove.friction[movementAxis];
            //}
          }
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