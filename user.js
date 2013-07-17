var levelup = require('levelup')
var leveljs = require('level-js')
var sublevel = require('level-sublevel')
var createPersona = require('persona-id')

var request = require('browser-request')

module.exports = function(options) {
  if (!options) options = {}
  if (!options.baseURL) options.baseURL = '/'
  if (!options.dbName) options.dbName = "blocks"
  var db = sublevel(levelup(options.dbName, {
    db: leveljs,
    valueEncoding: 'json'
  }))
  return new User(db, options)
}

function User(db, options) {
  this.db = db
  this.persona = createPersona()
  this.options = options
}

User.prototype.getSession = function(cb) {
  var self = this
  var opts = { json: true, url: this.options.baseURL + '_session'}
  request(opts, function(err, resp, profile) {
    if (err) return cb(err, {})
    if (!profile.email) return cb(err, profile)
    self.db.put('profile', profile, function(err) {
      cb(err, profile)
    })
  })
}

