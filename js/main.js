(function() {

  var elContainer = document.getElementById('container'),
      layerBackground,
      layerObjects,
      layerPlayer,

      game,

      // used for CSS rotation of the game
      currentGravityAngle = 0;;

  function init() {
    game = new Game({
      'el': elContainer,
      'width': elContainer.offsetWidth,
      'height': elContainer.offsetHeight,
      'onBeforeTick': gameTick
    });


    layerBackground = new Layer({
      'id': 'background'
    }),
    layerObjects = new Layer({
      'id': 'objects'
    }),
    layerPlayer = new Layer({
      'id': 'player'
    });

    game.addLayer(layerBackground);
    game.addLayer(layerObjects);
    game.addLayer(layerPlayer);

    // player
    Player.init();
    layerPlayer.addSprite(Player.sprite);

    // surfaces
    var platforms = [
      [0, 0, game.width, 20],
      [0, game.height - 20, game.width, 20],
      [0, 0, 20, game.height],
      [game.width - 20, 0, 20, game.height],

      [200, 620, 100, 20],
      [620, 470, 80, 10],
      [520, 410, 50, 10],
      [420, 350, 50, 10],
      [320, 290, 50, 10],
      [220, 230, 50, 10],
      [120, 170, 50, 10],
      [60, 110, 740, 10],
      [150, 370, 150, 10]
    ];

    for (var i = 0, platform; platform = platforms[i++];) {
      platform = new Platform({
        'id': 'platform_' + i,
        'x': platform[0],
        'y': platform[1],
        'width': platform[2],
        'height': platform[3]
      });

      layerBackground.addSprite(platform);
    }

    var movables = [
      [100, 650, 150, 20],
      //[100, 580, 20, 20],
      //[400, 280, 50, 50],
    ];
    for (var i = 0, movable; movable = movables[i++];) {
      movable = new Movable({
        'id': 'movable_' + i,
        'x': movable[0],
        'y': movable[1],
        'width': movable[2],
        'height': movable[3]
      });

      layerObjects.addSprite(movable);
    }

    window.addEventListener('keydown', function onKeyUp(e) {
      if (e.keyCode === 68) { // A
        rotateGravity(-90);
      } else if (e.keyCode === 65) { // D
        rotateGravity(90);
      } else if (e.keyCode === 70) { //F
        spawnMovableFromPlayer();
      }
    });

    document.getElementById('rotate-left').addEventListener('click', function() {
      rotateGravity(90);
    })
    document.getElementById('rotate-right').addEventListener('click', function() {
      rotateGravity(-90);
    })

    window.setTimeout(function() {
      document.body.classList.add('game-ready');
      game.start();
    });

    // just for easy debugging
    window.game = game;
  }

  // default gravity ("bottom") is 90deg, since it's pointing down
  function rotateGravity(angle) {
    var elButton;
    if (angle > 0) {
      elButton = document.getElementById('rotate-left');
    } else if (angle < 0) {
      elButton = document.getElementById('rotate-right');
    }

    if (elButton.classList.contains('active')) {
      return;
    }

    currentGravityAngle -= angle;

    // change gravity
    game.setGravity(window.GRAVITY.rotate(angle));

    // rotate game graphics
    elContainer.style.cssText += '-webkit-transform: rotate(' + currentGravityAngle + 'deg);' +
                                 'transform: rotate(' + currentGravityAngle + 'deg);';

    // UI indication
    elButton.classList.add('active')
    window.setTimeout(function() {
      elButton.classList.remove('active')
    }, 700);
  }

  function spawnMovableFromPlayer() {
    var playerSprite = Player.sprite,
        movableOptions = {
          x: playerSprite.topLeft.x,
          y: playerSprite.topLeft.y,
          width: playerSprite.width,
          height: playerSprite.height
        },
        newSprite = new Movable(movableOptions);

    layerObjects.addSprite(newSprite);

    return newSprite;
  }

  function gameTick(dt) {
    var gravityDirection = window.GRAVITY_DIRECTION;

    // jump according to gravity
    if (Player.isJumping && Player.sprite.resting) {
      Player.sprite.applyForce(gravityDirection.scale(-Player.JUMP_FORCE * dt));
    }

    // move player according to gravity
    // TODO: find a correct formula for gravity/force rotation
    var dir = 0;
    if (Player.isMovingRight) {
      dir = 1;
    } else if (Player.isMovingLeft) {
      dir = -1;
    }

    if (dir) {
      if (gravityDirection.x) {
        dir *= -1;
      }

      Player.sprite.accelerate(gravityDirection.flip().scale(Player.MOVE_SPEED * dir));
    } else {
      Player.sprite.accelerate();
    }
  }


  var Player = {
    sprite: null,

    isJumping: false,
    isMovingLeft: false,
    isMovingRight: false,

    JUMP_FORCE: 300,
    MOVE_SPEED: 500000,

    init: function init() {
      this.sprite = new Sprite({
        'id': 'player',
        'x': 50,
        'y': 300,
        'width': 20,
        'height': 20,
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
      var keyCode = e.keyCode;

      switch (keyCode) {
        case 32:
        case 38:
          this.isJumping = true;
          break;
        case 37:
          !this.isMovingRight && (this.isMovingLeft = true);
          break;
        case 39:
          !this.isMovingLeft && (this.isMovingRight = true);
          break;
      }
    },

    onKeyUp: function onKeyUp(e) {
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


  function Platform(options) {
    options.gravity = false;
    options.solid = true;
    options.movable = false;
    options.friction = new Vector(0.5, 0.5);
    options.background = 'rgba(0, 0, 0, 1)';
    !options.height && (options.height = 20);
    !options.id && (options.id = 'platform_' + Math.random());

    return new Sprite(options);
  }

  function Movable(options) {
    options.movable = true;
    options.gravity = true;
    options.solid = true;
    options.bounce = 0.5;
    options.maxVelocity = new Vector(2.2, Infinity);
    options.friction = new Vector(0.1, 1); // no X friction, to allow "sliding"
    options.background = 'rgba(60, 90, 120, 1)';
    !options.height && (options.height = 30);
    !options.height && (options.height = 30);
    !options.id && (options.id = 'movable_' + Math.random());

    return new Sprite(options);
  }

  init();
}());