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
  location: 'data.db',
  whitelist: ['http://localhost:9966']
}

var server = createDoorknob(opts)

authSocket({ httpServer: server }, function onSocket(err, req, socket, head) {
  if (err && err !== 'not logged in') return console.error(err)
  else if (err && err === 'not logged in') var loggedOut = true
  var parsed = url.parse(req.url, true)
  var id = parsed.pathname.split('/')[1]
  var db = sublevel(server.doorknob.db).sublevel(id)
  // socketSync(socket, { db: db })
  var ws = websocket(socket)
  ws.pipe(process.stdout)
  var multiOpts = {}
  if (loggedOut) multiOpts = { access: accessControl }
  var multilevelServer = multilevel.server(db, multiOpts)
  ws.on('end', function() {
    multilevelServer.destroy()
  })
  ws.pipe(multilevelServer).pipe(ws)
})

function accessControl(user, db, method, args) {
  if (!user || user.name !== 'root') {
    //do not allow any write access
    if (/^put|^del|^batch|write/i.test(method)) {
      throw new Error('read-only access')
    }
  }
}

server.listen(opts.port)
console.log('localhost:' + opts.port)

