var loadUser = require('./user')
var commonStuff = require('./js/common')
require('./js/parallax')()

loadUser({}, function(err, user) {
  commonStuff(user)
})
