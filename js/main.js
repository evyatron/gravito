(function() {

  var elContainer = document.getElementById('container'),
      elCanvases = document.getElementById('canvases'),
      layerBackground,
      layerObjects,
      layerPlayer,

      game,

      canUserMove = true,

      // used for CSS rotation of the game
      currentGravityAngle = 0;;

  function init() {
    utils.l10n.init();

    Dialog.init({
      'elContainer': document.getElementById('dialogs')
    });

    game = new Game({
      'el': elCanvases,
      'width': elCanvases.offsetWidth,
      'height': elCanvases.offsetHeight,
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


    createSprites();


    window.addEventListener('keydown', function onKeyUp(e) {
      if (e.keyCode === 68) { // A
        userRotateGravity(-90);
      } else if (e.keyCode === 65) { // D
        userRotateGravity(90);
      } else if (e.keyCode === 70) { //F
        layerObjects.addSprite(new Movable({
          x: Player.sprite.topLeft.x,
          y: Player.sprite.topLeft.y,
          width: Player.sprite.width,
          height: Player.sprite.height
        }));
      }
    });

    bindControlEvents();

    window.setTimeout(function() {
      document.body.classList.add('game-ready');
      game.start();
    });

    // just for easy debugging
    window.game = game;
  }

  function createSprites() {
    var BORDER_WIDTH = 10;

    // surfaces
    createPlatforms([
      [0, 0, game.width, BORDER_WIDTH],
      [0, game.height - BORDER_WIDTH, game.width, BORDER_WIDTH],
      [0, 0, BORDER_WIDTH, game.height],
      [game.width - BORDER_WIDTH, 0, BORDER_WIDTH, game.height],

      [120, 170, 50, 10],
      [220, 230, 50, 10],
      [320, 290, 50, 10],
      [420, 350, 50, 10],
      [520, 410, 50, 10],
      [620, 470, 40, 10],
      [520, 530, 50, 10],
      [420, 590, 50, 10],

      [60, 80, 740, 10],
      [BORDER_WIDTH, 130, 60, 10],
      [BORDER_WIDTH + 50, 120, 10, 20]
    ]);

    createMovables([
      [500, 650, 60, 20]
    ]);

    createCollectibles([
      [635, 545, 20, 20, 'rgba(0, 138, 0, 1)'],
      [640, 550, 10, 10, 'rgba(0, 178, 0, 1)', onCollectRotate1]
    ]);
  }

  function createCollectibles(data) {
    for (var i = 0, spriteData; spriteData = data[i++];) {
      var collectible = new Sprite({
        'id': 'collectible_' + i,
        'x': spriteData[0],
        'y': spriteData[1],
        'width': spriteData[2],
        'height': spriteData[3],
        'background': spriteData[4] || 'rgba(0, 0, 0, 1)',
        'gravity': false,
        'solid': false,
        'movable': false,
        'collisionable': true,
        'friction': new Vector(0.5, 0.5)
      });

      if (spriteData[5]) {
        Player.sprite.onCollisionWith(collectible, spriteData[5]);
      }

      layerObjects.addSprite(collectible);
    }
  }

  function createMovables(data) {
    for (var i = 0, spriteData; spriteData = data[i++];) {
      layerObjects.addSprite(new Sprite({
        'id': 'movable_' + i,
        'x': spriteData[0],
        'y': spriteData[1],
        'width': spriteData[2] || 30,
        'height': spriteData[3] || 30,
        'movable': true,
        'gravity': true,
        'solid': true,
        'bounce': 0.5,
        'background': 'rgba(100, 150, 200, 1)',
        'maxVelocity': new Vector(4, 50000),
        'friction': new Vector(0.1, 1)
      }));
    }
  }

  function createPlatforms(data) {
    for (var i = 0, spriteData; spriteData = data[i++];) {
      layerBackground.addSprite(new Sprite({
        'id': 'platform_' + i,
        'x': spriteData[0],
        'y': spriteData[1],
        'width': spriteData[2],
        'height': spriteData[3],
        'background': 'rgba(0, 0, 0, 1)',
        'gravity': false,
        'solid': true,
        'movable': false,
        'friction': new Vector(0.5, 0.5)
      }));
    }
  }

  function disableUserMovement() {
    canUserMove = false;
  }

  function enableUserMovement() {
    canUserMove = true;
  }

  function bindControlEvents() {
    if (!Player.get('didIntro')) {
      window.addEventListener('keydown', onKeyIntro);
    }

    document.getElementById('rotate-left').addEventListener('click', function() {
      rotateGravity(90);
    })
    document.getElementById('rotate-right').addEventListener('click', function() {
      rotateGravity(-90);
    })

    document.getElementById('move-jump').addEventListener('mousedown', function(e) {
      e.target.classList.add('active');
      Player.isJumping = true;
    });

    var elButtons = [
      [document.getElementById('move-jump'), 'isJumping'],
      [document.getElementById('move-right'), 'isMovingRight'],
      [document.getElementById('move-left'), 'isMovingLeft']
    ];

    window.addEventListener('mouseup', function(e) {
      for (var i = 0, button; button = elButtons[i++];) {
        if (button[0].classList.contains('active')) {
          button[0].classList.remove('active')
          Player[button[1]] = false;
        }
      }
    });
  }

  function onKeyIntro(e) {
    if (Player.isMovingRight || Player.isMovingLeft || Player.isJumping) {
      Player.isMovingRight = false;
      Player.isMovingLeft = false;
      Player.isJumping = false;

      Dialog.show({
        'id': 'intro',
        'text': utils.l10n.get('intro'),
        'sprite': Player.sprite,
        'onMethod': function onMethod(method, onDone) {
          window.setTimeout(function() {
            var duration = 400;

            if (method === 'moveLeft') {
              Player.isMovingLeft = true;
            } else if (method === 'moveRight') {
              Player.isMovingRight = true;
            } else if (method === 'jump') {
              Player.isJumping = true;
              duration = 600;
            }

            window.setTimeout(function() {
              Player.isMovingRight = false;
              Player.isMovingLeft = false;
              Player.isJumping = false;

              
              window.setTimeout(onDone, 400);
            }, duration);
          }, 800);
        },
        'onEnd': function onDialogEnd() {
          Player.set('didIntro', true);
          document.body.classList.remove('intro-false');
          document.body.classList.add('intro-true');
          window.removeEventListener('keydown', onKeyIntro);
        }
      });
    }
  }

  function onCollectRotate1(sprite, direction) {
    layerObjects.removeSprite('collectible_1');
    layerObjects.removeSprite(sprite);

    var currentAllowedRotation = Player.get('maxRotation');
    if (currentAllowedRotation >= 90) {
      return;
    }

    disableUserMovement();

    Dialog.show({
      'id': 'gravity1',
      'text': utils.l10n.get('gravity-1'),
      'sprite': Player.sprite,
      'onMethod': function onMethod(method, onDone) {
        if (method === 'gravityCCW') {
          rotateGravity(-90);
          window.setTimeout(onDone, 2000);
        } else if (method === 'gravityCW') {
          rotateGravity(90);
          window.setTimeout(onDone, 1200);
        }
      },
      'onEnd': function onDialogEnd() {
        setPlayerAllowedRotation(90);
        enableUserMovement();
      }
    });
  }

  function setPlayerAllowedRotation(rotation) {
    var currentAllowedRotation = Player.get('maxRotation');
    if (currentAllowedRotation >= rotation) {
      return false;
    }

    document.body.classList.remove('allowed-rotation-' + currentAllowedRotation);
    document.body.classList.add('allowed-rotation-' + rotation);
    Player.set('maxRotation', rotation);

    return true;
  }

  // default gravity ("bottom") is 90deg, since it's pointing down
  function userRotateGravity(angle) {
    if (Math.abs(currentGravityAngle - angle) % 360 > Player.get('maxRotation')) {
      cantRotate();
      return;
    }

    rotateGravity(angle);
  }

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
    elCanvases.style.cssText += '-webkit-transform: rotate(' + currentGravityAngle + 'deg);' +
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

  function gameTick(dt) {
    var gravityDirection = window.GRAVITY_DIRECTION;

    // jump according to gravity
    if (canUserMove && Player.isJumping && Player.sprite.resting) {
      Player.sprite.applyForce(gravityDirection.scale(-Player.JUMP_FORCE * dt));
    }

    // move player according to gravity
    // TODO: find a correct formula for gravity/force rotation
    var dir = 0;
    if (Player.isMovingRight) {
      dir += 1;
    }
    if (Player.isMovingLeft) {
      dir -= 1;
    }

    if (canUserMove && dir) {
      if (gravityDirection.x) {
        dir *= -1;
      }

      Player.sprite.accelerate(gravityDirection.flip().scale(Player.MOVE_SPEED * dir));
    } else {
      Player.sprite.accelerate();
    }
  }

  init();
}());