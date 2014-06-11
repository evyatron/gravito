(function() {
  var Level = {
    'actions': {
      'onCollectRotateFull': function onCollectRotateFull(sprite, direction) {
        var game = this;

        // remove the device from the game
        game.layerObjects.removeSprite(sprite);

        // stop player
        Player.disableControl();
        Player.stopAllMovement();

        // show the dialog
        Dialog.show({
          'id': 'gravity1',
          'text': utils.l10n.get('gravity-full'),
          'sprite': Player.sprite,
          'onMethod': function onMethod(method, onDone) {
            game.rotateGravity(90);
            window.setTimeout(onDone, 2000);
          },
          'onEnd': function onDialogEnd() {
            game.setPlayerAllowedRotation(360);
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