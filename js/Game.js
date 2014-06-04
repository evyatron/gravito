Game = (function() {
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

    setSize: function setSize(width, height) {
      if (width === this.width && height === this.height) {
        return;
      }

      this.width = width;
      this.height = height;

      for (var i = 0, layer; layer = this.layers[i++];) {
        layer.createCanvas(width, height);
      }
    },

    setGravity: function setGravity(gravity) {
      window.GRAVITY = gravity;

      var gravityX = window.GRAVITY.x,
          gravityY = window.GRAVITY.y;

      gravityX = (gravityX / Math.abs(gravityX)) || 0;
      gravityY = (gravityY / Math.abs(gravityY)) || 0;

      window.GRAVITY_DIRECTION = new Vector(gravityX, gravityY);
      window.GRAVITY_DIRECTION_NAME = gravityX > 0? 'right' :
                                      gravityX < 0? 'left' :
                                      gravityY < 0? 'top' :
                                      gravityY > 0? 'bottom' :
                                      '';
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

    getSpriteById: function getSpriteById(id) {
      var sprite;

      for (var i = 0, layer; layer = this.layers[i++];) {
        sprite = layer.getSpriteById(id);
        if (sprite) {
          break;
        }
      }

      return sprite;
    },

    stop: function stop() {
      if (!this.running) {
        return false;
      }

      console.info('[Game] stop', this);

      this.running = false;

      return true;
    },

    start: function start() {
      if (this.running) {
        return false;
      }

      console.info('[Game] start', this);

      this.running = true;
      this.lastUpdate = Date.now();
      window.requestAnimationFrame(this._tick);

      return true;
    },

    tick: function tick() {
      if (!this.running) {
        return;
      }

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

          collisionOpposites = {
            'top': 'bottom',
            'bottom': 'top',
            'left': 'right',
            'right': 'left'
          },

          i = 0, layer, sprite, spriteWith, collision, appliedFriction;


      // limit tick interval to 60FPS
      // when a player minimizes the game, and reopens it after a few seconds,
      // the interval will read as few seconds - we don't want that
      // we want to continue "naturally"
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
        appliedFriction = false;

        if (sprite.id === 'player') {
          Log.title('collisions');
        }

        for (j = 0; spriteWith = collisionables[j++];) {
          // don't compare a sprite with itself
          if (sprite.id === spriteWith.id) {
            continue;
          }

          collision = sprite.collidesWith(spriteWith, dt);

          // no collision - don't resolve
          if (!collision) {
            continue;
          }

          // report collision to sprite - to propogate to event listeners etc.
          spriteWith.collide(sprite, collisionOpposites[collision]);
          sprite.collide(spriteWith, collision);

          if (!spriteWith.solid) {
            sprite.velocity = sprite.velocity.scale(spriteWith.density);
            continue;
          }

          if (gravity === collision) {
            sprite.resting = true;
          }

          var spriteToMove,
              headStuck = false;

          if (sprite.id === 'player') {
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
            sprite.velocity[gravityAxis] *= -0.5;

            if (Math.abs(sprite.velocity[gravityAxis]) < Math.abs(GRAVITY[gravityAxis] * dt)) {
              sprite.velocity[gravityAxis] = GRAVITY[gravityAxis] * dt;
            }
          }

          // apply friction and limit bounce
          if (sprite.resting) {
            // only apply friction with the sprite resting-on
            if (!appliedFriction && gravity === collision) {
              appliedFriction = true;
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