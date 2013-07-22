var createDoorknob = require('doorknob/server')
var authSocket = require('auth-socket')
var socketSync = require('socket-sync')
var sublevel = require('level-sublevel')
var url = require('url')

var opts = {
  staticPath: './www',
  port: 8080,
  devMode: false
}

var server = createDoorknob(opts)

authSocket({ httpServer: server }, function onSocket(err, req, socket, head) {
  if (err) return console.error('authsocket error', err)
  var parsed = url.parse(req.url, true)
  var id = parsed.pathname.split('/')[1]
  var db = sublevel(server.doorknob.db).sublevel(id)
  socketSync(socket, { db: db })
})

server.listen(opts.port)
console.log('localhost:' + opts.port)