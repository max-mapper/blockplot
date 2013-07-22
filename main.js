require('./js/parallax')()

var loadUser = require('./user')
var commonStuff = require('./js/common')

var user = loadUser({dbName: 'blocks', baseURL: "http://localhost:8080" })

user.getSession(function(err, session) {
  user.session = session
  commonStuff(user)
})
