var levelup = require('levelup')
var leveljs = require('level-js')
var websocket = require('websocket-stream')
var sublevel = require('level-sublevel')
// var replicate = require('level-replicate')
var multilevel = require('multilevel')
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
  var opts = { withCredentials: true, json: true, url: this.options.baseURL + '/_session' }
  request(opts, function(err, resp, profile) {
    if (err) return cb(err, {})
    if (!profile.email) return cb(err, profile)
    self.db.put('profile', profile, function(err) {
      cb(err, profile)
    })
  })
}

// User.prototype.sync = function(worldName) {
//   var backend = this.options.baseURL.replace('http:', 'ws:') + '/' + worldName
//   var stream = websocket(backend)
//   var db = this.db.sublevel(worldName)
//   var replicator = replicate(db, 'master', "MASTER-1")
//   stream.pipe(replicator.createStream({tail: true})).pipe(stream)
//   stream.on('data', function(c){ console.log(c) })
//   return stream
// }

User.prototype.remote = function(name) {
  var backend = this.options.baseURL.replace('http:', 'ws:') + '/' + name
  var stream = websocket(backend)
  var db = multilevel.client()
  db.on('data', function(e) { console.log(e) })
  stream.pipe(db.createRpcStream()).pipe(stream)
  return db
}

User.prototype.copy = function(from, to, cb) {
  var write = to.createWriteStream({valueEncoding: 'binary'})
  from.createReadStream({valueEncoding: 'binary'}).pipe(write)
  write.on('close', cb)
  write.on('error', function(err) {
    console.error(err)
  })
}
