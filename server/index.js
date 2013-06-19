var socketSync = require('socket-sync')

socketSync({
  staticPath: '../',
  port: 9966
})

console.log('localhost:9966')