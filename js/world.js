var levelup = require('levelup')
var leveljs = require('level-js')
var sublevel = require('level-sublevel')
var binaryXHR = require('binary-xhr')
var worker = require('webworkify')
var zlib = require('zlib')
var NbtReader = require('node-nbt').NbtReader
var concat = require('concat-stream')
var createReadStream = require('filereader-stream')
var worldManager = require('./world-manager')
var commonStuff = require('./common')
var voxelUtils = require('./voxel')
window.voxelUtils = voxelUtils

// make camera look at front of player
// var target = game.controls.target()
// target.avatar.cameraOutside.lookAt(target.avatar.cameraOutside.worldToLocal(target.avatar.matrixWorld.getPosition()))
// target.avatar.cameraOutside.position.z = -100

var db = sublevel(levelup('blockplot', {
  db: leveljs,
  valueEncoding: 'json'
}))

beginLoadingWorld(db)
commonStuff(db)

function beginLoadingWorld(db) {
  var worldID, userName
  var worlds = worldManager(db)
  
  $(document)
    .on('click', '#scratch', loadDemoWorld)
    .on('click', '#import', showImportPopup)
    .on('click', '.menu-buttons .settings', openSettings)
    .on('change', '#file', handleFileSelect)

  var container = $('.content')
  var title = $('.world-title')
  var pageLoading = $('.page-loading')

  var hash = window.location.hash
  worldID = hash.substr(1, hash.length - 1)

  worlds.load(worldID, function(err, world) {
    if (world && world.name) title.append(world.name)
    if (world && !world.state) return newWorld()
    pageLoading.addClass('hidden')
    voxelUtils.initGame(db, world)
  })
  
  function openSettings() {
    worlds.db.get(worldID, function(err, world) {
      var settings = $('#settings-popup')
      var info = settings.find('.info')
      var destroy = info.find('.destroy')
      var loggedOut = info.find('.loggedOut')
      settings.find('h3').text(world.name)
      
      Avgrund.show( "#settings-popup" )
      
      if (!world.state)  {
        loggedOut.addClass('hidden')
        return info.find('.state').text('No world data yet!')
      }
            
      destroy.removeClass('hidden')
            
      destroy.click(function(e) {
        var state = settings.find('.state')
        state.text('State: Destroying...')
        worlds.destroy(world, function(err) {
          if (err) return state.text('error ' + err.message)
          state.text('State: Destroyed!!')
          window.location.href = "/"
        })
      })
    })
  }
  
  function showImportPopup(e) {
    e.preventDefault()
    try { Avgrund.hide() } catch(e){ }
    Avgrund.show('#import-popup')
    var chunksImported = $('.chunks-imported')
    var currentChunk = $('.current-chunk')
    chunksImported.text('')
    currentChunk.text('')
    if (typeof game !== 'undefined') {
      var pos = game.controls.target().avatar.position
      var current = 'r.'
        + Math.floor((pos.x >> 4) / 32)+ '.'
        + Math.floor((pos.z >> 4) / 32)
      currentChunk.text('You are currently standing in ' + current)
    }
    worlds.db.get(worldID, function(err, world) {
      if (err) return console.error('world get err', err)
      if (world.chunksImported) {
        var list = Object.keys(world.chunksImported).join(', ')
        chunksImported.text('Already imported: ' + list + '.')
      }
    })
  }

  function loadDemoWorld(e) {
    e.preventDefault()
    pageLoading.removeClass('hidden')
    container.hide()
    binaryXHR('r.0.-1.mca', function(err, arrayBuffer) {
      var startState = {"position":{"x":333.555698517669,"y":38,"z":-322.96095406781353},"rotation":{"x":0,"y":-2.0880000000000014,"z":0}}
      saveRegion(arrayBuffer, 0, -1, startState)
    })
    return false
  }

  function newWorld() {
    pageLoading.addClass('hidden')
    container.html($('.newWorld').html())
  }
  
  function notLoggedIn() {
    container.html($('.notLoggedIn').html())
  }

  function handleFileSelect(evt) {
    var files = evt.target.files
    var file = files[0]
    var parts = file.name.split('.')
    if (parts[1] === 'dat') {
      // must start game first
      if (typeof game === 'undefined') return
      var reader = createReadStream(file)
      reader.pipe(concat(function(contents) {
        var buffer = zlib.gunzipSync(contents)
        var d = NbtReader.readTag(buffer)
        d = NbtReader.removeBufferKey(d)
        Object.keys(d.val).forEach(function(k) {
          var obj = d.val[k]
          if (obj.name === 'Pos') {
            var l = obj.val.list
            var pos = new game.THREE.Vector3(l[0].val, l[1].val, l[2].val)
            var avatar = game.controls.target().avatar
            avatar.position.copy(pos)
            try { Avgrund.hide() } catch(e){ }
          }
        })
      }))
    }
    if (parts[0] === 'r' && parts[3] === 'mca') {
      var reader = new FileReader()
      var regionX = parseInt(parts[1])
      var regionZ = parseInt(parts[2])
      reader.onloadend = function() {
        saveRegion(reader.result, regionX, regionZ)
      }
      reader.readAsArrayBuffer(file)
    }
  }
  
  function saveRegion(buffer, regionX, regionZ, startState) {
    var startedGame = false
    if (typeof game !== 'undefined') startedGame = game // global game
    if (!startedGame) {
      pageLoading.removeClass('hidden')
      container.hide()
    }
    var regionName = 'r.' + regionX + '.' + regionZ
    var progress = $('.progress.hidden')
    progress.removeClass('hidden')
    var progressBar = progress.find('.bar')
    progressBar.css('width', '0%')
    var convertWorker = worker(require('./convert-worker.js'))
    try { Avgrund.hide() } catch(e){ }
    var defaultPosition = null
    convertWorker.addEventListener('message', function(ev) {
      var data = ev.data || {}
      if (typeof data.progress !== 'undefined') {
        progressBar.css('width', data.progress + '%')
        if (data.length > 80 && !startedGame) {
          var pos = data.position
          var defaultState = {
            position: {x: pos[0], y: pos[1], z: pos[2]},
            rotation: {x: 0, y: 0, z: 0}
          }
          if (defaultPosition) {
            defaultState.position = defaultPosition
          }
          var state = {player: startState || defaultState}
          pageLoading.addClass('hidden')
          startedGame = voxelUtils.initGame(db, { id: worldID, state: state })
        }
        if (data.length > 80 && startedGame) {
          var pos = data.position
          var from = game.controls.target().avatar.position
          var to = new game.THREE.Vector3(pos[0], pos[1], pos[2])
          if ((from.distanceTo(to) / 16) <= game.chunkDistance) {
            var chunkPos = data.position.map(function(p) { return p / 16 })
            startedGame.voxels.emit('missingChunk', chunkPos)
          }
          if (defaultPosition && !startState) {
            // Attempt to move the player to a better default position
            setTimeout(function() {
              var avatar = startedGame.controls.target().avatar
              avatar.position.copy(defaultPosition)
            }, 500)
          }
        }
      } else if (data.done) {
        progressBar.css('width', '0%')
        progress.addClass('hidden')
        worlds.db.get(worldID, function(err, world) {
          if (err) return console.error('world get err', err)
          if (!world.chunksImported) world.chunksImported = {}
          world.chunksImported[regionName] = true
          worlds.db.put(worldID, world, function(err) {
            if (err) return console.error('world put err', err)
          })
        })
      } else if (data.defaultPosition) {
        defaultPosition = {
          x: data.defaultPosition[0],
          y: data.defaultPosition[1],
          z: data.defaultPosition[2]
        }
      } else {
        console.log('convert-worker', data)
      }
    })
    convertWorker.postMessage({worldID: worldID, regionX: regionX, regionZ: regionZ})
    convertWorker.postMessage(buffer, [buffer])
  }
  
  function regionToBlock(regionX, regionZ) {
    var minChunkX = regionX * 32
    var minChunkZ = regionZ * 32
    var maxChunkX = (regionX + 1) * 32 - 1
    var maxChunkZ = (regionZ + 1) * 32 - 1
    var minBlockX = minChunkX << 4
    var minBlockZ = minChunkZ << 4
    return [minBlockX, minBlockZ]
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
}