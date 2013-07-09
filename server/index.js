var socketSync = require('socket-sync')

socketSync({
  staticPath: '../',
  port: 9966,
  devMode: false
})

console.log('localhost:9966')