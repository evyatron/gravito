window.Player = (function() {

  var DATA_KEY = 'settings';

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

      this.sprite = new Sprite({
        'id': 'player',
        'isPlayer': true,
        'x': options.x || 0,
        'y': options.y || 0,
        'width': options.width || 20,
        'height': options.height || 20,
        'movable': true,
        'gravity': true,
        'bounce': 0,
        'solid': true,
        'maxVelocity': new Vector(4, 500000),
        'background': 'rgba(255, 0, 0, 1)'
      });

      // just to test collision events
      this.sprite.onCollision(this.setColorAccordingToCollisions.bind(this), this.setColorAccordingToCollisions.bind(this));

      window.addEventListener('keydown', this.onKeyDown.bind(this));
      window.addEventListener('keyup', this.onKeyUp.bind(this));

      this.loadSettings(function onDataLoaded() {
        document.body.classList.add('allowed-rotation-' + this.get('maxRotation'));
        document.body.classList.add('intro-' + this.get('didIntroTutorial'));
      }.bind(this));
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

    setColorAccordingToCollisions: function setColorAccordingToCollisions() {
      var collisions = this.sprite.collisions,
          color = 'rgba(255, 0, 0, 1)';

      for (var id in collisions) {
        if (id.indexOf('movable_') === 0) {
          color = 'rgba(180, 180, 240, 1)';
          break;
        }
      }

      this.sprite.background = color;
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