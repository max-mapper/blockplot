var levelSocket = require('level-socket')
var fs = require('fs')
var url = require('url')
var path = require('path')

module.exports = function(opts) {
  
  opts.onRequest = function(req, res, profile, handled) {
    if (profile.sessionExpired) this.doorknob.persona.destroyCookie(res)
    if (!req.url.match(/^\/user/)) return handled(false)
    var parsed = url.parse(req.url)
    var user = parsed.pathname.split('/')[2]
    handleUser(req, res, user, profile)
    handled(true)
  }
  
  var server = levelSocket(opts)
  var doorknob = server.httpServer.doorknob
  
  return server

  function handleUser(req, res, user, profile) {
    var method = req.method
    if (method === 'GET') return getUser(req, res, user, profile)
    if (method === 'POST' || method === 'PUT') return saveUser(req, res, user, profile)
    res.end('')
  }

  function getUser(req, res, user, profile) {
    var db = doorknob.db
    var users = db.sublevel('users')
    var profiles = db.sublevel('profiles')
    users.get(user, function(err, email) {
      res.setHeader('content-type', 'application/json')
      var status = 200
      if (err) status = 500
      if (!email) status = 404
      res.statusCode = status
      var body = {}
      if (err) body = {error: err.message}
      if (!user) body = {notFound: true}
      if (!user) return res.end(JSON.stringify(body))
      profiles.get(email, function(err, profile) {
        profile = profile || {}
        delete profile.email
        return res.end(JSON.stringify(profile))
      })
    })
  }

  // todo DRY this function
  function saveUser(req, res, user, profile) {
    res.setHeader('content-type', 'application/json')
    var sessionID = doorknob.persona.getId(req)
    if (!profile || !profile.email || !sessionID) {
      res.statusCode = 403
      res.end(JSON.stringify({error: "not logged in"}))
      return
    }
    var db = doorknob.db
    var users = db.sublevel('users')
    var profiles = db.sublevel('profiles')
    users.get(user, function(err, email) {
      if (email) {
        res.statusCode = 409
        res.end(JSON.stringify({error: 'user already exists'}))
        return
      }
      users.put(user, profile.email, function(err) {
        if (err) {
          res.statusCode = 500
          res.end(JSON.stringify({error: err}))
          return
        }
        profile.username = user
        profiles.put(profile.email, profile, function(err) {
          if (err) {
            res.statusCode = 500
            res.end(JSON.stringify({error: err}))
            return
          }
          res.end(JSON.stringify({ created: true }))
        })
      })
    })
  }
}
