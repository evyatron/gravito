(function() {
  var elContainer,
      elCanvases,
      layerBackground,
      layerObjects,
      layerPlayer,

      game,
      currentLevel = 1,
      currentLevelData,
      CurrentLevel,

      DEFAULT_WIDTH = 0,
      DEFAULT_HEIGHT = 0,
      DEFAULT_BACKGROUND = 'rgba(255, 255, 255, 1)',
      DEFAULT_FINISH_LIGHT = 'rgba(255, 255, 0, .08)',
      DEFAULT_FINISH_COLOR = 'rgba(255, 255, 0, .5)',

      FINAL_LEVEL = 3,

      // used for CSS rotation of the game
      currentGravityAngle = 0;;

  function init() {
    elContainer = document.getElementById('container');
    elCanvases = document.getElementById('canvases');

    DEFAULT_WIDTH = elCanvases.offsetWidth;
    DEFAULT_HEIGHT = elCanvases.offsetHeight;

    utils.l10n.init();

    Dialog.init({
      'elContainer': document.getElementById('dialogs')
    });

    game = new Game({
      'el': elCanvases,
      'width': DEFAULT_WIDTH,
      'height': DEFAULT_HEIGHT,
      'onBeforeTick': gameTick
    });

    // just for easy debugging
    window.game = game;

    // create all sprite layers - background, player, etc.
    createLayers();

    // add player
    Player.init({
      'onCollision': onPlayerCollision
    });

    // UI controls event listeners etc.
    UIControls.init();

    // first intro text
    if (!Player.get('didIntroTutorial')) {
      window.addEventListener('keydown', onKeyIntroTutorial);
    }

    // when a level is ready - start the game loop
    window.addEventListener('levelReady', onLevelReady);

    // load the first level
    loadLevel((window.location.href.match(/LEVEL=(\d+)/) || [])[1]);
  }

  function createLayers() {
    layerBackground = new Layer({
      'id': 'background'
    }),
    layerPlayer = new Layer({
      'id': 'player'
    });
    layerObjects = new Layer({
      'id': 'objects'
    }),

    game.addLayer(layerBackground);
    game.addLayer(layerPlayer);
    game.addLayer(layerObjects);
  }

  function onLevelReady(e) {
    var levelObject = (e.detail || {}).level || {};
    CurrentLevel = levelObject;

    document.body.classList.remove('level-loading');
    document.body.classList.add('level-ready');

    window.setTimeout(game.start.bind(game), 50);
  }

  function loadNextLevel() {
    currentLevel++;
    loadLevel();
  }

  function loadLevel(level) {
    game.stop();

    document.body.classList.add('level-loading');
    document.body.classList.remove('level-ready');

    !level && (level = currentLevel);
    if (level > FINAL_LEVEL) {
      level = 1;
    }

    currentLevel = level;

    layerBackground.clear();
    layerObjects.clear();
    layerPlayer.clear();

    var url = 'data/levels/' + level + '.json',
        request = new XMLHttpRequest();

    request.open('GET', url, true);
    request.responseType = 'json';
    request.onload = function onLevelDataLoad() {
      currentLevelData = request.response;
      initLevel();
    };

    request.send();
  }

  function initLevel() {
    if (!currentLevelData) {
      return;
    }

    var background = currentLevelData.background || DEFAULT_BACKGROUND;
    layerBackground.context.canvas.style.background = background;

    /* --------------- LEVEL SIZE --------------- */
    var size = {
      'width': DEFAULT_WIDTH,
      'height': DEFAULT_HEIGHT
    };
    fillWith(size, currentLevelData.size);

    game.setSize(size.width, size.height);


    /* --------------- FRAME & FINISH POINT--------------- */
    var finishData = {
      'x': null,
      'y': null,
      'width': 0,
      'height': 0,
      'background': 'rgba(255, 255, 0, 1)',
      'type': 'finish'
    };
    fillWith(finishData, currentLevelData.finish);

    var frameWidth = currentLevelData.frame || 0;
    if (typeof frameWidth === 'number') {
      frameWidth = {
        'top': frameWidth,
        'bottom': frameWidth,
        'left': frameWidth,
        'right': frameWidth
      };
    }


    /* --------------- PLAYER POSITION --------------- */
    var playerStartPosition = currentLevelData.start || {};
    // x = 0
    if (!playerStartPosition.hasOwnProperty('x')) {
      playerStartPosition.x = frameWidth;
    }
    // y = on top of the bottom frame
    if (!playerStartPosition.hasOwnProperty('y')) {
      playerStartPosition.y = game.height - frameWidth.bottom - Player.sprite.height;
    }
    if (/%/.test(playerStartPosition.x)) {
      var percent = ('' + playerStartPosition.x).match(/(\d+)%/)[1];
      playerStartPosition.x = (game.width * percent / 100);
    }
    if (/%/.test(playerStartPosition.y)) {
      var percent = ('' + playerStartPosition.y).match(/(\d+)%/)[1];
      playerStartPosition.y = (game.height * percent / 100);
    }

    var userCreationData = {
      'x': playerStartPosition.x,
      'y': playerStartPosition.y
    };
    if (Player.sprite) {
      userCreationData.velocity = Player.sprite.velocity;
      userCreationData.acceleration = Player.sprite.acceleration;
    }

    Player.createSprite(layerPlayer, userCreationData);

    /* --------------- LEVEL FINISH POINT --------------- */
    if (finishData.width && finishData.height) {
      createFinishArea(finishData, frameWidth);
    }


    /* --------------- LEVEL FRAME BORDER --------------- */
    createFrame(frameWidth, finishData);


    /* --------------- PLATFORMS --------------- */
    for (var i = 0, spriteData; spriteData = currentLevelData.platforms[i++];) {
      createPlatform(spriteData, frameWidth);
    }

    /* --------------- MOVABLES --------------- */
    for (var i = 0, spriteData; spriteData = currentLevelData.movables[i++];) {
      createMovable(spriteData, frameWidth);
    }

    /* --------------- COLLECTIBLES --------------- */
    for (var i = 0, spriteData; spriteData = currentLevelData.collectibles[i++];) {
      createCollectible(spriteData, frameWidth);
    }


    /* --------------- LOAD SPECIAL GAME SCRIPT --------------- */
    if (currentLevelData.script) {
      var elScript = document.createElement('script');
      elScript.src = currentLevelData.script;
      document.body.appendChild(elScript);
      return;
    }

    Player.enableControl();

    // game's first introduction
    if (!Player.get('didIntro')) {
      Player.disableControl();
      Dialog.show({
        'id': 'intro',
        'text': utils.l10n.get('intro'),
        'sprite': Player.spritea,
        'onEnd': function onDialogEnd() {
          Player.set('didIntro', true);
          Player.enableControl();
        }
      });
    }

    // Game Ready!
    var eventReady = new CustomEvent('levelReady');
    window.dispatchEvent(eventReady);
  }

  function restartLevel() {
    loadLevel();
  }

  function finishLevel() {
    console.info('finish level!', arguments)
    loadNextLevel();
  }

  function onPlayerCollision(sprite, direction) {
    var type = sprite.type;
    if (onPlayerCollisionWith[type]) {
      onPlayerCollisionWith[type].apply(this, arguments)
    }
  }

  var onPlayerCollisionWith = {
    'finish': function onPlayerCollisionWithFinish(sprite, direction) {
      finishLevel();
    },
    'death': function onPlayerCollisionWithDeath(sprite, direction) {
      Player.disableControl();
      Player.stopAllMovement();
      window.setTimeout(restartLevel, 600);
    },
    'score': function onPlayerCollisionWithScore(sprite, direction) {
      sprite.layer.removeSprite(sprite);
      console.info('score++')
    }
  }

  function createPlatform(spriteData, frameWidth) {
    var data = {
      'id': 'platform_' + Math.random(),
      'x': 0,
      'y': 0,
      'width': 100,
      'height': 20,
      'background': 'rgba(0, 0, 0, 1)',
      'gravity': false,
      'solid': true,
      'movable': false,
      'friction': new Vector(0.5, 0.5)
    };
    fillWith(data, spriteData);

    if (frameWidth) {
      data.x += frameWidth.left;
      data.y += frameWidth.top;
    }

    layerBackground.addSprite(new Sprite(data));
  }

  function createMovable(spriteData, frameWidth) {
    var data = {
      'id': 'movable_' + Math.random(),
      'x': 0,
      'y': 0,
      'width': 30,
      'height': 30,
      'movable': true,
      'gravity': true,
      'solid': true,
      'bounce': 0.5,
      'background': 'rgba(100, 150, 200, 1)',
      'maxVelocity': new Vector(4, 50000),
      'friction': new Vector(0.1, 1)
    };
    fillWith(data, spriteData);

    data.x += frameWidth.left;
    data.y += frameWidth.top;

    layerObjects.addSprite(new Sprite(data));
  }

  function createCollectible(spriteData, frameWidth) {
    var data = {
      'id': 'collectible_' + Math.random(),
      'x': 0,
      'y': 0,
      'width': 20,
      'height': 20,
      'type': 'collectible',
      'background': 'rgba(255, 128, 0, 1)',
      'gravity': false,
      'solid': false,
      'movable': false,
      'collisionable': true,
      'friction': new Vector(0, 0)
    };

    fillWith(data, spriteData);

    data.x += frameWidth.left;
    data.y += frameWidth.top;

    var collectible = new Sprite(data);

    // done like this so the callback will only get parsed once it's called
    // since the callback method might not exist yet (async loading of level script)
    if (spriteData.onCollision) {
      if (spriteData.onCollision instanceof Function) {
        Player.sprite.onCollisionWith(collectible, spriteData.onCollision);
      } else {
        (function(collisionCallback) {
          Player.sprite.onCollisionWith(collectible, function() {
            var onCollision = ((CurrentLevel || {}).actions || {})[collisionCallback];
            onCollision.apply(WRAPPER, arguments);
          });
        }(spriteData.onCollision));
      }
    }

    layerObjects.addSprite(collectible);
  }

  function createFrame(frameWidth, finishData) {
    var platforms = [],
        data;

    if (frameWidth.top) {
      platforms.push({
        'x': 0,
        'y': 0,
        'width': game.width,
        'height': frameWidth.top
      });
    }

    if (frameWidth.bottom) {
      platforms.push({
        'x': 0,
        'y': game.height - frameWidth.bottom,
        'width': game.width,
        'height': frameWidth.bottom
      });
    }

    if (frameWidth.left) {
      data = {
        'x': 0,
        'y': 0,
        'width': frameWidth.left,
        'height': game.height
      };

      if (finishData.width > finishData.height && utils.rectIntersect(finishData, data)) {

      } else {
        platforms.push(data);
      }
    }

    if (frameWidth.right) {
      data = {
        'x': game.width - frameWidth.right,
        'y': 0,
        'width': frameWidth.right,
        'height': game.height
      };

      if (utils.rectIntersect(finishData, data)) {
        platforms.push({
          'x': game.width - frameWidth.right,
          'y': frameWidth.top,
          'width': frameWidth.right,
          'height': finishData.y
        });
        platforms.push({
          'x': game.width - frameWidth.right,
          'y': finishData.y + finishData.height + frameWidth.top,
          'width': frameWidth.right,
          'height': game.height - data.y
        });
      } else {
        platforms.push(data);
      }
    }

    for (var i = 0, data; data = platforms[i++];) {
      createPlatform(data);
    }
  }

  function createFinishArea(finishData, frameWidth) {
    var finishLight = new Sprite({
      'drawMethod': function drawMethod(context) {
        context.beginPath();
        context.moveTo(finishData.x + frameWidth.left, finishData.y + finishData.height + frameWidth.top);
        context.lineTo(finishData.x + frameWidth.left - 50, finishData.y + finishData.height + frameWidth.top);
        context.lineTo(finishData.x + frameWidth.left, finishData.y + frameWidth.top);
        context.fillStyle = finishData.light || DEFAULT_FINISH_LIGHT;
        context.fill();
        context.closePath();
      }
    });

    layerObjects.addSprite(finishLight);

    if (!finishData.color) {
      finishData.background = DEFAULT_FINISH_COLOR;
    }

    createCollectible(finishData, frameWidth);
  }


  var UIControls = {
    elButtons: [],

    init: function init() {
      this.elButtons = document.querySelectorAll('*[data-property]');

      document.getElementById('rotate-left').addEventListener('click', function() {
        rotateGravity(90);
      });
      document.getElementById('rotate-right').addEventListener('click', function() {
        rotateGravity(-90);
      });

      for (var i = 0, el; el = this.elButtons[i++];) {
        el.addEventListener('mousedown', this.onControlButtonClick);
      }

      window.addEventListener('mouseup', this.stopAllControls.bind(this));

      window.addEventListener('keydown', this.onKeyPress);
    },

    onControlButtonClick: function onControlButtonClick(e) {
      e.target.classList.add('active');
      Player[e.target.dataset.property] = true;
    },

    stopAllControls: function stopAllControls(e) {
      for (var i = 0, el; el = this.elButtons[i++];) {
        if (el.classList.contains('active')) {
          el.classList.remove('active')
          Player[el.dataset.property] = false;
        }
      }
    },

    onKeyPress: function onKeyPress(e) {
      var keyCode = e.keyCode;
      switch (keyCode) {
        case 68: // A
          userRotateGravity(-90);
          break;
        case 65: // D
          userRotateGravity(90);
          break;
        case 70: //F
          layerObjects.addSprite(new Movable({
            x: Player.sprite.topLeft.x,
            y: Player.sprite.topLeft.y,
            width: Player.sprite.width,
            height: Player.sprite.height
          }));
          break;
      }
    }
  }

  function onKeyIntroTutorial(e) {
    if (Player.isMovingRight || Player.isMovingLeft || Player.isJumping) {
      Player.stopAllMovement();

      Dialog.show({
        'id': 'intro-tutorial',
        'text': utils.l10n.get('intro-tutorial'),
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
              Player.stopAllMovement();
              
              window.setTimeout(onDone, 500);
            }, duration);
          }, 800);
        },
        'onEnd': function onDialogEnd() {
          Player.set('didIntroTutorial', true);
          document.body.classList.remove('intro-false');
          document.body.classList.add('intro-true');
          window.removeEventListener('keydown', onKeyIntroTutorial);
        }
      });
    }
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
    var newAngle = (currentGravityAngle - angle) % 360;

    if (Math.abs(newAngle) > Player.get('maxRotation')) {
      return;
    }

    if (currentLevelData.rotationLimit) {
      var max = currentLevelData.rotationLimit.max,
          min = currentLevelData.rotationLimit.min;

      if (max !== undefined && newAngle > currentLevelData.rotationLimit.max) {
        return;
      }
      if (min !== undefined && newAngle < currentLevelData.rotationLimit.min) {
        return;
      }
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
    Player.stopAllMovement();
    Player.disableControl();
    elButton.classList.add('active')
    window.setTimeout(function() {
      Player.enableControl();
      elButton.classList.remove('active')
    }, 700);
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
      dir += 1;
    }
    if (Player.isMovingLeft) {
      dir -= 1;
    }

    if (dir) {
      if (gravityDirection.x) {
        dir *= -1;
      }

      var newAcceleration = gravityDirection.flip().scale(Player.MOVE_SPEED * dir);
      Player.sprite.accelerate(newAcceleration);
    } else {
      Player.sprite.accelerate();
    }
  }

  init();

  // this is just an object used to expose some internal methods and objects
  // used as a scope inside level scripts
  var WRAPPER = {
    loadLevel: loadLevel,
    initLevel: initLevel,
    createPlatform: createPlatform,
    createCollectible: createCollectible,
    setPlayerAllowedRotation: setPlayerAllowedRotation,
    userRotateGravity: userRotateGravity,
    rotateGravity: rotateGravity,
    game: game,
    finishLevel: finishLevel,
    layerBackground: layerBackground,
    layerObjects: layerObjects,
    layerPlayer: layerPlayer
  };
}());