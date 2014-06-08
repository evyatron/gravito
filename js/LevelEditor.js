var LevelEditor = (function() {
  var game,
      elUI,
      el,
      elCurrentHolding,

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
          'x': CONFIG.WIDTH - 20,
          'y': CONFIG.HEIGHT - 70,
          'width': 10,
          'height': 50
        },
        "rotationLimit": {
          "min": 0,
          "max": 0,
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

      DEFAULT_TEXT = {
        'width': 50,
        'height': 50
      },

      spriteStartX = 0,
      spriteStartY = 0,
      spriteStartWidth = 0,
      spriteStartHeight = 0,
      mouseStartX = 0,
      mouseStartY = 0,
      holding = null,
      defaultGravity,

      running = false,

      IS_SHIFT_DOWN = false,
      IS_CTRL_DOWN = false,

      IS_SNAP = false,

      SPRITE_IDS_TO_EXCLUDE = [
        'player',
        'finish', 'finish-light',
        'frame_top',
        'frame_bottom',
        'frame_left',
        'frame_right', 'frame_right_finish_top', 'frame_right_finish_bottom', 'frame_right_finish_behind'
      ];

  function init(options) {
    document.title += ' - Level Editor';

    game = options.game;
    elUI = options.elUI;

    initUI();

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    el.querySelector('.size').addEventListener('keyup', onSizeKeyPress);
    el.querySelector('.width').addEventListener('blur', updateLevelProperties);
    el.querySelector('.height').addEventListener('blur', updateLevelProperties);
    el.querySelector('.rotation-min').addEventListener('blur', updateLevelProperties);
    el.querySelector('.rotation-max').addEventListener('blur', updateLevelProperties);
    el.querySelector('.background').addEventListener('change', updateLevelProperties);
    el.querySelector('.is-snap').addEventListener('change', onSnapChange);

    el.querySelector('.play').addEventListener('click', play);
    el.querySelector('.stop').addEventListener('click', stop);

    el.querySelector('.button-platform').addEventListener('click', spawnPlatform);
    el.querySelector('.button-movable').addEventListener('click', spawnMovable);
    el.querySelector('.button-score').addEventListener('click', spawnScore);
    el.querySelector('.button-text').addEventListener('click', spawnText);

    el.querySelector('.json-export').addEventListener('click', showJSON);
    el.querySelector('.json-import').addEventListener('click', loadFromJSON);

    window.addEventListener('gameStart', function onFirstGameStart(e) {
      window.removeEventListener('gameStart', onFirstGameStart);
      cancelGravity();
    });

    document.body.classList.add('editor');
    onSnapChange();
  }

  function onSnapChange() {
    var elInput = el.querySelector('.is-snap');
    IS_SNAP = elInput.checked;
  }

  function showJSON() {
    var json = JSON.parse(JSON.stringify(levelData)),
        w = window.open('_blank', 'about:blank'),
        doc = w.document;

    delete json.frameWidth;

    if (json.frame.top === json.frame.left &&
        json.frame.left === json.frame.right && 
        json.frame.right === json.frame.bottom) {
      json.frame = json.frame.top;
    }

    json = JSON.stringify(json, undefined, 2),

    doc.write('<pre>' + json + '</pre>');
    doc.title = 'Level';

    // automatically select the entire content
    var selection = w.getSelection(),
        range = doc.createRange();

    range.selectNodeContents(doc.body);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function loadFromJSON() {
    var jsonString = prompt('Pelase enter level\'s JSON:'),
        json;

    if (!jsonString) {
      return;
    }

    try {
      json = JSON.parse(jsonString);
    } catch(ex) {
      console.error('Invalid JSON!', ex, jsonString);
    }

    if (json) {
      loadData(json);
    }
  }

  function loadData(json) {
    levelData = json;

    el.querySelector('.width').value = levelData.size.width;
    el.querySelector('.height').value = levelData.size.height;
    
    el.querySelector('.rotation-min').value = levelData.rotationLimit.min;
    el.querySelector('.rotation-max').value = levelData.rotationLimit.max;

    el.querySelector('.background').value = levelData.background;

    initLevel();
  }

  function begin() {
    initLevel();
  }

  function initLevel() {
    game.LevelHandler.hide();
    game.LevelHandler.create(levelData);
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
    spriteStartWidth = holding.width;
    spriteStartHeight = holding.height;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    updateCurrentlyHoldingInformation();
  }

  function play() {
    if (running) {
      return;
    }

    restoreGravity();
    initLevel();
    running = true;
    document.body.classList.add('editor-running');
  }

  function stop() {
    if (!running) {
      return;
    }

    cancelGravity();
    initLevel();
    running = false;
    document.body.classList.remove('editor-running');
  }

  function updateLevelData() {
    levelData.player = {
      'x': Player.sprite.topLeft.x,
      'y': Player.sprite.topLeft.y,
    };

    if (typeof levelData.frame === 'number') {
      levelData.frame = {
        'top': levelData.frame,
        'left': levelData.frame,
        'right': levelData.frame,
        'bottom': levelData.frame
      };
    }

    var finishSprite = game.game.getSpriteById('finish');
    levelData.finish.x = finishSprite.topLeft.x - levelData.frame.left;
    levelData.finish.y = finishSprite.topLeft.y - levelData.frame.top;
    levelData.finish.width = finishSprite.width;
    levelData.finish.height = finishSprite.height;


    // translate the sprites back from the Sprite game objects
    // to plain data in the level config
    var sprites = game.game.layers[2].sprites.concat(game.game.layers[0].sprites),

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
            'y': sprite.topLeft.y - levelData.frame.top,
            'width': sprite.width,
            'height': sprite.height
          };

      switch (type) {
        case 'score':
          delete data.width;
          delete data.height;
          scores.push(data);
          break;
        case 'platform':
          platforms.push(data);
          break;
        case 'movable':
          movables.push(data);
          break;
        case 'text':
          data.type = sprite.type;
          data.data = {
            'text': '[ENTER TEXT ID]'
          };
          collectibles.push(data);
          break;
        default:
          collectibles.push(data);
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
      if (sprite.id !== 'finish' && SPRITE_IDS_TO_EXCLUDE.indexOf(sprite.id) !== -1) {
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
    levelData.player = {
      'x': Player.sprite.topLeft.x,
      'y': Player.sprite.topLeft.y
    };
    levelData.rotationLimit = {
      'min': el.querySelector('.rotation-min').value * 1,
      'max': el.querySelector('.rotation-max').value * 1
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

  function spawnPlatform() {
    var sprite = game.createPlatform({
      'id': 'new_platform_' + Date.now(),
      'x': game.game.width / 2,
      'y': game.game.height / 2,
      'width': DEFAULT_PLATFORM.width,
      'height': DEFAULT_PLATFORM.height
    });
    game.layerBackground.addSprite(sprite);
    updateLevelData();
  }

  function spawnMovable() {
    var sprite = game.createMovable({
      'id': 'new_movable_' + Date.now(),
      'x': game.game.width / 2,
      'y': game.game.height / 2,
      'width': DEFAULT_MOVABLE.width,
      'height': DEFAULT_MOVABLE.height
    });
    game.layerObjects.addSprite(sprite);
    updateLevelData();
  }

  function spawnScore() {
    var sprite = game.createCollectible({
      'id': 'new_score_' + Date.now(),
      'type': 'score',
      'x': game.game.width / 2,
      'y': game.game.height / 2
    });
    game.layerObjects.addSprite(sprite);
    updateLevelData();
  }

  function spawnText() {
    var sprite = game.createCollectible({
      'id': 'new_text_' + Date.now(),
      'type': 'text',
      'x': game.game.width / 2,
      'y': game.game.height / 2,
      'width': DEFAULT_TEXT.width,
      'height': DEFAULT_TEXT.height
    });
    game.layerObjects.addSprite(sprite);
    updateLevelData();
  }

  function updateCurrentlyHoldingInformation() {
    elCurrentHolding.innerHTML = 
      '<li><label>x:</label>' + holding.topLeft.x + '</li>' +
      '<li><label>y:</label>' + holding.topLeft.y + '</li>' +
      '<li><label>width:</label>' + holding.width + '</li>' +
      '<li><label>height:</label>' + holding.height + '</li>';
  }

  function deleteHeldSprite() {
    if (!holding) {
      return;
    }
    if (SPRITE_IDS_TO_EXCLUDE.indexOf(holding.id) !== -1) {
      return;
    }

    holding.layer.removeSprite(holding);
    onMouseUp();
  }

  function onSizeKeyPress(e) {
    if (e.keyCode === 13) {
      updateLevelProperties();
    }
  }

  function onKeyDown(e) {
    switch (e.keyCode) {
      case 16: // Shift
        IS_SHIFT_DOWN = true;
        break;
      case 17: // Ctrl
        IS_CTRL_DOWN = true;
        break;
    }
  }

  function onKeyUp(e) {
    switch (e.keyCode) {
      case 16: // Shift
        IS_SHIFT_DOWN = false;
        break;
      case 17: // Ctrl
        IS_CTRL_DOWN = false;
        break;
      case 46: // Del
        deleteHeldSprite();
        break;
      case 49: // 1
        spawnPlatform();
        break;
      case 50: // 2
        spawnMovable();
        break;
      case 51: // 3
        spawnScore();
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
    var diffX = e.pageX - mouseStartX,
        diffY = e.pageY - mouseStartY,
        snap = IS_SNAP || IS_CTRL_DOWN,
        position = {
          'x': spriteStartX,
          'y': spriteStartY
        };
    
    if (IS_SHIFT_DOWN) {
      holding.width = spriteStartWidth + diffX;
      holding.height = spriteStartHeight + diffY;

      if (snap) {
        holding.width -= holding.width % 10;
        holding.height -= holding.height % 10;
      }
    } else {
      position.x += diffX
      position.y += diffY

      if (snap) {
        position.x -= position.x % 10;
        position.y -= position.y % 10;
      }

      boundXYToLevel(holding, position);
      holding.set(position.x, position.y);
    }


    updateCurrentlyHoldingInformation();
  }

  function onMouseUp(e) {
    updateLevelData();

    holding = null;
    elCurrentHolding.innerHTML = '';
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
                    '<div class="rotation">' +
                      '<label>' +
                        '<b>Rotation Min:</b>' +
                        '<select class="rotation-min">' +
                          '<option value="0">0</option>' +
                          '<option value="-90">-90</option>' +
                          '<option value="-180">-180</option>' +
                          '<option value="-360">-360</option>' +
                        '</select>' +
                      '</label>' +
                    '</div>' +
                    '<div class="rotation">' +
                      '<label>' +
                        '<b>Rotation Max:</b>' +
                        '<select class="rotation-max">' +
                          '<option value="0">0</option>' +
                          '<option value="90">90</option>' +
                          '<option value="180">180</option>' +
                          '<option value="360">360</option>' +
                        '</select>' +
                      '</label>' +
                    '</div>' +
                    '<ul class="controls">' +
                      '<li class="button-platform" title="Create a platform"><span class="key">1</span><span>Platform</span></li>' +
                      '<li class="button-movable" title="Create a movable object"><span class="key">2</span><span>Movable</span></li>' +
                      '<li class="button-score" title="Create a score (collectible with type score)"><span class="key">3</span><span>Score</span></li>' +
                      '<li class="button-text" title="Create a text trigger area (collectible with type text)"><span class="key">4</span><span>Text</span></li>' +
                      '<li class="button-resize" title="Hold SHIFT key while dragging to resize sprite"><span class="key">Shift</span><span>Resize</span></li>' +
                    '</ul>' +
                    '<div class="snap" title="Snap sprites to 10x">' +
                      '<label for="is-snap">' +
                        '<input type="checkbox" id="is-snap" class="is-snap" checked />' +
                        '<span>Snap to Grid</span>' +
                      '</label>' +
                    '</div>' +
                    '<ul class="holding-stats"></ul>' +
                    '<div class="game">' +
                      '<button class="play">Play</button>' +
                      '<button class="stop">Stop</button>' +
                    '</div>' +
                    '<div class="json">' +
                      '<button class="json-import">Import</button>' +
                      '<button class="json-export">Export</button>' +
                    '</div>';


    elCurrentHolding = el.querySelector('.holding-stats');

    elUI.appendChild(el);
  }

  return {
    'init': init,
    'begin': begin
  };
}());