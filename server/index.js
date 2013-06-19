var socketSync = require('socket-sync')

socketSync({
  staticPath: '../',
  port: 9966,
  devMode: true
})

console.log('localhost:9966')