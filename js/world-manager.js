module.exports = WorldManager

function WorldManager(user) {
  if (!(this instanceof WorldManager)) return new WorldManager(user)
  this.user = user
  this.db = user.db.sublevel('worlds')
}

WorldManager.prototype.create = function(worldID, cb) {
  var self = this
  self.db.get(worldID, function(err, world) {
    if (err) world = {}
    world.seed = 'foo'
    self.db.put(worldID, world, {valueEncoding: 'json'}, function(err) {
      cb(err, world)
    })
  })
}


WorldManager.prototype.load = function(user, worldID, seed, cb) {
  this.db.get(worldID, { asBuffer: false }, function(err, data) {
    if (err || !data || !data.state) {
      var remote = user.remote('worlds')
      remote.get(worldID, {valueEncoding: 'json'}, function(err, world) {
        if (err || !world) return cb(err, world)
        var local = user.db.sublevel('worlds')
        local.put(world.id, world, {valueEncoding: 'json'}, function(err) {
          if (err) console.error('local world save err', err)
          user.copy(user.remote(worldID), user.db.sublevel(worldID), function() {
            cb(false, data)
          })
        })
      })
    } else {
      cb(false, data)
    }
  })
}

WorldManager.prototype.publish = function(world, cb) {
  var user = this.user
  var remote = user.remote(world.id)
  var local = user.db.sublevel(world.id)
  world.published = true
  var worlds = user.db.sublevel('worlds')
  var opts = {valueEncoding: 'json'}
  worlds.put(world.id, world, opts, function(err) {
    user.remote('worlds').put(world.id, world, opts, function(err) {
      var email = user.profile.email
      user.remote('profiles').get(email, function(err, profile) {
        if (err) return cb(err)
        if (!profile.worlds) profile.worlds = {}
        profile.worlds[world.id] = world
        user.remote('profiles').put(email, profile, opts, function(err, profile) {
          if (err) return cb(err)
          user.copy(local, remote, cb)
        })
      })
    })
  })
}

WorldManager.prototype.destroy = function(world, cb ) {
  var user = this.user
  var remote = user.remote('worlds')
  var local = user.db.sublevel('worlds')
  var pending = 3
  var errors = []
  user.destroy(local, function(err) {
    if (err) errors.push(err)
    pending--
    if (!pending) cb(errors.length ? errors : undefined)
  })
  user.destroy(remote, function(err) {
    if (err) errors.push(err)
    pending--
    if (!pending) cb(errors.length ? errors : undefined)
  })
  local.del(world.id, function(err) {
    if (err) errors.push(err)
    remote.del(world.id, function(err) {
      if (err) errors.push(err)
      pending--
      if (!pending) cb(errors.length ? errors : undefined)
    })
  })
}