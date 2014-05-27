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

      this.updated = true;

      this.trigger('addSprite', this, sprite);
    },

    removeSprite: function removeSprite(spriteToRemove) {
      console.log('[Layer] removeSprite', this, spriteToRemove);

      for (var i = 0, sprite; sprite = this.sprites[i++];) {
        if (sprite.id === spriteToRemove.id) {
          this.sprites.splice(i - 1, 1);
          break;
        }
      }

      this.updated = true;

      this.trigger('removeSprite', this, spriteToRemove);
    },

    update: function update(dt) {
      var sprites = this.sprites,
          updated = this.updated;

      for (var i = 0, sprite; sprite = sprites[i++];) {
        updated = sprite.movable && sprite.update(dt) || updated;
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
      var elCanvas = document.createElement('canvas');

      elCanvas.width = width;
      elCanvas.height = height;

      this.context = elCanvas.getContext('2d');
    }
  }

  utils.addEventsSupport(Layer);

  return Layer;
}());