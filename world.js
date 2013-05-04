var hoodie = require('./js/common')()
var mca2js = require('mca2js')
var leveljs = require('level-js')
window.db = leveljs('blocks')
db.open(function onopen() { })

var crunch = require('voxel-crunch')

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
  var pending = 0
  var count = 0
  var done = false
  reader.onloadend = function() {
    var converter = mca2js()
    console.time('load')
    converter.on('data', function(chunk) {
      pending++
      count++
      console.log(count)
      var rle = crunch.encode(chunk.voxels)
      var key = chunk.position.join('|')
      key += '|' + chunk.voxels.length
      db.put(key, rle, function (err) {
        if (err) console.error(chunk, err)
        pending--
        if (done && pending === 0) console.timeEnd('load')
      })
      // crunch.decode(rle, new Uint32Array(chunk.voxels.length))
    })
    converter.on('end', function(){
      done = true
    })
    converter.convert(reader.result, parts[1], parts[2])
  }
  reader.readAsArrayBuffer(file)
}
