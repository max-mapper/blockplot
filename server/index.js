var createDoorknob = require('doorknob/server')
var authSocket = require('auth-socket')
// var socketSync = require('socket-sync')
var sublevel = require('level-sublevel')
var multilevel = require('multilevel')
var websocket = require('websocket-stream')
var url = require('url')

var opts = {
  staticPath: './www',
  port: 8080,
  devMode: false,
  location: 'data.db'
}

var server = createDoorknob(opts)

authSocket({ httpServer: server }, function onSocket(err, req, socket, head) {
  if (err) return console.error('authsocket error', err)
  var parsed = url.parse(req.url, true)
  var id = parsed.pathname.split('/')[1]
  // var db = sublevel(server.doorknob.db).sublevel(id)
  // socketSync(socket, { db: db })
  var ws = websocket(socket)
  console.log(server.doorknob.db)
  ws.pipe(multilevel.server(server.doorknob.db)).pipe(ws)
  ws.pipe(process.stdout)
})

server.listen(opts.port)
console.log('localhost:' + opts.port)