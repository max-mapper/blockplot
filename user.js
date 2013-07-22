var levelup = require('levelup')
var leveljs = require('level-js')
var websocket = require('websocket-stream')
var sublevel = require('level-sublevel')
var replicate = require('level-replicate/msgpack')
var createPersona = require('persona-id')
var request = require('browser-request')

module.exports = function(options) {
  if (!options) options = {}
  if (!options.baseURL) options.baseURL = ''
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
  var opts = { json: true, url: this.options.baseURL + '/_session' }
  request(opts, function(err, resp, profile) {
    if (err) return cb(err, {})
    if (!profile.email) return cb(err, profile)
    self.db.put('profile', profile, function(err) {
      cb(err, profile)
    })
  })
}

User.prototype.sync = function(worldName) {
  var backend = this.options.baseURL.replace('http:', 'ws:') + '/' + worldName
  var stream = websocket(backend)
  var db = this.db.sublevel(worldName)
  var replicator = replicate(db, 'master', "MASTER-1")
  stream.pipe(replicator.createStream({tail: true})).pipe(stream)
  return stream
}
