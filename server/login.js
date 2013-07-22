var persona = require('persona-id')()

persona.on('login', function (id) {
  window.parent.postMessage(JSON.stringify({login: id}), '*')
})

persona.on('logout', function () {
  window.parent.postMessage(JSON.stringify({logout: true}), '*')
})

// persona.set(who)

document.querySelector('.btn').addEventListener('click', function () {
  if (!persona.id) persona.identify()
  else persona.unidentify()
})