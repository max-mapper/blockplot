var levelUser = require('level-user')
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

  var hash = window.location.hash
  worldID = hash.substr(1, hash.length - 1)

  worlds.load(worldID, false, function(err, world) {
    if (world && world.name) title.append(world.name)
    if (err && !world) return newWorld()
    $('.page-loading').addClass('hidden')
    console.log('initgame', err, world)
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
    $('.page-loading').addClass('hidden')
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
  
  function saveRegion(regionFile, regionX, regionZ) {
    voxelUtils.saveRegion(regionFile, worldID, regionX, regionZ, function(errs) {
      if (errs) console.log(errs)
      try { Avgrund.hide() } catch(e){ }
      if (typeof game === 'undefined') {
        var blockPos = regionToBlock(regionX, regionZ)
        var state = { player: {
          position: {x: blockPos[0], y: 65, z: blockPos[1]},
          rotation: {x: 0, y: 0, z: 0}
        }}
        voxelUtils.initGame(user, { id: worldID, state: state })
      }
    })
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