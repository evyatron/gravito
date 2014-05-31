Dialog = (function() {
  var DURATION_REGEX = /\{d:(\d+)\}/,
      METHOD_REGEX = /\{m:([^\}]+)\}/;

  function Dialog() {
    this.elContainer;
    this.el;
    this.id;
    this.sprite;
    this.onEnd;
    this.onMethod;

    this.DEFAULT_DURATION;
    this.DISTANCE_FROM_SPRITE_X;
    this.DISTANCE_FROM_SPRITE_Y;
  }

  Dialog.prototype = {
    init: function init(options) {
      this.elContainer = options.elContainer;

      window.addEventListener('keypress', this.onKeyPress.bind(this));
    },

    show: function show(options) {
      var texts = options.text,
          id = options.id;

      !id && (id = text.replace(/[^a-zA-Z]/g, '').toLowerCase());

      if (document.getElementById('dialog-' + id)) {
        return;
      }

      if (!Array.isArray(texts)) {
        texts = [texts];
      }

      this.id = id;
      this.texts = texts.slice(0);
      this.onMethod = options.onMethod || this.defaultOnMethod
      this.onEnd = options.onEnd || function() {};;
      this.sprite = options.sprite;

      this.showText();
    },

    showText: function showText() {
      if (!this.texts) {
        return;
      }

      var text = this.texts.shift(),
          duration = this.DEFAULT_DURATION,
          durationFromText = (text || '').match(DURATION_REGEX),
          methodFromText = (text || '').match(METHOD_REGEX);

      if (text === undefined) {
        this.onEnd();
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
        this.el = this.getElement(text);
        this.el.id = 'dialog-' + this.id;
        this.elContainer.appendChild(this.el);

        if (this.sprite) {
          this.stickToSprite();
        } else {
          this.el.classList.add('global');
        }
      }

      if (methodFromText) {
        this.onMethod(methodFromText, this.nextStep.bind(this));
      } else {
        this.timeoutNextStep = window.setTimeout(this.nextStep.bind(this), duration);
      }
    },

    nextStep: function nextStep() {
      this.el && this.el.parentNode.removeChild(this.el);
      this.el = null;
      this.showText();
    },

    onKeyPress: function onKeyPress(e) {
      if (e.keyCode === 32) {
        if (this.timeoutNextStep) {
          window.clearTimeout(this.timeoutNextStep);
          this.timeoutNextStep = null;
          window.setTimeout(this.nextStep.bind(this), 200);
        }
      }
    },

    // TODO: handle rotation :(
    stickToSprite: function stickToSprite() {
      if (!this.el) {
        return;
      }

      var x = this.sprite.topRight.x,
          y = this.sprite.topRight.y - this.el.offsetHeight,
          offset = this.sprite.layer.context.canvas.getBoundingClientRect();

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

    defaultOnMethod: function defaultOnMethod(method, onDone) {
      console.warn('Default Method handler (for "' + method + '") not implemented, setting timeout 500ms');
      window.setTimeout(onDone, 500);
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