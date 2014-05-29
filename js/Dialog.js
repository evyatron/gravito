Dialog = (function() {
  var DURATION_REGEX = /\{d:(\d+)\}/,
      METHOD_REGEX = /\{m:([^\}]+)\}/;

  function Dialog() {
    this.DEFAULT_DURATION;
    this.DISTANCE_FROM_SPRITE_X;
    this.DISTANCE_FROM_SPRITE_Y;
  }

  Dialog.prototype = {
    init: function init(options) {
      this.elContainer = options.elContainer;
      this.el = null;
      this.stickTo = null;
    },

    show: function show(options) {
      var self = this,
          texts = options.text,
          id = options.id,
          sprite = options.sprite,
          onMethod = options.onMethod || function(method, onDone){
            console.warn('Method handler (for "' + method + '") not implemented, setting timeout 500ms');
            window.setTimeout(onDone, 500);
          },
          onEnd = options.onEnd || function(){};

      !id && (id = text.replace(/[^a-zA-Z]/g, '').toLowerCase());

      if (document.getElementById('dialog-' + id)) {
        return;
      }

      if (Array.isArray(texts)) {
        texts = texts.slice(0);
      } else {
        texts = [texts];
      }

      function showText() {
        var text = texts.shift(),
            duration = this.DEFAULT_DURATION,
            durationFromText = (text || '').match(DURATION_REGEX),
            methodFromText = (text || '').match(METHOD_REGEX);

        if (text === undefined) {
          onEnd();
          return;
        }

        if (durationFromText) {
          duration = durationFromText[1] * 1;
          text = text.replace(durationFromText[0], '');
        }
        if (methodFromText) {
          text = text.replace(methodFromText[0], '');
          methodFromText = methodFromText[1];
        }

        if (text) {
          var elDialog = self.getElement(text);
          elDialog.id = 'dialog-' + id;
          self.elContainer.appendChild(elDialog);

          self.el = elDialog;

          if (sprite) {
            self.stickTo = sprite;
            self.stickToSprite();
          } else {
            elDialog.classList.add('global');
          }
        }

        if (methodFromText) {
          onMethod(methodFromText, nextStep);
        } else {
          window.setTimeout(nextStep, duration);
        }

        function nextStep() {
          self.el = null;
          elDialog && elDialog.parentNode.removeChild(elDialog);
          showText();
        }
      }

      showText();
    },

    // TODO: handle rotation :(
    stickToSprite: function stickToSprite() {
      if (!this.el) {
        return;
      }

      var x = this.stickTo.topRight.x,
          y = this.stickTo.topRight.y - this.el.offsetHeight,
          offset = this.stickTo.layer.context.canvas.getBoundingClientRect();

      x += offset.left;
      y += offset.top;

      x += this.DISTANCE_FROM_SPRITE_X;
      y += this.DISTANCE_FROM_SPRITE_Y;

      x = Math.round(x);
      y = Math.round(y);

      this.el.style.cssText += '-webkit-transform: translate(' + x + 'px, ' + y + 'px);' +
                               'transform: translate(' + x + 'px, ' + y + 'px);';

      window.setTimeout(this.stickToSprite.bind(this), 60/1000);
    },

    getElement: function getElement(text) {
      var el = document.createElement('div');

      el.className = 'dialog';

      el.innerHTML = text;

      return el;
    }
  }
  return new Dialog();
}());