var path = require('path')
var spawn = require('child_process').spawn

process.chdir(__dirname)

var beefy = path.join(__dirname, '..', 'node_modules', 'beefy', 'bin', 'beefy')
var beefychild = spawn(beefy, ['tests.js', '8890'])
beefychild.on('close', function (code, signal) {
  console.log('beefy closed with', signal)
})

var helpers = require('./helpers')

var server = helpers.start()
console.log('open http://localhost:8890, then view JS console')

process.once('SIGINT', function() {
  beefychild.kill('SIGHUP')
  helpers.stop(server, function() {
    console.log('\nstopped test server')
    process.exit(1)
  })
})
