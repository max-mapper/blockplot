var path = require('path')
var leveldown = require('leveldown')

module.exports = {
  start: start,
  stop: stop
}

function start() {
  var opts = {
    staticPath: path.join(__dirname, '..', 'server', 'auth-www'),
    port: 8889,
    audience: 'http://localhost:8889',
    devMode: false,
    location: path.join(__dirname, 'test.db'),
    whitelist: ['http://localhost:8890'],
    verbose: true
  }

  var server = require('../server')(opts).httpServer
  server.sockets = []
  server.on('connection', function (socket) { server.sockets.push(socket) })
  server.listen(opts.port, function() {})
  return server
}

function stop(server, cb) {
  server.close()
  server.sockets.map(function(socket) { socket.destroy() })
  server.doorknob.db.close(function() {
    leveldown.destroy(path.join(__dirname, 'test.db'), cb)
  })
}
