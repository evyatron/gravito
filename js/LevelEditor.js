var LevelEditor = (function() {
  var game,
      elUI,
      el,
      levelData = {
        'frame': 10,
        'player': {
        }
      },

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
    el.querySelector('.play').addEventListener('click', play);
    el.querySelector('.stop').addEventListener('click', stop);

    window.addEventListener('gameStart', function onFirstGameStart(e) {
      window.removeEventListener('gameStart', onFirstGameStart);
      cancelGravity();
    });
  }

  function begin() {
    initLevel();
  }

  function initLevel() {
    game.hideLevel();
    game.initLevel(levelData);
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

  function udpateLevelData() {
    levelData.player = {
      'x': Player.sprite.topLeft.x,
      'y': Player.sprite.topLeft.y,
    };

    console.info('New game data:', levelData);
  }

  function checkSpriteClick(x, y) {
    var playerSprite = Player.sprite;
    if (x > playerSprite.topLeft.x && x < playerSprite.bottomRight.x &&
        y > playerSprite.topLeft.y && y < playerSprite.bottomRight.y) {
      pickup(playerSprite);
    }
  }

  function onKeyPress(e) {
    if (e.keyCode === 13) {
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

      initLevel();
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
        diffY = mouseStartY - e.pageY;

    holding.set(spriteStartX - diffX, spriteStartY - diffY);
  }

  function onMouseUp(e) {
    udpateLevelData();

    holding = null;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }

  function initUI() {
    el = document.createElement('div');
    el.id = 'editor';
    el.innerHTML = '<div class="size">' +
                      '<label>' +
                        '<b>Width:</b>' +
                        '<input type="number" class="width" value="' + CONFIG.WIDTH + '" />' +
                      '</label>' +
                      '<label>' +
                        '<b>Height:</b>' +
                        '<input type="number" class="height" value="' + CONFIG.HEIGHT + '" />' +
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