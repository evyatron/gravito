Sprite = (function() {
  function Sprite(options) {
    this.id = '';
    this.type = '';
    this.width = 0;
    this.height = 0;
    this.mass = 1;

    this.isPlayer = false;

    this.bounce = {};

    this.position = new Vector(0, 0);


    this.resting = false;
    this.movable = false;
    this.solid = false;
    this.gravity = false;
    this.collisionable = false;

    this.maxVelocity = null;

    this.friction = new Vector(0.5, 0);
    this.velocity = new Vector(0, 0);
    this.acceleration = new Vector(0, 0);
    this.drag = new Vector(0.5, 0.5);

    this.background = '';

    this.hasCollisionCallbacks = false;
    this.previousCollisions = {};
    this.collisions = {};
    this.collisionCallbacks = {};

    this.drawMethod = null;

    this.init(options);
  }

  Sprite.prototype = {
    init: function init(options) {
      fillWith(this, options);

      if (!this.id) {
        this.id = 'Sprite_' + Date.now() + '_' + Math.round(Math.random() * 1000);
      }

      if (typeof this.bounce === 'number') {
        this.bounce = {
          'top': this.bounce,
          'bottom': this.bounce,
          'left': this.bounce,
          'right': this.bounce
        };
      }
      !this.bounce.hasOwnProperty('top') && (this.bounce.top = 0);
      !this.bounce.hasOwnProperty('bottom') && (this.bounce.bottom = 0);
      !this.bounce.hasOwnProperty('left') && (this.bounce.left = 0);
      !this.bounce.hasOwnProperty('right') && (this.bounce.right = 0);

      this.collisionable = this.collisionable || this.solid;

      this.topLeft = options.position || new Vector(options.x || 0, options.y || 0);
      this.topRight = new Vector(this.topLeft.x + this.width, this.topLeft.y);
      this.bottomRight = new Vector(this.topLeft.x + this.width, this.topLeft.y + this.height);
      this.bottomLeft = new Vector(this.topLeft.x, this.topLeft.y + this.height);

      this.halfWidth = this.width / 2;
      this.halfHeight = this.height / 2;

      console.log('[Sprite] init', this, options);
      this.trigger('init', this);
    },

    center: function center() {
      var tlX = this.topLeft.x,
          tlY = this.topLeft.y,
          brX = this.bottomRight.x,
          brY = this.bottomRight.y;

      return new Vector(tlX + (brX - tlX)/2, tlY + (brY - tlY)/2);
    },

    onCollision: function onCollisionWith(callback, callbackEnd) {
      this.onCollisionWith(null, callback, callbackEnd);
    },

    onCollisionWith: function onCollisionWith(spriteWith, callback, callbackEnd) {
      var spriteWithId = spriteWith && (spriteWith.id || spriteWith) || '';

      if (!this.collisionCallbacks[spriteWithId]) {
        this.collisionCallbacks[spriteWithId] = [];
      }

      this.collisionCallbacks[spriteWithId].push({
        'start': callback,
        'end': callbackEnd
      });

      this.hasCollisionCallbacks = true;
    },

    collide: function collide(spriteWith, direction) {
      this.collisions[spriteWith.id] = {
        'sprite': spriteWith,
        'direction': direction
      };
    },

    move: function move(vector) {
      var x = vector.x,
          y = vector.y;

      this.topLeft.x += x;
      this.topLeft.y += y;
      this.topRight.x += x;
      this.topRight.y += y;
      this.bottomRight.x += x;
      this.bottomRight.y += y;
      this.bottomLeft.x += x;
      this.bottomLeft.y += y;

      return this;
    },

    set: function set(x, y) {
      if (x !== null) {
        this.topLeft.x = x;
        this.topRight.x = x + this.width;
        this.bottomRight.x = x + this.width;
        this.bottomLeft.x = x;
      }
      if (y !== null) {
        this.topLeft.y = y;
        this.topRight.y = y;
        this.bottomRight.y = y + this.height;
        this.bottomLeft.y = y + this.height;
      }

      return this;
    },

    applyForce: function applyForce(vector) {
      if (vector.y * window.GRAVITY_DIRECTION.y ||
          vector.x * window.GRAVITY_DIRECTION.x) {
        this.resting = false;
      }

      // Handle NaNs or Nulls etc.
      !vector.x && (vector.x = 0);
      !vector.y && (vector.y = 0);

      this.velocity = this.velocity.add(vector);

      console.log('[Sprite] applyForce:', vector);
    },

    accelerate: function accelerate(vector) {
      if (vector) {
        // Handle NaNs or Nulls etc.
        !vector.x && (vector.x = 0);
        !vector.y && (vector.y = 0);

        this.acceleration = this.acceleration.add(vector);
      } else {
        this.acceleration = new Vector(0, 0);
      }
      
      //console.log('[Sprite] accelerate:', vector);
    },

    update: function update(dt) {
      if (!this.movable) {
        return;
      }

      if (this.hasCollisionCallbacks) {
        this.triggerCollisionCallbacks();
      }

      var gravityDirection = window.GRAVITY_DIRECTION,
          gravityX = Math.abs(gravityDirection.x),
          gravityY = Math.abs(gravityDirection.y);


      (!this.velocity.x) && (this.velocity.x = 0);
      (!this.velocity.y) && (this.velocity.y = 0);
      (!this.acceleration.x) && (this.acceleration.x = 0);
      (!this.acceleration.y) && (this.acceleration.y = 0);

      if (this.id === 'player') {
        Log.add('this.resting', this.resting);

        Log.title('before')
        Log.add('acceleration.x', this.acceleration.x);
        Log.add('acceleration.y', this.acceleration.y);
        Log.add('velocity.x', this.velocity.x);
        Log.add('velocity.y', this.velocity.y);
      }

      // first move according to previous calculations
      var dr = this.velocity.scale(dt); //.add(this.acceleration.scale(0.5 * dt * dt));
      this.move(dr.scale(100));


      var force = this.velocity.scale(-1);

      if (this.gravity && !this.resting) {
        force = force.add(window.GRAVITY);
      }

      var newAcceleration = force.scale(this.mass),
          dv = this.acceleration.add(newAcceleration).scale(0.5 * dt),
          newVelocity = this.velocity.add(dv);


      if (this.maxVelocity) {
        var maxVelocity = this.maxVelocity,
            maxVelocityX = gravityY * maxVelocity.x + gravityX * maxVelocity.y,
            maxVelocityY = gravityY * maxVelocity.y + gravityX * maxVelocity.x;

        newVelocity.x = Math.max(Math.min(newVelocity.x, maxVelocityX), -maxVelocityX);
        newVelocity.y = Math.max(Math.min(newVelocity.y, maxVelocityY), -maxVelocityY);
      }

      // drag while in the air
      // TODO should probably be dynamic per Sprite
      if (!this.resting) {
        newVelocity.x -= (newVelocity.x * 0.5 * gravityY);
        newVelocity.y -= (newVelocity.y * 0.5 * gravityX);
      }

      // nice rounding to .XX to avoid infinitely small numbers
      newVelocity.x = Math.round(newVelocity.x * 100) / 100;
      newVelocity.y = Math.round(newVelocity.y * 100) / 100;

      // set new velocity after all calculations
      this.velocity = newVelocity;



      if (this.id === 'player') {
        Log.title('after');
        Log.add('acceleration.x', this.acceleration.x);
        Log.add('acceleration.y', this.acceleration.y);
        Log.add('velocity.x', this.velocity.x);
        Log.add('velocity.y', this.velocity.y);
      }

      return true;
    },

    draw: function draw(context) {
      if (this.drawMethod) {
        this.drawMethod.call(this, context);
        return;
      }

      var pos = this.topLeft;

      context.fillStyle = this.background;
      context.fillRect(Math.round(pos.x), Math.round(pos.y), this.width, this.height);
    },

    triggerCollisionCallbacks: function triggerCollisionCallbacks() {
      var currentCollisions = this.previousCollisions,
          newCollisions = this.collisions,
          collisionCallbacks = this.collisionCallbacks,
          defaultCollisionCallbacks = collisionCallbacks[''] || [],
          spriteWithId,
          collisionData;

      for (spriteWithId in currentCollisions) {
        if (newCollisions[spriteWithId]) {
          continue;
        }

        collisionData = currentCollisions[spriteWithId];

        var callbacks = defaultCollisionCallbacks.concat(collisionCallbacks[spriteWithId]);
        if (callbacks) {
          for (var i = 0, callback; callback = callbacks[i++];) {
            callback.end && callback.end(collisionData.sprite, collisionData.direction);
          }
        }

        delete currentCollisions[spriteWithId];
      }

      for (spriteWithId in newCollisions) {
        if (currentCollisions[spriteWithId]) {
          continue;
        }

        collisionData = newCollisions[spriteWithId];

        var callbacks = defaultCollisionCallbacks.concat(collisionCallbacks[spriteWithId]);
        if (callbacks) {
          for (var i = 0, callback; callback = callbacks[i++];) {
            callback.start && callback.start(collisionData.sprite, collisionData.direction);
          }
        }

        currentCollisions[spriteWithId] = newCollisions[spriteWithId];
      }

      this.collisions = {};
    },

    collidesWith: function collidesWith(sprite, dt) {
      // get the vectors to check against
      var vX = (this.topLeft.x + this.halfWidth) - (sprite.topLeft.x + sprite.halfWidth),
          vY = (this.topLeft.y + this.halfHeight) - (sprite.topLeft.y + sprite.halfHeight),
          // add the half widths and half heights of the objects
          hWidths = this.halfWidth + sprite.halfWidth,
          hHeights = this.halfHeight + sprite.halfHeight;

      // if the x and y vector are less than the half width or half height, they we must be inside the object, causing a collision
      if (Math.abs(vX) <= hWidths && Math.abs(vY) <= hHeights) {
        var oX = hWidths - Math.abs(vX),
            oY = hHeights - Math.abs(vY);

        if (oX >= oY) {
          if (vY > 0) {
            return 'top';
          } else {
            return 'bottom';
          }
        } else {
          if (vX > 0) {
            return 'left';
          } else {
            return 'right';
          }
        }
      }
      return null;
    }
  };

  utils.addEventsSupport(Sprite);

  return Sprite;
}());