var levelUser = require('level-user')
var worker = require('webworkify')
var worldManager = require('./world-manager')
var commonStuff = require('./common')
var voxelUtils = require('./voxel')
window.voxelUtils = voxelUtils

var user = levelUser({dbName: 'blocks', baseURL: "http://localhost:8080" })
window.user = user

user.getProfile(function(err, profile) {
  user.profile = profile
  beginLoadingWorld(user)
  commonStuff(user)
})

function beginLoadingWorld(user) {
  var worldID, userName
  var worlds = worldManager(user)
  
  $(document)
    .on('click', '#scratch', createNewWorld)
    .on('click', '#import', showImportPopup)
    .on('click', '.menu-buttons .settings', openSettings)
    .on('change', '#file', handleFileSelect)

  var container = $('.content')
  var title = $('.world-title')
  var pageLoading = $('.page-loading')

  var hash = window.location.hash
  worldID = hash.substr(1, hash.length - 1)

  worlds.load(worldID, false, function(err, world) {
    if (world && world.name) title.append(world.name)
    if (world && !world.state) return newWorld()
    pageLoading.addClass('hidden')
    voxelUtils.initGame(user, world)
  })
  
  function openSettings() {
    worlds.db.get(worldID, function(err, world) {
      var iframe
      var settings = $('#settings-popup')
      var info = settings.find('.info')
      var publish = info.find('.publish')
      var destroy = info.find('.destroy')
      var loggedOut = info.find('.loggedOut')
      settings.find('h3').text(world.name)
      
      Avgrund.show( "#settings-popup" )
      
      if (!world.state)  {
        loggedOut.addClass('hidden')
        return info.find('.state').text('No world data to publish')
      }
      
      info.find('.state').text('State: ' + (world.published ? 'Published': 'Unpublished'))
      
      user.getProfile(function(err, profile) {
        destroy.removeClass('hidden')
        if (err || !profile || !profile.username) {
          loggedOut.removeClass('hidden')
          publish.addClass('hidden')
        } else {
          publish.removeClass('hidden')
          loggedOut.addClass('hidden')
        }
      })
      
      function showIframe() {
        settings.find('iframe').remove()
        iframe = document.createElement('iframe')
        iframe.seamless = 'seamless'
        iframe.src = user.options.baseURL
        settings[0].appendChild(iframe)
      }
      
      showIframe()

      var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent"
      var eventer = window[eventMethod]
      var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message"
      
      eventer(messageEvent, function (e) {
        if (e.data && e.data === 'process-tick') return
        if (!e.data) return
        try { var data = JSON.parse(e.data) }
        catch (e) { var data = {} }
        destroy.removeClass('hidden')
        if ( !data.login) {
          loggedOut.removeClass('hidden')
          publish.addClass('hidden')
        } else {
          publish.removeClass('hidden')
          loggedOut.addClass('hidden')
        }
      }, false)
      
      publish.click(function(e) {
        var state = settings.find('.state')
        state.text('State: Publishing...')
        worlds.publish(world, function(err) {
          if (err) return state.text('error ' + err.message)
          state.text('State: Published!')
        })
      })
      
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
  }

  function createNewWorld(e) {
    e.preventDefault()
    worlds.create(worldID, function(err, world) {
      if (err) console.error('world create error', err)
      voxelUtils.initGame(user, world)
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
    if (parts[0] !== 'r' && parts[3] !== 'mca') return
    var reader = new FileReader()
    var regionX = parseInt(parts[1])
    var regionZ = parseInt(parts[2])
    reader.onloadend = function() {
      saveRegion(reader.result, regionX, regionZ)
    }
    reader.readAsArrayBuffer(file)
  }
  
  function saveRegion(buffer, regionX, regionZ) {
    var startedGame = false
    if (typeof game !== 'undefined') startedGame = game // global game
    if (!startedGame) {
      pageLoading.removeClass('hidden')
      container.hide()
    }
    var progress = $('.progress.hidden')
    progress.removeClass('hidden')
    var progressBar = progress.find('.bar')
    progressBar.css('width', '0%')
    var convertWorker = worker(require('./convert-worker.js'))
    try { Avgrund.hide() } catch(e){ }
    convertWorker.addEventListener('message', function(ev) {
      var data = ev.data || {}
      if (typeof data.progress !== 'undefined') {
        progressBar.css('width', data.progress + '%')
        if (data.length > 80 && !startedGame) {
          var pos = data.position
          var state = { player: {
            position: {x: pos[0], y: pos[1], z: pos[2]},
            rotation: {x: 0, y: 0, z: 0}
          }}
          pageLoading.addClass('hidden')
          startedGame = voxelUtils.initGame(user, { id: worldID, state: state })
        }
        if (data.length > 80 && startedGame) {
          var pos = data.position
          var from = game.controls.target().avatar.position
          var to = new game.THREE.Vector3(pos[0], pos[1], pos[2])
          if ((from.distanceTo(to) / 16) <= game.chunkDistance) {
            var chunkPos = data.position.map(function(p) { return p / 16 })
            startedGame.voxels.emit('missingChunk', chunkPos)
          }
        }
      } else if (data.done) {
        progressBar.css('width', '0%')
        progress.addClass('hidden')
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