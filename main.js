require('./js/parallax')()

var loadUser = require('./user')
var commonStuff = require('./js/common')

var user = loadUser({dbName: 'blocks'})

user.getSession(function(err, session) {
  user.session = session
  commonStuff(user)
})
