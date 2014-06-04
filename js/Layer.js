Layer = (function() {
  function Layer(options) {
    this.id = '';
    this.context = null;
    this.updated = false;
    this.sprites = [];

    this.init(options);
  }

  Layer.prototype = {
    init: function init(options) {
      fillWith(this, options);

      console.log('[Layer] init', this);
    },

    addSprite: function addSprite(sprite) {
      console.log('[Layer] addSprite', this, sprite);

      this.sprites.push(sprite);
      sprite.layer = this;

      this.updated = true;

      this.trigger('addSprite', this, sprite);
    },

    removeSprite: function removeSprite(spriteToRemove) {
      console.log('[Layer] removeSprite', this, spriteToRemove);

      var spriteId = spriteToRemove.id || spriteToRemove;

      for (var i = 0, sprite; sprite = this.sprites[i++];) {
        if (sprite.id === spriteId) {
          this.sprites.splice(i - 1, 1);
          sprite.layer = null;
          break;
        }
      }

      this.updated = true;

      this.trigger('removeSprite', this, spriteToRemove);
    },

    clear: function clear() {
      for (var i = 0, sprite; sprite = this.sprites[i++];) {
        this.trigger('removeSprite', this, sprite);
      }

      this.sprites = [];
    },

    getSpriteById: function getSpriteById(id) {
      for (var i = 0, sprite; sprite = this.sprites[i++];) {
        if (sprite.id === id) {
          return sprite;
        }
      }
    },

    update: function update(dt) {
      var sprites = this.sprites,
          updated = this.updated;

      for (var i = 0, sprite; sprite = sprites[i++];) {
        updated = sprite.update(dt) || updated;
      }

      this.updated = updated;
    },

    draw: function draw(dt) {
      if (!this.updated) {
        return false;
      }

      var sprites = this.sprites,
          context = this.context;

      context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height)

      for (var i = 0, sprite; sprite = sprites[i++];) {
        sprite.draw(context, dt);
      }

      this.updated = false;

      return true;
    },

    createCanvas: function createCanvas(width, height) {
      var elCanvas;

      if (this.context) {
        elCanvas = this.context.canvas;
      } else {
        elCanvas = document.createElement('canvas');

        this.context = elCanvas.getContext('2d');
      }

      elCanvas.id = this.id;
      elCanvas.width = width;
      elCanvas.height = height;
      elCanvas.style.cssText += ';margin: ' + -height/2 + 'px 0px 0px ' + -width/2 + 'px;'
    }
  }

  utils.addEventsSupport(Layer);

  return Layer;
}());