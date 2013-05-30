var hoodie = require('./js/common')()
var voxelUtils = require('./js/voxel')
var voxelLevel = require('voxel-level')
window.voxelUtils = voxelUtils
var level

var worldName = window.location.hash
if (worldName.length < 2) worldName = false
else worldName = worldName.substr(1, worldName.length - 1)

$(document)
  .on('click', '#scratch', createNewWorld)
  .on('click', '#import', showImportPopup)
  .on('change', '#file', handleFileSelect)

var container = $('.content')

level = voxelLevel('blocks', function ready() {
  if (hoodie.account.username) route()
  else notLoggedIn()
})

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
  // verify that there is world data to load
  var iter = level.db.iterator({ start: worldName, limit: 1 })
  iter.next(function (err, key, value) {
    iter.end(function(){
      if (err || !key || key.indexOf(worldName) < 0 ) {
        newWorld()
        return
      }
      voxelUtils.initGame({ worldName: worldName })
    })
  })
}

function notLoggedIn() {
  container.html($('.notLoggedIn').html())
}

function route() {
  var hash = window.location.hash
  if (hash.length === 0) return document.location.href = "/"
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
    voxelUtils.saveRegion(reader.result, worldName, parseInt(parts[1]), parseInt(parts[2]), function(errs) {
      if (errs) console.log(errs)
      try { Avgrund.hide() } catch(e){ }
      voxelUtils.initGame({ worldName: worldName })
    })
  }
  reader.readAsArrayBuffer(file)
}

function clearData (callback) {
  if (!callback) callback = function() { console.log('done clearing') }
  indexedDB.webkitGetDatabaseNames().onsuccess = function(e){
    var list = e.target.result
    if (!list) return callback()
    var dbs = []
    for (var i = 0; i < list.length; i++) dbs.push(list[i])
    
    if (!dbs.length) return callback()

    var ret = 0

    function done (e) {
      if (++ret == dbs.length) callback()
    }
    
    dbs.forEach(function (f) {
      indexedDB.deleteDatabase(f)
        .onsuccess = done
        .onerror = done
    })
  }
}

window.clearData = clearData