var path = require('path')

var opts = {
  staticPath: path.join(__dirname, 'auth-www'),
  port: 8080,
  devMode: false,
  location: path.join(__dirname, 'auth.db'),
  whitelist: ['http://localhost:9966']
}

var server = require('./')(opts).httpServer

server.listen(opts.port, function() {
  console.log('auth server running on', opts.port)
})