var createDoorknob = require('doorknob')
var authSocket = require('auth-socket')
var socketSync = require('socket-sync')
var sublevel = require('level-sublevel')

var opts = {
  staticPath: '../',
  port: 9966,
  devMode: false
}

var doorknob = createDoorknob(opts)

authSocket({ httpServer: doorknob }, function onSocket(err, req, socket, head) {
  if (err) return console.err('authsocket error', err)
  return console.log('authsocket path', req.path) // todo parse path
  socketSync(socket, { db: doorknob.db })
})

doorknob.listen(opts.port)
console.log('localhost:' + opts.port)