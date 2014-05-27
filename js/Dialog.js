Dialog = (function() {
  var DEFAULT_DURATION = 2000,
      DURATION_REGEX = /^\{d:(\d+)\}/,
      METHOD_REGEX = /^\{m:([^\}]+)\}/;

  function Dialog() {

  }

  Dialog.prototype = {
    init: function init(options) {
      this.elContainer = options.elContainer;
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
            duration = DEFAULT_DURATION,
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

          /*
          if (sprite) {
            elDialog.style.cssText += 'top: ' + (sprite.topRight.y - elDialog.offsetHeight) + 'px;' +
                                      'left: ' + sprite.topRight.x + 'px;';
          }
          */
        }

        if (methodFromText) {
          onMethod(methodFromText, nextStep);
        } else {
          window.setTimeout(nextStep, duration);
        }

        function nextStep() {
          elDialog && elDialog.parentNode.removeChild(elDialog);
          showText();
        }
      }

      showText();
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