SpriteMoving = (function() {
  function SpriteMoving(options) {
    Sprite.call(this, options);
  }

  SpriteMoving.prototype = Object.create(Sprite.prototype);

  var originalUpdate = SpriteMoving.prototype.update;

  SpriteMoving.prototype.update = function update(dt) {
    var script = this.script.move,
        offset = {},
        topLeft = this.topLeft,
        axis, axisName;

    for (axisName in script) {
      axis = script[axisName];

      if (!axis.flipped && topLeft[axisName] >= axis.to ||
          axis.flipped && topLeft[axisName] <= this.originalPosition[axisName]) {

        axis.flipped = !axis.flipped;
        axis.speed *= -1;
      }

      offset[axisName] = axis.speed * dt;
    }

    this.move(offset);

    originalUpdate.call(this, dt);
  };

  return SpriteMoving;
}());