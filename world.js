var levelUser = require('level-user')
var commonStuff = require('./js/common')

var user = levelUser({dbName: 'blocks', baseURL: "http://localhost:8080" })
window.user = user

user.getSession(function(err, session) {
  user.session = session
  beginLoadingWorld(user)
  commonStuff(user)
})

function beginLoadingWorld(user) {
  var voxelUtils = require('./js/voxel')
  window.voxelUtils = voxelUtils
  var worldID, userName
  var worldsDB = user.db.sublevel('worlds')

  $(document)
    .on('click', '#scratch', createNewWorld)
    .on('click', '#import', showImportPopup)
    .on('click', '.menu-buttons .settings', openSettings)
    .on('click', '.toggle-publish', togglePublish)
    .on('change', '#file', handleFileSelect)

  var container = $('.content')
  var title = $('.title')

  var hash = window.location.hash
  worldID = hash.substr(1, hash.length - 1)

  loadWorld(user, worldID)
  
  function loadWorld(user, worldID, seed) {
    worldsDB.get(worldID, { asBuffer: false }, function(err, data) {
      if (data && data.name) title.text(data.name)
      if (err || !data || !data.state) {
        var remote = user.remote('worlds')
        remote.get(worldID, {valueEncoding: 'json'}, function(err, world) {
          if (err || !world) return newWorld()
          var local = user.db.sublevel('worlds')
          local.put(world.id, world, {valueEncoding: 'json'}, function(err) {
            if (err) console.error('local world save err', err)
            user.copy(user.remote(worldID), user.db.sublevel(worldID), function() {
              voxelUtils.initGame(user, world)
            })
          })
        })
      } else {
        voxelUtils.initGame(user, data)
      }
    })
  }
  
  function openSettings() {
    worldsDB.get(worldID, function(err, world) {
      var settings = $('#settings-popup')
      settings.find('h3').text(world.name)
      settings.find('.state').text('State: ' + (world.published ? 'Published': 'Unpublished'))
      
      var iframe = document.createElement('iframe')
      iframe.seamless = 'seamless'
      iframe.src = user.options.baseURL
      settings[0].appendChild(iframe)

      var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent"
      var eventer = window[eventMethod]
      var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message"
      
      eventer(messageEvent, function (e) {
        if (!e.data) return
        try { var data = JSON.parse(e.data) }
        catch (e) { var data = {} }
        if ( !data.login) return
        settings[0].removeChild(iframe)
        settings.find('.state').text('State: Publishing...')
        var remote = user.remote(world.id)
        var local = user.db.sublevel(world.id)
        user.remote('worlds').put(world.id, world, {valueEncoding: 'json'}, function(err) {
          if (err) return settings.find('.state').text('error ' + err.message)
          user.copy(local, remote, function(){
            settings.find('.state').text('State: Published!')
          })
        })
        // var sync = user.sync(world.name)
      }, false)
      
      Avgrund.show( "#settings-popup" )
    })
  }
  
  function togglePublish() {
    worldsDB.get(worldID, function(err, world) {
      if (world.published) unpublishWorld(world)
      else publishWorld(world)
    })
  }
  
  function publishWorld(world) {
    
  }
  
  function unpublishWorld(world) {
    
  }
  
  function showImportPopup(e) {
    e.preventDefault()
    Avgrund.show('#import-popup')
  }

  function createNewWorld(e) {
    e.preventDefault()
    worldsDB.get(worldID, function(err, world){
      world.seed = 'foo'
      worldsDB.put(worldID, world, function(err) {
        if (err) return console.error(err)
        voxelUtils.initGame(user, world)
      })
    })
    return false
  }

  function newWorld() {
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
      voxelUtils.saveRegion(reader.result, worldID, regionX, regionZ, function(errs) {
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
    reader.readAsArrayBuffer(file)
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