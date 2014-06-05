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
      firstThud = true,

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
      TIME_BEFORE_FINAL_TEXT = 0,

      NUMBER_OF_LEVELS = 0,

      SPRITE_PRESETS = {},

      URL = window.location.href,

      DEATHS = {
        POISON: 'poison',
        OUT_OF_BOUNDS: 'bounds'
      },

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
    window.CONFIG = config;

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
    TIME_BEFORE_FINAL_TEXT = config.TIME_BEFORE_FINAL_TEXT;

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

    document.body.classList.add('rotation-0');

    elContainer.style.cssText += 
      'width:' + DEFAULT_WIDTH + 'px;' +
      'height:' + DEFAULT_HEIGHT + 'px;' +
      'margin:' + -DEFAULT_HEIGHT/2 + 'px 0 0 ' + -DEFAULT_WIDTH/2 + 'px;';

    SoundManager.init();

    MenuHandler.init();

    Dialog.init({
      'elContainer': document.getElementById('dialogs')
    });

    game = new Game({
      'el': elCanvases,
      'width': DEFAULT_WIDTH,
      'height': DEFAULT_HEIGHT,
      'onBeforeTick': gameTick
    });

    WRAPPER.game = game;
    window.game = game;

    // create all sprite layers - background, player, etc.
    createLayers();

    // UI controls event listeners etc.
    UIControls.init();

    // first intro text
    if (!Player.get('didIntroTutorial')) {
      window.addEventListener('keydown', onKeyIntroTutorial);
    }

    // all of the death tutorials
    // set to true only once all death types have happened and their tutotrials shown
    if (!Player.get('didDeathTutorials')) {
      window.addEventListener('player-die', onPlayerDie);
    }

    // when a level is ready - start the game loop
    window.addEventListener('levelReady', onLevelReady);

    // load all sounds
    SoundManager.load({
      'water': {
        'src': 'sounds/water',
        'loop': true
      },
      'menu': {
        'src': 'sounds/menu',
        'volume': 0.6
      },
      'score': {
        'src': 'sounds/score'
      },
      'player_land': {
        'src': 'sounds/player_land.wav',
        'volume': 0.6
      }
    });

    if (/LEVEL_EDITOR/.test(URL)) {
      var elScript = document.createElement('script');
      elScript.src = 'js/LevelEditor.js';
      elScript.type = 'text/javascript';
      elScript.onload = function() {
        LevelEditor.init({
          'game': WRAPPER,
          'elUI': document.getElementById('controls')
        });

        LevelEditor.begin();
      };
      document.body.appendChild(elScript);
    } else {
      // load the first level
      if (/SKIP_MENU/.test(URL)) {
        loadLevel((URL.match(/LEVEL=(\d+)/) || [])[1] || Player.get('maxLevel'));
      } else {
        MainMenu.show();
      }
    }
  }

  function onPlayerDie(e) {
    var cause = (e.detail || {}).cause,
        key = 'tutorial-die-' + cause,
        sawAllTutorials = true;

    
    if (!Player.get(key)) {
      Dialog.show({
        'id': 'die-tutorial',
        'text': utils.l10n.get(key),
        'sprite': Player.sprite
      });

      Player.set(key, true);
    }

    for (var deathCause in DEATHS) {
      key = 'tutorial-die-' + deathCause;
      sawAllTutorials = sawAllTutorials && Player.get(key);
    }

    if (sawAllTutorials) {
      Player.set('didDeathTutorials', true);
      window.removeEventListener('player-die', onPlayerDie);
    }
  }

  var MenuHandler = {
    init: function init() {
      this._tick = this.tick.bind(this);
      this._onResize = this.onResize.bind(this);

      MainMenu.init({
        'elContainer': document.body,
        'onShow': this.onShow.bind(this),
        'onHide': this.onHide.bind(this),
        'options': [
          {
            'id': 'new',
            'type': 'click',
            'onSelect': this.options.onNew
          },
          {'type': 'separator'},
          {
            'id': 'sound',
            'type': 'toggle',
            'value': Player.get('settings-sound'),
            'onChange': this.options.onSound
          },
          {
            'id': 'volume',
            'type': 'range',
            'min': 0,
            'max': 1,
            'step': 0.01,
            'value': Player.get('settings-volume'),
            'onChange': this.options.onVolume
          },
          {
            'id': 'controls',
            'type': 'text',
            'value': '<dl>' +
                        '<dt>Move Left</dt>' +
                        '<dd><span class="key">&#8592;</span></dd>' +
                        '<dt>Move Right</dt>' +
                        '<dd><span class="key">&#8594;</span></dd>' +
                        '<dt>Jump</dt>' +
                        '<dd><span class="key">&#8593;</span><span> or </span><span class="key">SPACEBAR</span></dd>' +
                        '<dt>Rotate Gravity Left</dt>' +
                        '<dd><span class="key">A</span></dd>' +
                        '<dt>Rotate Gravity Right</dt>' +
                        '<dd><span class="key">D</span></dd>' +
                        '<dt>Main Menu</dt>' +
                        '<dd><span class="key">Esc</span></dd>' +
                      '</dl>',
            'onSelect': this.options.onControls
          },
          {
            'id': 'fullscreen',
            'type': 'toggle',
            'value': 'off',
            'onChange': this.options.onFullscreen
          }
        ],
        // whenever changing any setting - update the user's storage
        // make settings persistent
        'onChange': function onMenuOptionChange(id, value) {
          SoundManager.play('menu');
          Player.set('settings-' + id, value);
        }
      });

      // ESC key to toggle menu
      window.addEventListener('keydown', this.onKeyPress);
    },

    onKeyPress: function onKeyPress(e) {
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
    },

    options: {
      onNew: function onNew() {
        SoundManager.play('menu');
        MainMenu.hide();

        if (currentLevelData) {
          game.start();
        } else {
          window.setTimeout(function() {
            loadLevel((URL.match(/LEVEL=(\d+)/) || [])[1] || Player.get('maxLevel'));
          }, 200);
        }
      },

      onSound: function onSound(value) {
        if (value === 'on') {
          SoundManager.enable();
        } else {
          SoundManager.disable();
        }
      },

      onVolume: function onVolume(value) {
        SoundManager.setGlobalVolume(value);
      },

      onControls: function onControls() {
        SoundManager.play('menu');
      },

      onFullscreen: function onFullscreen(value) {
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
    },

    tick: function tick() {
      if (!MainMenu.isVisible) {
        return;
      }

      var now = Date.now(),
          dt = (now - this.lastUpdate) / 1000;

      this.sprite.update(dt);
      this.sprite.draw(this.context);

      this.lastUpdate = now;
      this.raf = window.requestAnimationFrame(this._tick);
    },

    onShow: function onShow() {
      game.stop();

      var playerLevel = Math.min(Player.get('maxLevel') || 1, NUMBER_OF_LEVELS),
          isNewGame = playerLevel === 1 && !currentLevelData,
          textKey = 'menu-option-' + (isNewGame? 'new' : 'continue');

      MainMenu.setOptionText('new', utils.l10n.get(textKey, {'level': playerLevel}));

      var elCanvas = MainMenu.el.querySelector('.bubbling canvas');
      if (!elCanvas) {
        var elBubbling = document.createElement('div');
        elBubbling.className = 'bubbling';
        elBubbling.innerHTML = '<canvas></canvas>';
        MainMenu.el.appendChild(elBubbling);

        elCanvas = elBubbling.querySelector('canvas');
      }

      this.context = elCanvas.getContext('2d');
      this.lastUpdate = Date.now();

      this.sprite = {
        background: SPRITE_PRESETS.death.background,
        topLeft: {
          x: 0,
          y: 0
        },
        update: Bubbles.update,
        draw: Bubbles.draw
      };

      // handle resize to change the sprite width
      this.onResize();
      window.addEventListener('resize', this._onResize);

      // start the loop (for the bubbles animation)
      window.requestAnimationFrame(this._tick);
    },

    onHide: function onHide() {
      window.removeEventListener('resize', this._onResize);

      if (currentLevelData) {
        game.start();
      }
    },

    onResize: function onResize() {
      var elCanvas = this.context.canvas,
          elBubbling = elCanvas.parentNode;

      elCanvas.width = this.sprite.width = elBubbling.offsetWidth;
      elCanvas.height = this.sprite.height = elBubbling.offsetHeight;
      this.sprite.topLeft.y = this.sprite.height - 10;
    }
  };

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

    window.setTimeout(function() {
      game.start();

      window.dispatchEvent(new CustomEvent('gameStart', {
        'detail': {
          'game': WRAPPER
        }
      }));
    }, 50);
  }

  // next level
  function loadNextLevel() {
    currentLevel++;

    game.stop();

    if (currentLevel > NUMBER_OF_LEVELS) {
      hideLevel();
      finishGame(loadLevel);
    } else {
      loadLevel();
    }
  }

  // load the current level's data and create it
  function loadLevel(level) {
    !level && (level = currentLevel);
    level = level * 1;

    hideLevel();

    currentLevel = Math.min(level, NUMBER_OF_LEVELS + 1);

    var url = 'data/levels/' + (currentLevel > NUMBER_OF_LEVELS? 'final' : level) + '.json',
        request = new XMLHttpRequest();

    request.open('GET', url, true);
    request.responseType = 'json';
    request.onload = function onLevelDataLoad() {
      initLevel(request.response);
    };

    request.send();
  }

  function hideLevel() {
    document.body.classList.add('level-loading');
    document.body.classList.remove('level-ready');

    seenLevelIntro = false;
    firstThud = true;
    clearLevel();
  }

  function clearLevel() {
    layerBackground.clear();
    layerObjects.clear();
    layerPlayer.clear();
  }

  function finishGame(callback) {
    window.setTimeout(function() {
      Dialog.show({
        'id': 'final',
        'text': utils.l10n.get('final'),
        'onEnd': callback
      });
    }, TIME_BEFORE_FINAL_TEXT);
  }

  // after loading a level, create everything - platforms, sprites,
  // position player, etc.
  function initLevel(levelData) {
    if (!levelData) {
      return;
    }

    currentLevelData = levelData;

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
      'id': 'finish',
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

    currentLevelData.frameWidth = frameWidth;

    /* --------------- PLAYER POSITION --------------- */
    var playerStartPosition = currentLevelData.start || {};
    // x = 0
    if (!playerStartPosition.hasOwnProperty('x')) {
      playerStartPosition.x = frameWidth.left;
    }
    // y = on top of the bottom frame
    if (!playerStartPosition.hasOwnProperty('y')) {
      playerStartPosition.y = game.height - frameWidth.bottom - ((Player.sprite || currentLevelData.player || {}).height || Player.HEIGHT);
    }
    if (/%/.test(playerStartPosition.x)) {
      var percent = ('' + playerStartPosition.x).match(/(\d+)%/)[1];
      playerStartPosition.x = (game.width * percent / 100);
    }
    if (/%/.test(playerStartPosition.y)) {
      var percent = ('' + playerStartPosition.y).match(/(\d+)%/)[1];
      playerStartPosition.y = (game.height * percent / 100);
    }

    var playerCreationData = {
      'x': playerStartPosition.x,
      'y': playerStartPosition.y
    };
    if (Player.sprite) {
      playerCreationData.velocity = Player.sprite.velocity;
      playerCreationData.acceleration = Player.sprite.acceleration;
    }

    if (currentLevelData.player) {
      for (var k in currentLevelData.player) {
        playerCreationData[k] = currentLevelData.player[k];
      }
    }

    Player.createSprite(playerCreationData);
    layerPlayer.addSprite(Player.sprite);
    Player.enableControl();


    /* --------------- LEVEL FINISH POINT --------------- */
    if (finishData.width && finishData.height) {
      createFinishArea(finishData, frameWidth);
    }


    /* --------------- LEVEL FRAME BORDER --------------- */
    createFrame(frameWidth, finishData);


    /* --------------- PLATFORMS --------------- */
    if (currentLevelData.platforms) {
      for (var i = 0, spriteData; spriteData = currentLevelData.platforms[i++];) {
        createPlatform(spriteData);
      }
    }

    /* --------------- MOVABLES --------------- */
    if (currentLevelData.movables) {
      for (var i = 0, spriteData; spriteData = currentLevelData.movables[i++];) {
        createMovable(spriteData);
      }
    }

    /* --------------- COLLECTIBLES --------------- */
    if (currentLevelData.collectibles) {
      for (var i = 0, spriteData; spriteData = currentLevelData.collectibles[i++];) {
        createCollectible(spriteData);
      }
    }

    /* --------------- SCORES --------------- */
    // automatically assign ids, to keep track for scoring
    if (currentLevelData.scores) {
      for (var i = 0, spriteData; spriteData = currentLevelData.scores[i++];) {
        spriteData.id = 'score_' + i;
        spriteData.type = 'score';
        createCollectible(spriteData);
      }
    }


    /* --------------- SHOW LEVEL TUTORIAL --------------- */
    if (!/SKIP_LEVEL_DIALOGS/.test(URL)) {
      var levelTextId = (currentLevel > NUMBER_OF_LEVELS)? 'final' : currentLevel,
          levelText = utils.l10n.get('level-' + levelTextId);

      // game's first introduction
      if (levelText && !seenLevelIntro) {
        Player.stopAllMovement();
        Player.disableControl();

        window.setTimeout(function() {
          seenLevelIntro = true;
          Dialog.show({
            'id': 'level-' + levelTextId,
            'text': levelText,
            'sprite': Player.sprite,
            'onEnd': function onDialogEnd() {
              Player.enableControl();
            }
          });
        }, TIME_BEFORE_LEVEL_INTRO);
      }
    }


    /* --------------- LOAD SPECIAL GAME SCRIPT --------------- */
    if (currentLevelData.script) {
      var elScript = document.createElement('script');
      elScript.src = currentLevelData.script;
      document.body.appendChild(elScript);
    } else {
      // Game Ready!
      window.dispatchEvent(new CustomEvent('levelReady'));
    }
  }

  // restart current level - return everything to its original place
  function restartLevel(deathCause) {
    clearLevel();
    initLevel(currentLevelData);

    window.dispatchEvent(new CustomEvent('player-die', {
      'detail': {
        'cause': deathCause
      }
    }));
  }

  // complete level
  function finishLevel() {
    var nextLevel = Math.min(currentLevel + 1, NUMBER_OF_LEVELS),
        userMaxLevel = (Player.get('maxLevel') || 1) * 1;

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

    // hitting a platform in the gravity direction ( = resting), play a "thud"
    if (type === 'platform' && direction === window.GRAVITY_DIRECTION_NAME) {
      if (firstThud) {
        firstThud = false;
      } else {
        SoundManager.play('player_land');
      }
    }

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
          window.setTimeout(function() {
            restartLevel(DEATHS.POISON);
          }, 250);
        } else {
          SoundManager.setVolume('water', volume);
          window.setTimeout(lowerVolume, 30);
        }
      }
      lowerVolume();

    },
    'score': function onPlayerCollisionWithScore(sprite, direction) {
      // remove the collected point from the game
      sprite.layer.removeSprite(sprite);

      var keyLevel = 'level-' + currentLevel,
          playerTotalScore = Player.get('totalScore') || 0
          playerScorePerLevel = Player.get('scorePerLevel') || {},
          playerLevelScore = playerScorePerLevel[keyLevel] || {},
          levelScores = currentLevelData.scores || [];

      // make sure the player score map for this level is complete
      // with 'false' for uncollected points
      for (var i = 0, score; score = levelScores[i++];) {
        playerLevelScore[score.id] = playerLevelScore[score.id] || false;
      }

      // play the collecting sound - before checking if its been collected before
      // we want sound indication if the point doesn't count towards the player's
      // total score
      SoundManager.play('score');

      // if the player already collected this point - nothing to do
      if (playerLevelScore[sprite.id]) {
        return;
      }

      // set the currently earned point to true (collected)
      playerLevelScore[sprite.id] = true;

      // copy the data back to the main level score map
      playerScorePerLevel[keyLevel] = playerLevelScore;

      // and save for the user
      Player.set('scorePerLevel', playerScorePerLevel);

      // update the player's total score (sum of all collected points throughout the levels)
      // TODO: maybe remove and just count the 'scorePerLevel' whenever we need?
      Player.set('totalScore', ++playerTotalScore);

      window.dispatchEvent(new CustomEvent('playerScore', {
        'detail': {
          'scoreId': sprite.id
        }
      }));
    }
  };

  var onPlayerCollisionWithEnd = {

  };

  function createPlatform(spriteData, ignoreFrame) {
    var data = getSpriteData(spriteData, {
      'id': 'platform_' + Math.random(),
      'x': 0,
      'y': 0,
      'type': 'platform',
      'friction': new Vector(DEFAULT_PLATFORM_FRICTION_X, DEFAULT_PLATFORM_FRICTION_Y)
    });

    if (!ignoreFrame) {
      data.x += currentLevelData.frameWidth.left;
      data.y += currentLevelData.frameWidth.top;
    }

    var sprite = new Sprite(data);
    layerBackground.addSprite(sprite);
    return sprite;
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

    data.x += currentLevelData.frameWidth.left;
    data.y += currentLevelData.frameWidth.top;

    var sprite = new Sprite(data);
    layerObjects.addSprite(sprite);
    return sprite;
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
    
    data.x += currentLevelData.frameWidth.left;
    data.y += currentLevelData.frameWidth.top;

    var sprite = new Sprite(data);

    if (data.type === 'death') {
      sprite.update = Bubbles.update;
      sprite.draw = Bubbles.draw;

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

    layerObjects.addSprite(sprite);

    return sprite;
  }

  function createFrame(frameWidth, finishData) {
    var platforms = [],
        data;

    if (frameWidth.top) {
      platforms.push({
        'id': 'frame_top',
        'x': 0,
        'y': 0,
        'width': game.width,
        'height': frameWidth.top
      });
    }

    if (frameWidth.bottom) {
      platforms.push({
        'id': 'frame_bottom',
        'x': 0,
        'y': game.height - frameWidth.bottom,
        'width': game.width,
        'height': frameWidth.bottom
      });
    }

    if (frameWidth.left) {
      data = {
        'id': 'frame_left',
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
        'id': 'frame_right',
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
      createPlatform(data, true);
    }
  }

  function createFinishArea(finishData, frameWidth) {
    var finishLight = new Sprite({
      'id': 'finish-light'
    });
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
      this.elButtons = document.querySelectorAll('#controls *[data-property]');

      document.getElementById('gravity-rotate-left').addEventListener('click', function() {
        playerRotateGravity(90);
      });
      document.getElementById('gravity-rotate-right').addEventListener('click', function() {
        playerRotateGravity(-90);
      });

      for (var i = 0, el; el = this.elButtons[i++];) {
        el.addEventListener('mousedown', this.onControlButtonClick);
      }

      window.addEventListener('mouseup', this.stopAllControls.bind(this));

      window.addEventListener('keydown', this.onKeyPress);

      this.PointsCounter.init();
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
    },

    PointsCounter: {
      el: null,
      elTotal: null,

      init: function init() {
        this.el = document.getElementById('levelScores');
        this.elTotal = document.querySelector('#totalScore b');

        if (this.el) {
          window.addEventListener('levelReady', this.onLevelReady.bind(this));
          window.addEventListener('playerScore', this.onPlayerCollectScore.bind(this));
        }

        this.updateTotalScore();
      },

      onLevelReady: function onLevelReady() {
        var levelScores = currentLevelData.scores || [],
            html = '';

        for (var i = 0, score; score = levelScores[i++];) {
          html += '<li data-id="' + score.id + '"></li>';
        }

        this.el.innerHTML = html;

        window.setTimeout(this.showCollectedScores.bind(this), 0);
      },

      showCollectedScores: function showCollectedScores() {
        var playerScorePerLevel = Player.get('scorePerLevel') || {},
            playerLevelScore = playerScorePerLevel['level-' + currentLevel] || {},
            elScore;

        for (var id in playerLevelScore) {
          if (playerLevelScore[id]) {
            elScore = this.el.querySelector('[data-id = "' + id + '"]');
            if (elScore) {
              elScore.classList.add('picked');
            }
          }
        }
      },

      onPlayerCollectScore: function onPlayerCollectScore(e) {
        var scoreId = (e.detail || {}).scoreId,
            el = this.el.querySelector('[data-id = "' + scoreId + '"]');

        if (el) {
          el.classList.add('picked');
        }

        this.updateTotalScore();
      },

      updateTotalScore: function updateTotalScore() {
        this.elTotal.innerHTML = Player.get('totalScore');
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

    currentGravityAngle -= angle;

    // change gravity
    game.setGravity(window.GRAVITY.rotate(angle));

    // rotate game graphics
    elCanvases.style.cssText += '-webkit-transform: rotate(' + currentGravityAngle + 'deg);' +
                                 'transform: rotate(' + currentGravityAngle + 'deg);';

    // add a class according to the new angle, for UI
    var newAngle = currentGravityAngle % 360,
        currentClass = document.body.className,
        elGravityNeedle = document.querySelector('#controls .gravity .needle');

    currentClass = currentClass.replace(/(\s|^)rotation-(-?\d+)/, ' rotation-' + newAngle);
    document.body.className = currentClass;

    if (elGravityNeedle) {
      elGravityNeedle.style.cssText += '-webkit-transform: rotate(' + -currentGravityAngle + 'deg);' +
                                       'transform: rotate(' + -currentGravityAngle + 'deg);';
    }


    // UI indication
    Player.stopAllMovement();
    Player.disableControl();
    window.setTimeout(function() {
      Player.enableControl();
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
      restartLevel(DEATHS.OUT_OF_BOUNDS);
    }
  }

  loadGameConfig();

  // for death areas
  var Bubbles = {
    update: function updateBubble(dt) {
      !this.bubblesConfig && (this.bubblesConfig = {
        timeSinceGeneration: 0,
        timeSinceMegaGeneration: 0,
        timeToGenerate: 0,
        timeToGenerateMega: 0,
        bubbles: []
      });

      //console.log(utils.random(Bubbles.GENERATION_MIN, Bubbles.GENERATION_MAX))

      var bubbles = this.bubblesConfig.bubbles;

      // normal bubbles generation
      this.bubblesConfig.timeSinceGeneration += dt;
      if (this.bubblesConfig.timeSinceGeneration >= this.bubblesConfig.timeToGenerate) {
        bubbles.push(Bubbles.createBubble(this));
        this.bubblesConfig.timeSinceGeneration = 0;
        this.bubblesConfig.timeToGenerate = utils.random(Bubbles.GENERATION_MIN, Bubbles.GENERATION_MAX);
      }

      // mega bubbles
      this.bubblesConfig.timeSinceMegaGeneration += dt;
      if (this.bubblesConfig.timeSinceMegaGeneration >= this.bubblesConfig.timeToGenerateMega) {
        bubbles.push(Bubbles.createBubble(this, true));
        this.bubblesConfig.timeSinceMegaGeneration = 0;
        this.bubblesConfig.timeToGenerateMega = utils.random(Bubbles.GENERATION_MEGA_MIN, Bubbles.GENERATION_MEGA_MAX);
      }


      // update all bubbles
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

    // draw all bubbles
    // note that this is still all under a single sprite!
    draw: function drawBubble(context) {
      var pos = this.topLeft;

      context.clearRect(0, 0, this.width, this.height);

      context.fillStyle = this.background;
      context.fillRect(Math.round(pos.x), Math.round(pos.y), this.width, this.height);

      context.lineWidth = 1;

      var bubbles = (this.bubblesConfig || {}).bubbles;
      for (var i = 0, bubble; bubble = bubbles[i++];) {
        var size = bubble.size;

        context.globalAlpha = bubble.opacity;
        context.strokeStyle = bubble.color;
        context.strokeRect(bubble.x - size/2, bubble.y - size/2, bubble.size, bubble.size);
        context.globalAlpha = 1;
      }
    },

    createBubble: function createBubble(sprite, isMega) {
      var size = utils.random(Bubbles.SIZE_MIN, Bubbles.SIZE_MAX) * (isMega? Bubbles.SIZE_MEGA : 1),
          speed = utils.random(Bubbles.SPEED_MIN, Bubbles.SPEED_MAX),
          margin = utils.random(Bubbles.MARGIN_MIN, Bubbles.MARGIN_MAX),
          popIncrement = isMega? Bubbles.POP_MEGA : utils.random(Bubbles.POP_MIN, Bubbles.POP_MAX),
          opacity = utils.random(Bubbles.OPACITY_MIN, Bubbles.OPACITY_MAX),
          popOpacityStep = isMega? Bubbles.POP_OPACITY_STEP_MEGA : utils.random(Bubbles.POP_OPACITY_STEP_MIN, Bubbles.POP_OPACITY_STEP_MAX),
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
        'opacity': opacity
      };

      return bubble;
    }
  };

  // this is just an object used to expose some internal methods and objects
  // used as a scope inside level scripts
  var WRAPPER = {
    loadLevel: loadLevel,
    initLevel: initLevel,
    hideLevel: hideLevel,
    player: Player,
    createPlatform: createPlatform,
    createMovable: createMovable,
    createCollectible: createCollectible,
    setPlayerAllowedRotation: setPlayerAllowedRotation,
    playerRotateGravity: playerRotateGravity,
    rotateGravity: rotateGravity,
    finishLevel: finishLevel,
    layerBackground: layerBackground,
    layerObjects: layerObjects,
    layerPlayer: layerPlayer
  };
}());