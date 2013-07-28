require('./js/parallax')()

var levelUser = require('level-user')
var commonStuff = require('./js/common')

var user = levelUser({dbName: 'blocks', baseURL: "http://localhost:8080" })

user.getProfile(function(err, profile) {
  user.profile = profile
  commonStuff(user)
})
