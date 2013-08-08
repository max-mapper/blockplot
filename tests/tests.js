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
      runTests()
    })
  } else if (profile.email) {
    runTests()
  }
})

function runTests() {
  test('#getProfile', function (t) {
    t.plan(3)
    user.getProfile(function(err, profile) {
      t.equals(!!err, false)
      t.equals(!!profile.email, true)
      t.equals(!!profile.username, true)
    })
  })
}