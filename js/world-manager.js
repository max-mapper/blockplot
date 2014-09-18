module.exports = WorldManager

function WorldManager(db) {
  if (!(this instanceof WorldManager)) return new WorldManager(db)
  this.db = db.sublevel('worlds')
}

WorldManager.prototype.load = function(worldID, cb) {
  this.db.get(worldID, { asBuffer: false }, function(err, data) {
    cb(err, data)
  })
}

WorldManager.prototype.destroy = function(world, cb ) {
  this.db.del(world.id, function(err) {
    cb(err)
  })
}