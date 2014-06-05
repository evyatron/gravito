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
      },

      sprites = [],

      spriteStartX = 0,
      spriteStartY = 0,
      mouseStartX = 0,
      mouseStartY = 0,
      holding = null,
      defaultGravity,

      running = false;

  function init(options) {
    game = options.game;
    elUI = options.elUI;

    initUI();

    window.addEventListener('mousedown', onMouseDown);
    el.querySelector('.size').addEventListener('keyup', onKeyPress);
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

    initLevel();

    console.info('New game data:', levelData);
  }

  function checkSpriteClick(x, y) {
    var playerSprite = Player.sprite;
    if (x > playerSprite.topLeft.x && x < playerSprite.bottomRight.x &&
        y > playerSprite.topLeft.y && y < playerSprite.bottomRight.y) {
      pickup(playerSprite);
      return;
    }

    var finishSprite = levelData.finish;
    if (x - levelData.frame.left > finishSprite.x && x - levelData.frame.left < finishSprite.x + finishSprite.width &&
        y - levelData.frame.top > finishSprite.y && y - levelData.frame.top < finishSprite.y + finishSprite.height) {
      pickup(game.game.getSpriteById('finish'));
      return;
    }
  }

  function updateLevelProperties() {
    levelData.size = {
      'width': (el.querySelector('.width').value || CONFIG.WIDTH) * 1,
      'height': (el.querySelector('.height').value || CONFIG.HEIGHT) * 1
    };

    if (levelData.player.x > levelData.size.width) {
      levelData.player.x = levelData.size.width - Player.sprite.width;
    }
    if (levelData.player.y > levelData.size.height) {
      levelData.player.y
      levelData.player.y = levelData.size.height - Player.sprite.height - levelData.frameWidth.bottom;
    }

    levelData.background = el.querySelector('.background').value || CONFIG.DEFAULT_BACKGROUND;

    initLevel();
  }

  function boundXYToLeve(sprite, x, y) {
    x = Math.min(x, levelData.size.width - sprite.width);
    x = Math.max(x, 0);
    y = Math.min(y, levelData.size.height - sprite.height);
    y = Math.max(y, 0);

    return {
      'x': x,
      'y': y
    };
  }

  function onKeyPress(e) {
    if (e.keyCode === 13) {
      updateLevelProperties();
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
    var diffX = mouseStartX - e.pageX,
        diffY = mouseStartY - e.pageY,
        position = boundXYToLeve(holding, spriteStartX - diffX, spriteStartY - diffY);
    
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