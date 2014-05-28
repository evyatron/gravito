(function() {
  var Level = {
    'actions': {
      'onCollectRotate1': function onCollectRotate1(sprite, direction) {
        var game = this;

        game.layerObjects.removeSprite('rotation-device-wrapper');
        game.layerObjects.removeSprite(sprite);

        var currentAllowedRotation = Player.get('maxRotation');
        if (currentAllowedRotation >= 90) {
          return;
        }

        Player.disableControl();
        Player.stopAllMovement();

        Dialog.show({
          'id': 'gravity1',
          'text': utils.l10n.get('gravity-1'),
          'sprite': Player.sprite,
          'onMethod': function onMethod(method, onDone) {
            if (method === 'gravityCCW') {
              game.rotateGravity(-90);
              window.setTimeout(onDone, 2500);
            } else if (method === 'gravityCW') {
              game.rotateGravity(90);
              window.setTimeout(onDone, 1800);
            }
          },
          'onEnd': function onDialogEnd() {
            game.setPlayerAllowedRotation(90);
            Player.enableControl();
          }
        });
      }
    }
  };

  var eventReady = new CustomEvent('levelReady', {
    'detail': {
      'level': Level
    }
  });
  window.dispatchEvent(eventReady);
}());