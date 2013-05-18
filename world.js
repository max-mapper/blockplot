var hoodie = require('./js/common')()
var voxelUtils = require('./js/voxel')
window.voxelUtils = voxelUtils

$(document)
  .on('click', '#scratch', createNewWorld)
  .on('click', '#import', showImportPopup)
  .on('change', '#file', handleFileSelect)

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

function handleFileSelect(evt) {
  var files = evt.target.files
  var file = files[0]
  var parts = file.name.split('.')
  if (parts[0] !== 'r' && parts[3] !== 'mca') return
  var reader = new FileReader()
  reader.onloadend = function() {
    voxelUtils.saveRegion(reader.result, parseInt(parts[1]), parseInt(parts[2]), {}, function(errs) {
      if (errs) console.log(errs)
      try { Avgrund.hide() } catch(e){ }
      voxelUtils.initGame()
    })
  }
  reader.readAsArrayBuffer(file)
}
