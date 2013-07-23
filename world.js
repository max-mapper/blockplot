var loadUser = require('./user')
var commonStuff = require('./js/common')

var user = loadUser({dbName: 'blocks', baseURL: "http://localhost:8080" })
window.user = user

user.getSession(function(err, session) {
  user.session = session
  beginLoadingWorld(user)
  commonStuff(user)
})

function beginLoadingWorld(user) {
  var voxelUtils = require('./js/voxel')
  window.voxelUtils = voxelUtils
  var worldName, userName
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
  if (hash.length < 2) worldName = false
  else hash = hash.substr(1, hash.length - 1)

  var names = hash.split('/')
  if (names.length < 2) {
    return document.location.href = "/"
    worldName = false
  } else {
    userName = names[0] || 'anonymous'
    worldName = names[1]
  }

  // if (user.session && user.session.email) route()
  // else notLoggedIn()

  route()
  
  function openSettings() {
    worldsDB.get(worldName, function(err, world) {
      var settings = $('#settings-popup')
      settings.find('h3').text(worldName)
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
        var remote = user.remote(world.name)
        var local = user.db.sublevel(world.name)
        user.remote('worlds').put(world.name, world, {valueEncoding: 'json'}, function(err) {
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
    worldsDB.get(worldName, function(err, world) {
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
    var opts = { name: worldName, seed: 'foo', published: false }
    worldsDB.put(worldName, opts, function(err) {
      if (err) return console.error(err)
      voxelUtils.initGame(user, opts)
    })
    e.preventDefault()
  }

  function newWorld() {
    container.html($('.newWorld').html())
  }

  function loadWorld(user, worldName, seed) {
    worldsDB.get(worldName, { asBuffer: false }, function(err, data) {
      if (err || !data || !data.state) {
        var remote = user.remote('worlds')
        remote.get(worldName, {valueEncoding: 'json'}, function(err, world) {
          if (err || !world) return newWorld()
          var local = user.db.sublevel('worlds')
          local.put(worldName, world, {valueEncoding: 'json'}, function(err) {
            if (err) console.error('local world save err', err)
            user.copy(user.remote(worldName), user.db.sublevel(worldName), function() {
              voxelUtils.initGame(user, world)
            })
          })
        })
      } else {
        voxelUtils.initGame(user, data)
      }
    })
  }
  
  function notLoggedIn() {
    container.html($('.notLoggedIn').html())
  }

  function route() {
    if (worldName) title.text(userName + ' / ' + worldName)
    loadWorld(user, worldName)
  }

  // on('signin signout', function() {
  //     try { Avgrund.hide() } catch(e){ }
  //     if (hoodie.account.username) route()
  //     else notLoggedIn()
  //   })

  function handleFileSelect(evt) {
    var files = evt.target.files
    var file = files[0]
    var parts = file.name.split('.')
    if (parts[0] !== 'r' && parts[3] !== 'mca') return
    var reader = new FileReader()
    var regionX = parseInt(parts[1])
    var regionZ = parseInt(parts[2])
    reader.onloadend = function() {
      voxelUtils.saveRegion(reader.result, userName, worldName, regionX, regionZ, function(errs) {
        if (errs) console.log(errs)
        try { Avgrund.hide() } catch(e){ }
        if (typeof game === 'undefined') {
          var blockPos = regionToBlock(regionX, regionZ)
          var state = { player: {
            position: {x: blockPos[0], y: 65, z: blockPos[1]},
            rotation: {x: 0, y: 0, z: 0}
          }}
          voxelUtils.initGame(user, { userName: userName, name: worldName, state: state })
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