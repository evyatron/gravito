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
    Player.init({
      'x': 50,
      'y': 500
    });
    layerPlayer.addSprite(Player.sprite);

    // surfaces
    var BORDER_WIDTH = 20,
        platforms = [
          [0, 0, game.width, BORDER_WIDTH],
          [0, game.height - BORDER_WIDTH, game.width, BORDER_WIDTH],
          [0, 0, BORDER_WIDTH, game.height],
          [game.width - BORDER_WIDTH, 0, BORDER_WIDTH, game.height],

          [120, 170, 50, 10],
          [220, 230, 50, 10],
          [320, 290, 50, 10],
          [420, 350, 50, 10],
          [520, 410, 50, 10],
          [620, 470, 80, 10],
          [520, 530, 50, 10],
          [420, 590, 50, 10],

          [60, 110, 740, 10],
          [BORDER_WIDTH, 150, 60, 10],
          [BORDER_WIDTH + 50, 140, 10, 20]
        ];

    for (var i = 0, platform; platform = platforms[i++];) {
      platform = new Sprite({
        'id': 'platform_' + i,
        'x': platform[0],
        'y': platform[1],
        'width': platform[2],
        'height': platform[3],
        'background': 'rgba(0, 0, 0, 1)',
        'gravity': false,
        'solid': true,
        'movable': false,
        'friction': new Vector(0.5, 0.5)
      });

      layerBackground.addSprite(platform);
    }


    var collectibles = [
      [440, 320, 10, 10, 'rgba(0, 128, 0, 1)', onCollectRotate1]
    ];
    for (var i = 0, collectibleData; collectibleData = collectibles[i++];) {
      var collectible = new Sprite({
        'id': 'collectibleData_' + i,
        'x': collectibleData[0],
        'y': collectibleData[1],
        'width': collectibleData[2],
        'height': collectibleData[3],
        'background': collectibleData[4] || 'rgba(0, 0, 0, 1)',
        'gravity': false,
        'solid': false,
        'movable': false,
        'collisionable': true,
        'friction': new Vector(0.5, 0.5)
      });

      if (collectibleData[5]) {
        Player.sprite.onCollisionWith(collectible, collectibleData[5]);
      }

      layerObjects.addSprite(collectible);
    }

    var movables = [
      [game.width - BORDER_WIDTH - 60 - Player.sprite.width - 10, 650, 60, 20],
      //[300, 580, 20, 20],
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

  function onCollectRotate1(sprite, direction) {
    layerObjects.removeSprite(sprite);
    setPlayerAllowedRotation(90);
  }

  function setPlayerAllowedRotation(rotation) {
    var currentAllowedRotation = Player.get('maxRotation');
    if (currentAllowedRotation >= rotation) {
      return;
    }

    document.body.classList.remove('allowed-rotation-' + currentAllowedRotation);
    document.body.classList.add('allowed-rotation-' + rotation);
    Player.set('maxRotation', rotation);
  }

  // default gravity ("bottom") is 90deg, since it's pointing down
  function rotateGravity(angle) {
    if (Math.abs(currentGravityAngle - angle) % 360 > Player.get('maxRotation')) {
      cantRotate();
      return;
    }

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

  function cantRotate() {
    console.info('Cant rotate')
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

  function Platform(options) {
    options.gravity = false;
    options.solid = true;
    options.movable = false;
    options.friction = new Vector(0.5, 0.5);
    options.background = options.color || 'rgba(0, 0, 0, 1)';
    !options.height && (options.height = 20);
    !options.id && (options.id = 'platform_' + Math.random());

    return new Sprite(options);
  }

  function Movable(options) {
    options.movable = true;
    options.gravity = true;
    options.solid = true;
    options.bounce = 0.5;
    options.maxVelocity = new Vector(4, 50000);
    options.friction = new Vector(0.1, 1); // no X friction, to allow "sliding"
    options.background = 'rgba(60, 90, 120, 1)';
    !options.height && (options.height = 30);
    !options.height && (options.height = 30);
    !options.id && (options.id = 'movable_' + Math.random());

    return new Sprite(options);
  }

  init();
}());