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
      seenLevelIntro = false,

      DEFAULT_WIDTH = 0,
      DEFAULT_HEIGHT = 0,
      DEFAULT_BACKGROUND = '',
      DEFAULT_FINISH_LIGHT = '',
      DEFAULT_FINISH_COLOR = '',

      DEFAULT_PLATFORM_FRICTION_X = 0,
      DEFAULT_PLATFORM_FRICTION_Y = 0,

      DEFAULT_MOVABLE_FRICTION_X = 0,
      DEFAULT_MOVABLE_FRICTION_Y = 0,

      DEATH_AREA_SOUND = '',
      DEATH_SOUND_NUMBER_OF_STEPS = 0,
      DEATH_SOUND_DISTANCE_STEP = 0,

      TIME_BEFORE_LEVEL_INTRO = 0,

      NUMBER_OF_LEVELS = 0,

      SPRITE_PRESETS = {},

      // used for CSS rotation of the game
      currentGravityAngle = 0;

  // load external game config file before starting anything
  function loadGameConfig() {
    var request = new XMLHttpRequest();
    request.open('GET', 'data/game.json', true);
    request.responseType = 'json';
    request.onload = function onGameConfigLoad() {
      populateFromConfig(request.response);
      loadTexts();
    };
    request.send();
  }

  // load all game config into local variables
  function populateFromConfig(config) {
    document.body.style.background = config.BACKGROUND;
    NUMBER_OF_LEVELS = config.NUMBER_OF_LEVELS;

    DEFAULT_WIDTH = config.WIDTH;
    DEFAULT_HEIGHT = config.HEIGHT;

    DEFAULT_BACKGROUND = config.DEFAULT_BACKGROUND;
    DEFAULT_FINISH_LIGHT = config.DEFAULT_FINISH_LIGHT;
    DEFAULT_FINISH_COLOR = config.DEFAULT_FINISH_COLOR;

    DEFAULT_PLATFORM_FRICTION_X = config.DEFAULT_PLATFORM_FRICTION_X;
    DEFAULT_PLATFORM_FRICTION_Y = config.DEFAULT_PLATFORM_FRICTION_Y;

    DEFAULT_MOVABLE_FRICTION_X = config.DEFAULT_MOVABLE_FRICTION_X;
    DEFAULT_MOVABLE_FRICTION_Y = config.DEFAULT_MOVABLE_FRICTION_Y;

    DEATH_AREA_SOUND = config.DEATH_AREA_SOUND;
    DEATH_SOUND_NUMBER_OF_STEPS = config.DEATH_SOUND_NUMBER_OF_STEPS;
    DEATH_SOUND_DISTANCE_STEP = config.DEATH_SOUND_DISTANCE_STEP;

    TIME_BEFORE_LEVEL_INTRO = config.TIME_BEFORE_LEVEL_INTRO;

    for (var k in config.SPRITE_PRESETS) {
      SPRITE_PRESETS[k] = config.SPRITE_PRESETS[k];
    }
    for (var k in config.BUBBLES) {
      Bubbles[k] = config.BUBBLES[k];
    }
    for (var k in config.PLAYER) {
      Player[k] = config.PLAYER[k];
    }
    for (var k in config.DIALOG) {
      Dialog[k] = config.DIALOG[k];
    }
  }

  function loadTexts() {
    utils.l10n.init({
      'onReady': function onTextsLoad() {
        initPlayer();
      }
    });
  }

  function initPlayer() {
    Player.init({
      'onCollisionStart': onPlayerCollisionStart,
      'onCollisionEnd': onPlayerCollisionEnd,
      'onSettingsLoad': function onSettingsLoad() {
        init();
      }
    });
  }

  // initialize game components
  function init() {
    elContainer = document.getElementById('container');
    elCanvases = document.getElementById('canvases');

    elContainer.style.cssText += 
      'width:' + DEFAULT_WIDTH + 'px;' +
      'height:' + DEFAULT_HEIGHT + 'px;' +
      'margin:' + -DEFAULT_HEIGHT/2 + 'px 0 0 ' + -DEFAULT_WIDTH/2 + 'px;';

    SoundManager.init();

    initMenu();

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

    // UI controls event listeners etc.
    UIControls.init();

    // first intro text
    if (!Player.get('didIntroTutorial')) {
      window.addEventListener('keydown', onKeyIntroTutorial);
    }

    if (!Player.get('didDieTutorial')) {
      window.addEventListener('player-die', onPlayerDie);
    }

    // when a level is ready - start the game loop
    window.addEventListener('levelReady', onLevelReady);

    SoundManager.load({
      'water': {
        'src': 'sounds/water',
        'loop': true
      }
    });

    // load the first level
    if (/SKIP_MENU/.test(window.location.href)) {
      loadLevel((window.location.href.match(/LEVEL=(\d+)/) || [])[1] || Player.get('maxLevel'));
    } else {
      MainMenu.show();
    }
  }

  function onPlayerDie() {
    window.removeEventListener('player-die', onPlayerDie);
    
    Dialog.show({
      'id': 'die-tutorial',
      'text': utils.l10n.get('die-tutorial'),
      'sprite': Player.sprite
    });

    Player.set('didDieTutorial', true);
  }

  function onKeyToggleMenu(e) {
    var key = e.keyCode;

    if (key === 27) {
      if (MainMenu.isVisible) {
        if (currentLevelData) {
          MainMenu.hide();
        }
      } else {
        MainMenu.show();
      }
    } else if (key === 13) {
      if (MainMenu.isVisible) {
        MainMenu.clickOn('new');
      }
    }
  }

  function initMenu() {
    MainMenu.init({
      'elContainer': document.body,
      'onShow': onMenuShown,
      'onHide': onMenuHidden,
      'options': [
        {
          'id': 'new',
          'type': 'click',
          'onSelect': function onMenuContinueClick() {
            MainMenu.hide();

            if (currentLevelData) {
              game.start();
            } else {
              window.setTimeout(function() {
                loadLevel((window.location.href.match(/LEVEL=(\d+)/) || [])[1] || Player.get('maxLevel'));
              }, 200);
            }
          }
        },
        {'type': 'separator'},
        {
          'id': 'sound',
          'type': 'toggle',
          'value': Player.get('settings-sound'),
          'onChange': function onSoundSettingChange(value) {
            if (value === 'on') {
              SoundManager.enable();
            } else {
              SoundManager.disable();
            }
          }
        },
        {
          'id': 'volume',
          'type': 'range',
          'min': 0,
          'max': 1,
          'step': 0.01,
          'value': Player.get('settings-volume'),
          'onChange': function onVolumeSettingChange(value) {
            SoundManager.setGlobalVolume(value);
          }
        },
        {
          'id': 'fullscreen',
          'type': 'toggle',
          'value': 'off',
          'onChange': function onFullscreenSettingChange(value) {
            try {
              if (value === 'on') {
                (document.body.webkitRequestFullScreen ||
                 document.body.mozRequestFullScreen ||
                 document.body.requestFullScreen
                  ).call(document.body, document.body.ALLOW_KEYBOARD_INPUT);
              } else {
                (document.webkitCancelFullScreen ||
                 document.mozCancelFullScreen ||
                 document.cancelFullScreen).call(document);
              }
            } catch(ex) {
              console.warn('fullscreen error', ex);
            }
          }
        }
      ],
      // whenever changing any setting - update the user's storage
      // make settings persistent
      'onChange': function onMenuOptionChange(id, value) {
        Player.set('settings-' + id, value);
      }
    });

    var elBubbling = document.createElement('div');
    elBubbling.className = 'bubbling';
    elBubbling.innerHTML = '<canvas></canvas>';
    MainMenu.el.appendChild(elBubbling);

    // ESC key to toggle menu
    window.addEventListener('keydown', onKeyToggleMenu);
  }

  function onMenuShown() {
    game.stop();

    var playerLevel = Math.min(Player.get('maxLevel') || 1, NUMBER_OF_LEVELS),
        isNewGame = playerLevel === 1 && !currentLevelData,
        textKey = 'menu-option-' + (isNewGame? 'new' : 'continue');

    MainMenu.setOptionText('new', utils.l10n.get(textKey, {'level': playerLevel}));

    var elBubbling = MainMenu.el.querySelector('.bubbling');
    if (!elBubbling) {
      return;
    }
    var elCanvas = elBubbling.querySelector('canvas');
    if (!elCanvas) {
      return;
    }

    MainMenu.drawOn = {
      context: elCanvas.getContext('2d'),
      lastUpdate: Date.now(),

      background: SPRITE_PRESETS.death.background,
      topLeft: {
        x: 0,
        y: 0
      },
      update: Bubbles.update,
      draw: Bubbles.draw
    };

    onResizeWhileMenuVisible();

    window.addEventListener('resize', onResizeWhileMenuVisible);

    window.requestAnimationFrame(menuLoop);
  }

  function onMenuHidden() {
    window.removeEventListener('resize', onResizeWhileMenuVisible);

    if (currentLevelData) {
      game.start();
    }
  }

  function onResizeWhileMenuVisible() {
    var elCanvas = (MainMenu.drawOn || {}).context.canvas,
        elBubbling = elCanvas.parentNode;

    elCanvas.width = MainMenu.drawOn.width = elBubbling.offsetWidth;
    elCanvas.height = MainMenu.drawOn.height = elBubbling.offsetHeight;
    MainMenu.drawOn.topLeft.y = MainMenu.drawOn.height - 10;

  }

  function menuLoop() {
    if (!MainMenu.isVisible) {
      return;
    }

    var now = Date.now(),
        dt = (now - MainMenu.drawOn.lastUpdate) / 1000,
        pseudoSprite = MainMenu.drawOn;

    pseudoSprite.update(dt);
    pseudoSprite.draw(pseudoSprite.context);

    MainMenu.drawOn.lastUpdate = now;
    raf = window.requestAnimationFrame(menuLoop);
  }

  // create the sprite layers - ordered by z-index
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

    WRAPPER.layerBackground = layerBackground;
    WRAPPER.layerPlayer = layerPlayer;
    WRAPPER.layerObjects = layerObjects;
  }

  // an event called when a level is ready to begin
  // if a level loads an external script - it should fire this event
  function onLevelReady(e) {
    var levelObject = (e.detail || {}).level || {};
    CurrentLevel = levelObject;

    document.body.classList.remove('level-loading');
    document.body.classList.add('level-ready');

    window.setTimeout(game.start.bind(game), 50);
  }

  // next level
  function loadNextLevel() {
    currentLevel++;
    loadLevel();
  }

  // load the current level's data and create it
  function loadLevel(level) {
    game.stop();

    document.body.classList.add('level-loading');
    document.body.classList.remove('level-ready');

    !level && (level = currentLevel);
    if (level > NUMBER_OF_LEVELS) {
      level = NUMBER_OF_LEVELS;
    }

    currentLevel = level;
    seenLevelIntro = false;

    clearLevel();

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

  function clearLevel() {
    layerBackground.clear();
    layerObjects.clear();
    layerPlayer.clear();
  }

  // after loading a level, create everything - platforms, sprites,
  // position player, etc.
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
      'background': DEFAULT_FINISH_COLOR,
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
    Player.enableControl();


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


    /* --------------- SHOW LEVEL TUTORIAL --------------- */
    var levelText = utils.l10n.get('level-' + currentLevel);
    // game's first introduction
    if (levelText && !seenLevelIntro) {
      Player.stopAllMovement();
      Player.disableControl();

      window.setTimeout(function() {
        seenLevelIntro = true;
        Dialog.show({
          'id': 'level-' + currentLevel,
          'text': levelText,
          'sprite': Player.sprite,
          'onEnd': function onDialogEnd() {
            Player.enableControl();
          }
        });
      }, TIME_BEFORE_LEVEL_INTRO);
    }


    /* --------------- LOAD SPECIAL GAME SCRIPT --------------- */
    if (currentLevelData.script) {
      var elScript = document.createElement('script');
      elScript.src = currentLevelData.script;
      document.body.appendChild(elScript);
    } else {
      // Game Ready!
      var eventReady = new CustomEvent('levelReady');
      window.dispatchEvent(eventReady);
    }
  }

  // restart current level - return everything to its original place
  function restartLevel() {
    clearLevel();
    initLevel();

    var e = new CustomEvent('player-die');
    window.dispatchEvent(e);
  }

  // complete level
  function finishLevel() {
    var nextLevel = currentLevel + 1,
        userMaxLevel = Player.get('maxLevel');

    if (!userMaxLevel || userMaxLevel < nextLevel) {
      Player.set('maxLevel', nextLevel);
    }
    
    rotateGravity(currentGravityAngle);
    loadNextLevel();
  }

  // whenever a player collides with a different sprite
  // checks for general things - death, win, points, etc.
  function onPlayerCollisionStart(sprite, direction) {
    var type = sprite.type;

    if (onPlayerCollisionWithStart[type]) {
      onPlayerCollisionWithStart[type].apply(this, arguments)
    }

    if (sprite.data.sound) {
      SoundManager.setVolume(sprite.data.sound, sprite.data.volume);
      SoundManager.play(sprite.data.sound);
    }

    if (sprite.data.collisionCallback) {
      var onCollision = ((CurrentLevel || {}).actions || {})[sprite.data.collisionCallback];
      if (onCollision) {
        onCollision.apply(WRAPPER, arguments);
      } else {
        console.warn('CANT FIND CALLBACK FOR COLLISION', arguments)
      }
    }
  }

  function onPlayerCollisionEnd(sprite, direction) {
    var type = sprite.type;
    if (onPlayerCollisionWithEnd[type]) {
      onPlayerCollisionWithEnd[type].apply(this, arguments)
    }

    if (sprite.data.sound) {
      var sounds = {},
          soundToStop = sprite.data.sound,
          collisions = Player.sprite.collisions,
          collisionSprite;

      for (var id in collisions) {
        collisionSprite = collisions[id].sprite;

        if (collisionSprite.data.sound && collisionSprite.data.sound === soundToStop) {
          SoundManager.setVolume(soundToStop, collisionSprite.data.volume);
          return;
        }
      }

      SoundManager.stop(sprite.data.sound);
    }
  }

  // general collisions handler
  var onPlayerCollisionWithStart = {
    'finish': function onPlayerCollisionWithFinish(sprite, direction) {
      finishLevel();
    },
    'death': function onPlayerCollisionWithDeath(sprite, direction) {
      Player.disableControl();
      Player.stopAllMovement();

      var volume = 1.05;
      function lowerVolume() {
        volume -= 0.015;

        if (volume <= 0) {
          SoundManager.stop('water');
          window.setTimeout(restartLevel, 250);
        } else {
          SoundManager.setVolume('water', volume);
          window.setTimeout(lowerVolume, 30);
        }
      }
      lowerVolume();

    },
    'score': function onPlayerCollisionWithScore(sprite, direction) {
      sprite.layer.removeSprite(sprite);
      console.info('score++')
    }
  };

  var onPlayerCollisionWithEnd = {

  };

  function createPlatform(spriteData, frameWidth) {
    var data = getSpriteData(spriteData, {
      'id': 'platform_' + Math.random(),
      'x': 0,
      'y': 0,
      'type': 'platform',
      'friction': new Vector(DEFAULT_PLATFORM_FRICTION_X, DEFAULT_PLATFORM_FRICTION_Y)
    });

    if (frameWidth) {
      data.x += frameWidth.left;
      data.y += frameWidth.top;
    }

    layerBackground.addSprite(new Sprite(data));
  }

  function createMovable(spriteData, frameWidth) {
    var data = getSpriteData(spriteData, {
      'id': 'movable_' + Math.random(),
      'x': 0,
      'y': 0,
      'type': 'movable',
      'maxVelocity': new Vector(4, 50000),
      'friction': new Vector(DEFAULT_MOVABLE_FRICTION_X, DEFAULT_MOVABLE_FRICTION_Y)
    });

    data.x += frameWidth.left;
    data.y += frameWidth.top;

    layerObjects.addSprite(new Sprite(data));
  }

  function createCollectible(spriteData, frameWidth) {
    var data = getSpriteData(spriteData, {
      'id': 'collectible_' + Math.random(),
      'x': 0,
      'y': 0,
      'type': 'collectible',
      'collisionable': true,
      'friction': new Vector(0, 1)
    });

    data.x += frameWidth.left;
    data.y += frameWidth.top;

    var collectible = new Sprite(data);

    if (data.type === 'death') {
      collectible.update = Bubbles.update;
      collectible.draw = Bubbles.draw;

      if (DEATH_AREA_SOUND) {
        for (var i = 1, sizeStep; i <= DEATH_SOUND_NUMBER_OF_STEPS; i++) {
          sizeStep = DEATH_SOUND_DISTANCE_STEP * i;

          var spriteData = getSpriteData({
            'x': data.x - sizeStep,
            'y': data.y - sizeStep,
            'width': data.width + sizeStep * 2,
            'height': data.height + sizeStep * 2,
            'type': 'death-ambient',
            'collisionable': true,
            'data': {
              'sound': DEATH_AREA_SOUND,
              'volume': 1 - (i / (DEATH_SOUND_NUMBER_OF_STEPS + 1))
            }
          });

          layerObjects.addSprite(new Sprite(spriteData));
        }
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
        platforms.push({
          'x': finishData.x + finishData.width + frameWidth.left,
          'y': finishData.y + frameWidth.top,
          'width': frameWidth.right,
          'height': finishData.height
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
    var finishLight = new Sprite();
    finishLight.draw = function drawMethod(context) {
      context.beginPath();
      context.moveTo(finishData.x + frameWidth.left, finishData.y + finishData.height + frameWidth.top);
      context.lineTo(finishData.x + frameWidth.left - finishData.height*1.25, finishData.y + finishData.height + frameWidth.top);
      context.lineTo(finishData.x + frameWidth.left, finishData.y + frameWidth.top);
      context.fillStyle = finishData.light || DEFAULT_FINISH_LIGHT;
      context.fill();
      context.closePath();
    };

    layerObjects.addSprite(finishLight);

    createCollectible(finishData, frameWidth);
  }

  function showCantRotateMessage() {
    document.body.classList.add('cant-rotate');

    Dialog.show({
      'id': 'cant-rotate',
      'text': utils.l10n.get('cant-rotate'),
      'sprite': Player.sprite,
      'onEnd': function onEnd() {
        document.body.classList.remove('cant-rotate');
      }
    });
  }


  function getSpriteData(data, defaults) {
    var newData = {};

    // take the defaults passed to the function
    if (defaults) {
      for (var k in defaults) {
        newData[k] = defaults[k];
      }
    }

    // override/add from the preset for the type
    var type = data.type || newData.type,
        typePreset = SPRITE_PRESETS[type];
    if (typePreset) {
      for (var k in typePreset) {
        newData[k] = typePreset[k];
      }
    }

    // lastly override everything with the actual data for the sprite
    fillWith(newData, {}, data);

    return newData;
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
          playerRotateGravity(-90);
          break;
        case 65: // D
          playerRotateGravity(90);
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
  function playerRotateGravity(angle) {
    var newAngle = (currentGravityAngle - angle) % 360;

    // if player just can't do it yet - don't show a message
    if (Math.abs(newAngle) > Player.get('maxRotation')) {
      return;
    }

    // if player is limited by something - show a message
    if (currentLevelData.rotationLimit) {
      var max = currentLevelData.rotationLimit.max,
          min = currentLevelData.rotationLimit.min;

      if (
          (max !== undefined && newAngle > currentLevelData.rotationLimit.max) ||
          (min !== undefined && newAngle < currentLevelData.rotationLimit.min)
         ) {
        showCantRotateMessage();
        return;
      }
    }

    rotateGravity(angle);
  }

  function rotateGravity(angle) {
    if (!angle) {
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
    var gravityDirection = window.GRAVITY_DIRECTION,
        playerSprite = Player.sprite;

    // jump according to gravity
    if (Player.isJumping && Player.sprite.resting) {
      playerSprite.applyForce(gravityDirection.scale(-Player.JUMP_FORCE * dt));
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
      playerSprite.accelerate(newAcceleration);
    } else {
      playerSprite.accelerate();
    }

    if (playerSprite.bottomLeft.y < 0 ||
        playerSprite.topLeft.y > game.height ||
        playerSprite.bottomRight.x < 0 ||
        playerSprite.topLeft.x > game.width) {
      restartLevel();
    }
  }

  loadGameConfig();

  // for death areas
  var Bubbles = {
    SIZE_MIN: 0,
    SIZE_MAX: 0,
    SPEED_MIN: 0,
    SPEED_MAX: 0,
    MARGIN_MIN: 0,
    MARGIN_MAX: 0,
    COLOR_MIN: 0,
    COLOR_MAX: 0,

    POP_MIN: 0,
    POP_MAX: 0,
    POP_OPACITY_STEP_MIN: 0,
    POP_OPACITY_STEP_MAX: 0,

    GENERATION_MIN: 0,
    GENERATION_MAX: 0,

    update: function updateBubble(dt) {
      !this.bubblesConfig && (this.bubblesConfig = {
        timeSinceGeneration: 0,
        timeToGenerate: 0,
        bubbles: []
      });

      var bubbles = this.bubblesConfig.bubbles;

      this.bubblesConfig.timeSinceGeneration += dt;

      if (this.bubblesConfig.timeSinceGeneration >= this.bubblesConfig.timeToGenerate) {
        bubbles.push(Bubbles.createBubble(this));
        this.bubblesConfig.timeSinceGeneration = 0;
        this.bubblesConfig.timeToGenerate = utils.random(Bubbles.GENERATION_MIN, Bubbles.GENERATION_MAX);
      }


      for (var i = 0, bubble; bubble = bubbles[i++];) {
        if (bubble.pop) {
          bubble.size += bubble.popIncrement;
          bubble.opacity -= bubble.popOpacityStep;

          if (bubble.opacity < 0) {
            bubbles.splice(i - 1, 1);
            i--;
          }
        } else {
          bubble.y -= bubble.speed * dt;

          if (bubble.y < this.topLeft.y - bubble.margin) {
            bubble.pop = true;
          }
        }
      }

      return true;
    },

    draw: function drawBubble(context) {
      var pos = this.topLeft;

      context.clearRect(0, 0, this.width, this.height);

      context.fillStyle = this.background;
      context.fillRect(Math.round(pos.x), Math.round(pos.y), this.width, this.height);

      var bubbles = (this.bubblesConfig || {}).bubbles;
      for (var i = 0, bubble; bubble = bubbles[i++];) {
        var size = bubble.size;

        context.globalAlpha = bubble.opacity;
        context.strokeStyle = bubble.color;
        context.strokeRect(bubble.x - size/2, bubble.y - size/2, bubble.size, bubble.size);
        context.globalAlpha = 1;
      }
    },

    createBubble: function createBubble(sprite) {
      var size = utils.random(Bubbles.SIZE_MIN, Bubbles.SIZE_MAX),
          speed = utils.random(Bubbles.SPEED_MIN, Bubbles.SPEED_MAX),
          margin = utils.random(Bubbles.MARGIN_MIN, Bubbles.MARGIN_MAX),
          popIncrement = utils.random(Bubbles.POP_MIN, Bubbles.POP_MAX),
          popOpacityStep = utils.random(Bubbles.POP_OPACITY_STEP_MIN, Bubbles.POP_OPACITY_STEP_MAX),
          color = 'rgba(0, ' + Math.round(utils.random(Bubbles.COLOR_MIN, Bubbles.COLOR_MAX)) + ', 0, 1)';

      margin = Math.min(margin, sprite.height / 2);

      var bubble = {
        'x': (Math.random() * (sprite.width - size*2)) + sprite.topLeft.x + size,
        'y': (Math.random() * (sprite.height - size*2)) + sprite.topLeft.y + size,
        'size': size,
        'speed': speed,
        'margin': margin,
        'color': color,
        'popIncrement': popIncrement,
        'popOpacityStep': popOpacityStep,
        'opacity': 1
      };

      return bubble;
    }
  };

  // this is just an object used to expose some internal methods and objects
  // used as a scope inside level scripts
  var WRAPPER = {
    loadLevel: loadLevel,
    initLevel: initLevel,
    createPlatform: createPlatform,
    createCollectible: createCollectible,
    setPlayerAllowedRotation: setPlayerAllowedRotation,
    playerRotateGravity: playerRotateGravity,
    rotateGravity: rotateGravity,
    game: game,
    finishLevel: finishLevel,
    layerBackground: layerBackground,
    layerObjects: layerObjects,
    layerPlayer: layerPlayer
  };
}());