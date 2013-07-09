var loadUser = require('./user')
var commonStuff = require('./js/common')
require('./js/parallax')()

var user = loadUser({dbName: 'blocks'})
commonStuff(user)

