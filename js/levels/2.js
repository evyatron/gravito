(function() {
  var Level = {
    'actions': {
      'onCollectRotate1': function onCollectRotate1(sprite, direction) {
        var game = this;

        // remove the device from the game
        game.layerObjects.removeSprite(sprite);

        // stop player
        Player.disableControl();
        Player.stopAllMovement();

        // show the dialog
        Dialog.show({
          'id': 'gravity1',
          'text': utils.l10n.get('gravity-1'),
          'sprite': Player.sprite,
          'onMethod': function onMethod(method, onDone) {
            if (method === 'gravityCCW') {
              game.rotateGravity(-90);
              window.setTimeout(onDone, 2000);
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