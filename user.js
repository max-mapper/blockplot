var leveljs = require('level-js')
var request = require('browser-request')

module.exports = function(options, cb) {
  if (!options) options = {}
  if (!options.baseURL) options.baseURL = '/'
  if (!options.dbName) options.dbName = "blocks"
  var db = leveljs(options.dbName)
  db.open(function(err) {
    cb(err, new User(db, options))
  })
}

function User(db, options) {
  this.db = db
  this.options = options
}

User.prototype.getSession = function(cb) {
  var self = this
  var opts = { json: true, url: this.options.baseURL + '_session'}
  request(opts, function(err, resp, profile) {
    if (!profile.email) return cb(err, profile)
    self.db.put(profile.email, profile, function(err) {
      cb(err, profile)
    })
  })
}

User.prototype.getProfile = function(profileID, cb) {
  db.get(profileID, {asBuffer: false}, cb)
}
