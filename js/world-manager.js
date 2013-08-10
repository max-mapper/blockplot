module.exports = WorldManager

function WorldManager(user) {
  if (!(this instanceof WorldManager)) return new WorldManager(user)
  this.user = user
  this.db = user.db.sublevel('worlds')
}

WorldManager.prototype.load = function(worldID, cb) {
  var user = this.user
  this.db.get(worldID, { asBuffer: false }, function(err, data) {
    if (err || !data || !data.state) {
      var remote = user.remote('worlds')
      remote.get(worldID, {valueEncoding: 'json'}, function(err, world) {
        if (err || !world) return cb(err, data)
        var local = user.db.sublevel('worlds')
        local.put(world.id, world, {valueEncoding: 'json'}, function(err) {
          if (err) console.error('local world save err', err)
          user.copy(user.remote(worldID), user.db.sublevel(worldID), function(err) {
            cb(err, world)
          })
        })
      })
    } else {
      cb(err, data)
    }
  })
}

// todo transaction
WorldManager.prototype.publish = function(worldID, cb) {
  var opts = {valueEncoding: 'json'}
  var user = this.user
  var worlds = user.db.sublevel('worlds')
  worlds.get(worldID, opts, function(err, world) {
    if (err) return cb(err)
    var email = user.profile.email
    var remote = user.remote(world.id)
    var local = user.db.sublevel(world.id)
    world.published = true
    var pending = 3, errors = []
    
    worlds.put(world.id, world, opts, finish)
    
    user.remote('worlds').put(world.id, world, opts, finish)
    
    user.remote('profiles').get(email, function(err, profile) {
      if (err) return finish(err)
      if (!profile.worlds) profile.worlds = {}
      profile.worlds[world.id] = world
      user.remote('profiles').put(email, profile, opts, function(err, profile) {
        if (err) return finish(err)
        user.copy(local, remote, finish)
      })
    })
    
    function finish(err) {
      pending--
      if (err) errors.push(err)
      if (pending !== 0) return
      if (errors.length === 1) errors = errors[0]
      if (errors.length === 0) errors = false
      cb(errors)
    }
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