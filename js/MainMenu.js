var MainMenu = (function() {
  function MainMenu() {
    this.el = null;
    this.elOptions = null;
    this.isVisible = false;
  }

  MainMenu.prototype = {
    init: function init(options) {
      !options && (options = {});

      if (options.onShow) {
        this.addEventListener('show', options.onShow);
      }
      if (options.onHide) {
        this.addEventListener('hide', options.onHide);
      }

      this.createHTML();

      this.addOptions(options.options);

      if (options.elContainer) {
        options.elContainer.appendChild(this.el);
      }
      if (options.onChange) {
        this.addEventListener('change', options.onChange);
      }
    },

    show: function show() {
      if (this.isVisible) {
        return;
      }

      this.isVisible = true;
      document.body.classList.add('menu-visible');
      this.el.classList.add('visible');
      this.trigger('show');
    },

    hide: function hide() {
      if (!this.isVisible) {
        return;
      }

      this.isVisible = false;
      document.body.classList.remove('menu-visible');
      this.el.classList.remove('visible');
      this.trigger('hide');
    },

    clickOn: function clickOn(id) {
      var elOption = this.elOptions.querySelector('.option-' + id),
          event = document.createEvent('MouseEvents');

      event.initMouseEvent('click');
      elOption.dispatchEvent(event);
    },

    setOptionText: function setOptionText(id, text) {
      var elLabel = this.elOptions.querySelector('*[data-id = "' + id + '"] label');

      if (elLabel) {
        elLabel.innerHTML = text;
      }
    },

    set: function set(id, newValue) {
      var elOption = this.elOptions.querySelector('.option-' + id);

      if (!elOption) {
        return;
      }

      var oldValue = elOption.dataset.value;
      if (newValue === oldValue) {
        return;
      }

      elOption.dataset.value = newValue;

      this.trigger('change', id, newValue);
      this.trigger('change-' + id, newValue, oldValue);
    },

    onToggleOptionClick: function onToggleOptionClick(e) {
      var elClicked = e.target,
          optionId = elClicked.dataset.id,
          newValue = (elClicked.dataset.value === 'on')? 'off' : 'on';

      this.set(optionId, newValue);
    },

    onRangeOptionMouseDown: function onRangeOptionMouseDown(e) {
      var elInput = e.target;

      if (elInput.type !== 'range') {
        return;
      }

      var self = this,
          elClicked = elInput.parentNode,
          optionId = elClicked.dataset.id,
          oldValue = elClicked.dataset.value;

      function onMouseUp(e) {
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('mousemove', onMouseMove);

        var newValue = onCheckChange();
        self.trigger('change', optionId, newValue);
      }

      
      function onMouseMove(e) {
        onCheckChange();
      }

      function onCheckChange() {
        var newValue = elInput.value;
        if (newValue === oldValue) {
          return newValue;
        }

        elClicked.dataset.value = newValue;

        self.trigger('change-' + optionId, newValue, oldValue);

        oldValue = newValue;

        return newValue;
      }

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },

    addOptions: function addOptions(options) {
      for (var i = 0, option; option = options[i++];) {
        this.addOption(option);
      }
    },

    addOption: function addOption(data) {
      var el = document.createElement('li');
      el.className = data.type;

      if (data.type === 'separator') {
        
      } else {
        var id = data.id,
          html = '<label>' + (data.text || utils.l10n.get('menu-option-' + id)) + '</label>'

        el.dataset.id = id;
        el.dataset.value = (data.value || '');
        el.classList.add('option-' + id);

        switch (data.type) {
          case 'click':
            el.addEventListener('click', data.onSelect || function(){console.warn('please implement callback for click option!')});
            break;
          case 'toggle':
            el.addEventListener('click', this.onToggleOptionClick.bind(this));

            if (data.onChange) {
              this.addEventListener('change-' + id, data.onChange);
              this.trigger('change-' + id, el.dataset.value);
            }
            break;
          case 'range':
            el.addEventListener('mousedown', this.onRangeOptionMouseDown.bind(this));
            html += '<input type="range"\
                            min="' + (data.min || 0) + '"\
                            max="' + (data.max || 1) + '"\
                            step="' + (data.step || 0.1) + '"\
                            value="' + el.dataset.value + '"\
                            />';

            if (data.onChange) {
              this.addEventListener('change-' + id, data.onChange);
              this.trigger('change-' + id, el.dataset.value);
            }
            break;
        }

        el.innerHTML = html;
      }

      this.elOptions.appendChild(el);
    },

    createHTML: function createHTML() {
      var el = document.createElement('div');
      el.innerHTML = '<h1>' + utils.l10n.get('menu-title') + '</h1>' +
                     '<ul class="options"></ul>';

      el.id = 'menu';

      this.elOptions = el.querySelector('.options');

      this.el = el;
    }
  };

  utils.addEventsSupport(MainMenu);

  return new MainMenu();
}());

var SettingsManager = (function() {
  function SettingsManager() {

  }

  SettingsManager.prototype = {
    init: function init() {

    },
    
    get: function get() {

    },
    
    set: function set(key, value) {

    }
  };

  return new SettingsManager();
}());