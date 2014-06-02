window.Player = (function() {

  var DATA_KEY = 'settings',
      DEFAULT_SETTINGS = {
        'id': 'player',
        'isPlayer': true,
        'x': 0,
        'y': 0,
        'movable': true,
        'gravity': true,
        'bounce': 0,
        'solid': true,
        'maxVelocity': new Vector(4, 500000),
        'velocity': new Vector(0, 0),
        'acceleration': new Vector(0, 0)
      };

  function Player() {
    this.sprite = null;

    this.canControl = true;

    this.isJumping = false;
    this.isMovingLeft = false;
    this.isMovingRight = false;

    this.onCollisionStart = null;
    this.onCollisionEnd = null;

    this.isNew = true;

    // data to be saved in persistent storage
    this.data = {
      'maxLevel': 1,
      'maxRotation': 0,
      'didIntroTutorial': false,
      'gameFinished': false,

      'didDeathTutorials': false,
      'tutorial-die-poison': false,
      'tutorial-die-bounds': false,

      'score': 0,
      'scorePerLevel': {},

      'settings-sound': 'on',
      'settings-volume': '0.5',
      'settings-fullscreen': 'off'
    };

    // from config
    this.JUMP_FORCE;
    this.MOVE_SPEED;
    this.WIDTH;
    this.HEIGHT;
    this.BACKGROUND;
  }

  Player.prototype = {
    init: function init(options) {
      !options && (options = {});

      DEFAULT_SETTINGS.width = this.WIDTH;
      DEFAULT_SETTINGS.height = this.HEIGHT;
      DEFAULT_SETTINGS.background = this.BACKGROUND;

      this.onCollisionStart = options.onCollisionStart;
      this.onCollisionEnd = options.onCollisionEnd;

      window.addEventListener('keydown', this.onKeyDown.bind(this));
      window.addEventListener('keyup', this.onKeyUp.bind(this));

      this.loadSettings(function onDataLoaded() {
        document.body.classList.add('allowed-rotation-' + this.get('maxRotation'));
        document.body.classList.add('intro-' + this.get('didIntroTutorial'));
        options.onSettingsLoad && (options.onSettingsLoad(this.data));
      }.bind(this));
    },

    createSprite: function createSprite(layer, options) {
      !options && (options = {});

      var data = {};
      fillWith(data, options, DEFAULT_SETTINGS);

      this.sprite = new Sprite(data);

      if (this.onCollisionStart || this.onCollisionEnd) {
        this.sprite.onCollision(this.onCollisionStart, this.onCollisionEnd);
      }

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
      return key? this.data[key] : this.data;
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