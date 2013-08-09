var levelUser = require('level-user')
var test = require('tape')
var onWindowMessage = require('../js/eventer')
var worldManager = require('../js/world-manager')

var user = levelUser({ dbName: 'foo', baseURL: "http://localhost:8889" })
var worlds = worldManager(user)

user.getProfile(function(err, profile) {
  if (profile.loggedOut) {
    // iframe emits this on login:
    onWindowMessage(function(data) {
      if (!data.login) return console.error('you must log in to do the tests')
      user.getProfile(function(err, profile) {
        if (!err) {
          user.profile = profile
          runTests()
        }
      })
    })
  } else if (profile.email) {
    user.profile = profile
    runTests()
  }
})

function runTests() {
  test('getProfile', function (t) {
    user.getProfile(function(err, profile) {
      t.equals(!!err, false)
      t.equals(!!profile.email, true)
      t.equals(!!profile.username, true)
      t.end()
    })
  })
  
  test('local CRUD', function(t) {
    CRUDTest(user.db, t)
  })
  
  test('remote CRUD', function(t) {
    CRUDTest(user.remote('test'), t)
  })
  
  test('world manager load non-existent', function(t) {
    worlds.load('ohhai', function(err, world) {
      t.equals(!!err, true)
      t.equals(!!world, false)
      t.end()
    })
  })

  test('world manager load local-only', function(t) {
    var world = {id: 'pizza', name: 'pizza', published: false}
    worlds.db.put(world.id, world, {valueEncoding: 'json'}, function(err) {
      t.equals(!!err, false)
      worlds.load(world.id, function(err, world2) {
        t.equals(JSON.stringify(world), JSON.stringify(world2))
        worlds.db.del(world.id, function(err) {
          t.equals(!!err, false)
          t.end()
        })
      })
    })
  })
  
  test('world manager publish', function(t) {
    function setup(cb) {
      user.db.sublevel(world.id).put('taco-data', {'foo': 'bar'}, function(err) {
        t.equals(!!err, false)
        worlds.db.put(world.id, world, {valueEncoding: 'json'}, function(err) {
          t.equals(!!err, false)
          cb()
        })
      })
    }
    function cleanup() {
      worlds.db.del(world.id, function(err) {
        t.equals(!!err, false)
        t.end()
      })
    }
    function verifyData(cb) {
      var remote = user.remote(world.id)
      var local = user.db.sublevel(world.id)
      local.get('taco-data', function(err, localData) {
        t.equals(!!err, false)
        remote.get('taco-data', function(err, remoteData) {
          t.equals(!!err, false)
          t.equals(JSON.stringify(localData), JSON.stringify(remoteData))
          cb()
        })
      })
    }
    function verifyMeta(cb) {
      var email = user.profile.email
      user.remote('profiles').get(email, function(err, profile) {
        t.equals(!!err, false)
        t.equals(!!profile.worlds[world.id], true)
        worlds.db.get(world.id, function(err, localWorld) {
          t.equals(!!err, false)
          t.equals(localWorld.published, true)
          user.remote('worlds').get(world.id, function(err, remoteWorld) {
            t.equals(!!err, false)
            t.equals(remoteWorld.published, true)
            cb()
          })
        })
      })
    }
    var world = {id: 'taco', name: 'taco', published: false}
    setup(function() {
      worlds.publish(world.id, function(err) {
        t.equals(!!err, false)
        verifyData(function() {
          verifyMeta(function() {
            cleanup()
          })
        })
      })
    })
  })
  
  // test('world manager load remote', function(t) {
  //   t.plan(4)
  //   var world = {id: 'pizza', name: 'pizza', published: false}
  //   worlds.db.put(world.id, world, {valueEncoding: 'json'}, function(err) {
  //     t.equals(!!err, false)
  //     worlds.load(world.id)
  //   })
  // })
}

function CRUDTest(db, t) {
  db.put('foo', 'bar', function(err) {
    t.equals(!!err, false)
    db.get('foo', function(err, val) {
      t.equals(!!err, false)
      t.equals(val, 'bar')
      db.del('foo', function(err) {
        t.equals(!!err, false)
        t.end()
      })
    })
  })
}