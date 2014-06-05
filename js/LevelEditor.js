var LevelEditor = (function() {
  var game,
      elUI,
      el,

      levelData = {
        'frame': {
          'top': 10,
          'bottom': 10,
          'left': 10,
          'right': 10
        },
        'background': '',
        'size': {
          'width': CONFIG.WIDTH,
          'height': CONFIG.HEIGHT
        },
        'player': {
        },
        'finish': {
          'x': 180,
          'y': 130,
          'width': 10,
          'height': 50
        },
        "platforms": [],
        "movables": [],
        "collectibles": [],
        "scores": []
      },

      DEFAULT_PLATFORM = {
        'width': 120,
        'height': 10
      },

      DEFAULT_MOVABLE = {
        'width': 100,
        'height': 20
      },

      sprites = [],

      spriteStartX = 0,
      spriteStartY = 0,
      mouseStartX = 0,
      mouseStartY = 0,
      holding = null,
      defaultGravity,

      running = false,

      SPRITE_IDS_TO_EXCLUDE = [
        'player',
        'finish', 'finish-light',
        'frame_top',
        'frame_bottom',
        'frame_left',
        'frame_right'
      ];

  function init(options) {
    game = options.game;
    elUI = options.elUI;

    initUI();

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keyup', onKeyPress);
    el.querySelector('.size').addEventListener('keyup', onSizeKeyPress);
    el.querySelector('.width').addEventListener('blur', updateLevelProperties);
    el.querySelector('.height').addEventListener('blur', updateLevelProperties);
    el.querySelector('.background').addEventListener('change', updateLevelProperties);
    el.querySelector('.play').addEventListener('click', play);
    el.querySelector('.stop').addEventListener('click', stop);

    window.addEventListener('gameStart', function onFirstGameStart(e) {
      window.removeEventListener('gameStart', onFirstGameStart);
      cancelGravity();
    });
    window.addEventListener('levelReady', onLevelReady);

    document.body.classList.add('editor');
  }

  function begin() {
    initLevel();
  }

  function initLevel() {
    game.hideLevel();
    game.initLevel(levelData);
  }

  function onLevelReady() {
    populateSprites();
  }

  function populateSprites() {
    sprites = [];
  }

  function cancelGravity() {
    if (!window.GRAVITY_DIRECTION_NAME) {
      return;
    }

    defaultGravity = window.GRAVITY;
    game.game.setGravity(new Vector(0, 0));
  }

  function restoreGravity() {
    game.game.setGravity(defaultGravity);
  }

  function pickup(sprite) {
    if (holding) {
      return;
    }

    holding = sprite;
    spriteStartX = holding.topLeft.x;
    spriteStartY = holding.topLeft.y;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function drop() {
    holding = null;
  }

  function place() {

  }

  function play() {
    restoreGravity();
    initLevel();
    running = true;
  }

  function stop() {
    cancelGravity();
    initLevel();
    running = false;
  }

  function updateLevelData() {
    levelData.player = {
      'x': Player.sprite.topLeft.x,
      'y': Player.sprite.topLeft.y,
    };

    var finishSprite = game.game.getSpriteById('finish');
    levelData.finish.x = finishSprite.topLeft.x - levelData.frame.left;
    levelData.finish.y = finishSprite.topLeft.y - levelData.frame.top;


    // translate the sprites back from the Sprite game objects
    // to plain data in the level config
    var sprites = game.game.layers[2].sprites
                  .concat(game.game.layers[0].sprites),

                  platforms = [],
                  movables = [],
                  collectibles = [],
                  scores = [];

    for (var i = 0, sprite; sprite = sprites[i++];) {
      if (SPRITE_IDS_TO_EXCLUDE.indexOf(sprite.id) !== -1) {
        continue;
      }

      var type = sprite.type,
          data = {
            'x': sprite.topLeft.x - levelData.frame.left,
            'y': sprite.topLeft.y - levelData.frame.top
          };

      switch (type) {
        case 'score':
          scores.push(data);
          break;
        case 'platform':
          data.width = sprite.width;
          data.height = sprite.height;
          platforms.push(data);
          break;
        case 'movable':
          data.width = sprite.width;
          data.height = sprite.height;
          movables.push(data);
          break;
      }
    }

    levelData.platforms = platforms;
    levelData.movables = movables;
    levelData.collectibles = collectibles;
    levelData.scores = scores;

    initLevel();

    console.info('New game data:', levelData);
  }

  function isPointInSprite(sprite, x, y) {
    return (x >= sprite.topLeft.x && x <= sprite.bottomRight.x &&
            y >= sprite.topLeft.y && y <= sprite.bottomRight.y);
  }

  function checkSpriteClick(x, y) {
    if (isPointInSprite(Player.sprite, x, y)) {
      pickup(Player.sprite);
      return;
    }

    var finishSprite = levelData.finish;
    if (x - levelData.frame.left > finishSprite.x && x - levelData.frame.left < finishSprite.x + finishSprite.width &&
        y - levelData.frame.top > finishSprite.y && y - levelData.frame.top < finishSprite.y + finishSprite.height) {
      pickup(game.game.getSpriteById('finish'));
      return;
    }

    var sprites = game.game.layers[2].sprites
                  .concat(game.game.layers[0].sprites);

    for (var i = 0, sprite; sprite = sprites[i++];) {
      if (SPRITE_IDS_TO_EXCLUDE.indexOf(sprite.id) !== -1) {
        continue;
      }

      if (isPointInSprite(sprite, x, y)) {
        pickup(sprite);
      }
    }
  }

  function updateLevelProperties() {
    levelData.size = {
      'width': (el.querySelector('.width').value || CONFIG.WIDTH) * 1,
      'height': (el.querySelector('.height').value || CONFIG.HEIGHT) * 1
    };

    boundXYToLevel(Player.sprite, levelData.player);
    boundXYToLevel(game.game.getSpriteById('finish'), levelData.finish);

    levelData.background = el.querySelector('.background').value || CONFIG.DEFAULT_BACKGROUND;

    initLevel();
  }

  function boundXYToLevel(sprite, position) {
    position.x = Math.min(position.x, levelData.size.width - sprite.width);
    position.x = Math.max(position.x, 0);
    position.y = Math.min(position.y, levelData.size.height - sprite.height);
    position.y = Math.max(position.y, 0);
  }

  function onSizeKeyPress(e) {
    if (e.keyCode === 13) {
      updateLevelProperties();
    }
  }

  function onKeyPress(e) {
    switch (e.keyCode) {
      case 90: //Z
        game.createPlatform({
          'id': 'new_platform_' + Date.now(),
          'x': game.game.width / 2,
          'y': game.game.height / 2,
          'width': DEFAULT_PLATFORM.width,
          'height': DEFAULT_PLATFORM.height
        });
        break; 
      case 88: //X
        game.createMovable({
          'id': 'new_movable_' + Date.now(),
          'x': game.game.width / 2,
          'y': game.game.height / 2,
          'width': DEFAULT_MOVABLE.width,
          'height': DEFAULT_MOVABLE.height
        });
        break;
      case 67: //C
        
        break;
      case 86: //V
        game.createCollectible({
          'id': 'new_score_' + Date.now(),
          'type': 'score',
          'x': game.game.width / 2,
          'y': game.game.height / 2
        });
        break;
    }
  }

  function onMouseDown(e) {
    if (running) {
      return;
    }

    var elClicked = e.target;

    mouseStartX = e.pageX;
    mouseStartY = e.pageY;

    if (elClicked.tagName === 'CANVAS') {
      var bounds = elClicked.getBoundingClientRect();
      checkSpriteClick(mouseStartX - bounds.left, mouseStartY - bounds.top);
    }
  }

  function onMouseMove(e) {
    var position = {
          'x': spriteStartX - (mouseStartX - e.pageX),
          'y': spriteStartY - (mouseStartY - e.pageY)
        };

    boundXYToLevel(holding, position);
    
    holding.set(position.x, position.y);
  }

  function onMouseUp(e) {
    updateLevelData();

    holding = null;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }

  function initUI() {
    el = document.createElement('div');
    el.id = 'editor';
    el.innerHTML = '<div class="size">' +
                      '<label>' +
                        '<b>Size:</b>' +
                        '<input type="number" class="width" value="' + CONFIG.WIDTH + '" />' +
                        'x' +
                        '<input type="number" class="height" value="' + CONFIG.HEIGHT + '" />' +
                      '</label>' +
                   '</div>' +
                   '<div class="bg">' +
                      '<label>' +
                        '<b>Background:</b>' +
                        '<input type="color" class="background" value="#ffffff" />' +
                      '</label>' +
                   '</div>' +
                   '<div class="game">' +
                    '<button class="play">Play</button>' +
                    '<button class="stop">Stop</button>' +
                   '</div>';

    elUI.appendChild(el);
  }

  return {
    'init': init,
    'begin': begin
  };
}());