$(document)
  .on('click', '#scratch', createNewWorld)
  .on('click', '#import', showImportPopup)
  
var container = $('.content')

if (hoodie.account.username) route()
else notLoggedIn()

function showImportPopup(e) {
  e.preventDefault()
  Avgrund.show('#import-popup')
}

function createNewWorld(e) {
  e.preventDefault()
  
}

function newWorld() {
  container.html($('.newWorld').html())
}

function loadWorld(id) {
  console.log('load world', id)
}

function notLoggedIn() {
  container.html($('.notLoggedIn').html())
  
}

function route() {
  var hash = window.location.hash
  if (hash.length === 0) newWorld()
  else loadWorld(hash.slice(1, hash.length))
}

hoodie.account.on('signin signout', function() {
  try { Avgrund.hide() } catch(e){ }
  if (hoodie.account.username) route()
  else notLoggedIn()
})
