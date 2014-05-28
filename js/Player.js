window.Player = (function() {

  var DATA_KEY = 'settings',
      DEFAULT_SETTINGS = {
        'id': 'player',
        'isPlayer': true,
        'x': 0,
        'y': 0,
        'width': 20,
        'height': 20,
        'movable': true,
        'gravity': true,
        'bounce': 0,
        'solid': true,
        'maxVelocity': new Vector(4, 500000),
        'velocity': new Vector(0, 0),
        'acceleration': new Vector(0, 0),
        'background': 'rgba(255, 0, 0, 1)'
      };

  function Player() {
    this.sprite = null;

    this.canControl = true;

    this.isJumping = false;
    this.isMovingLeft = false;
    this.isMovingRight = false;

    this.data = {
      'maxRotation': 0,
      'didIntro': false,
      'didIntroTutorial': false
    };

    this.JUMP_FORCE = 300;
    this.MOVE_SPEED = 500000;
  }

  Player.prototype = {
    init: function init(options) {
      !options && (options = {});

      window.addEventListener('keydown', this.onKeyDown.bind(this));
      window.addEventListener('keyup', this.onKeyUp.bind(this));

      this.loadSettings(function onDataLoaded() {
        document.body.classList.add('allowed-rotation-' + this.get('maxRotation'));
        document.body.classList.add('intro-' + this.get('didIntroTutorial'));
      }.bind(this));
    },

    createSprite: function createSprite(layer, options) {
      !options && (options = {});

      var data = {};
      fillWith(data, options, DEFAULT_SETTINGS);

      this.sprite = new Sprite(data);

      layer.addSprite(this.sprite);
    },

    loadSettings: function loadSettings(callback) {
      utils.Storage.get(DATA_KEY, function onGotData(data) {
        if (data) {
          fillWith(this.data, data);
        }

        callback && callback(data);
      }.bind(this));
    },

    set: function set(key, value) {
      this.data[key] = value;
      utils.Storage.set(DATA_KEY, this.data);
    },

    get: function get(key) {
      return this.data[key];
    },

    disableControl: function disableControl() {
      this.canControl = false;
    },

    enableControl: function disableControl() {
      this.canControl = true;
    },

    stopAllMovement: function stopAllMovement() {
      this.isMovingRight = false;
      this.isMovingLeft = false;
      this.isJumping = false;
    },

    onKeyDown: function onKeyDown(e) {
      if (!this.canControl) {
        return;
      }

      var keyCode = e.keyCode;

      switch (keyCode) {
        case 32:
        case 38:
          this.isJumping = true;
          break;
        case 37:
          this.isMovingLeft = true;
          break;
        case 39:
          this.isMovingRight = true;
          break;
      }
    },

    onKeyUp: function onKeyUp(e) {
      if (!this.canControl) {
        return;
      }

      var keyCode = e.keyCode;

      switch (keyCode) {
        case 32:
        case 38:
          this.isJumping = false;
          break;
        case 37:
          this.isMovingLeft = false;
          break;
        case 39:
          this.isMovingRight = false;
          break;
      }
    }
  };

  return new Player();
}());