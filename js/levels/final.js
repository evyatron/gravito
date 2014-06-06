(function() {
  var WIDTH = 0,
      SIZE = 0,
      wrapper,
      layer = null;

  // have "achievements" for collecting points

  var Level = {
    onGameStart: function onGameStart(e) {
      wrapper = e.detail.game;

      var game = wrapper.game,
          player = wrapper.player;

      WIDTH = game.width;
      SIZE = player.sprite.height;
      LAYER = game.layers[game.layers.length - 1];

      Player.sprite.onCollision(this.onCollision.bind(this));

      this.createScore((WIDTH - SIZE - 20)/2);

      Player.set('gameFinished', true);
    },

    createScore: function createScore(x) {
      !x && (x = Math.round(Math.random() * (WIDTH - SIZE - 20)));

      var sprite = wrapper.createCollectible({
        'id': 'score',
        'x': x,
        'height': SIZE,
        'width': SIZE,
        'type': 'score'
      });

      wrapper.layerObjects.addSprite(sprite);

      sprite.onCollisionWith(Player.sprite, this.onCollision);
    },

    onCollision: function onCollision(spriteWith, direction) {
      if (spriteWith.type !== 'score') {
        return;
      }

      window.setTimeout(this.createScore.bind(this), 120);
    }
  };

  window.addEventListener('gameStart', Level.onGameStart.bind(Level));
  


  var eventReady = new CustomEvent('levelReady', {
    'detail': {
      'level': Level
    }
  });
  window.dispatchEvent(eventReady);
}());