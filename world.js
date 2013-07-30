var levelUser = require('level-user')
var commonStuff = require('./js/common')

var user = levelUser({dbName: 'blocks', baseURL: "http://localhost:8080" })
window.user = user

user.getProfile(function(err, profile) {
  user.profile = profile
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
              $('.page-loading').addClass('hidden')
              voxelUtils.initGame(user, world)
            })
          })
        })
      } else {
        $('.page-loading').addClass('hidden')
        voxelUtils.initGame(user, data)
      }
    })
  }
  
  function openSettings() {
    worldsDB.get(worldID, function(err, world) {
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
        if (err || !profile || !profile.username) {
          loggedOut.removeClass('hidden')
          publish.addClass('hidden')
        } else {
          destroy.removeClass('hidden')
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
        if ( !data.login) {
          loggedOut.removeClass('hidden')
          publish.addClass('hidden')
        } else {
          destroy.removeClass('hidden')
          publish.removeClass('hidden')
          loggedOut.addClass('hidden')
        }
      }, false)
      
      publish.click(function(e) {
        var state = settings.find('.state')
        state.text('State: Publishing...')
        publishWorld(world, function(err) {
          if (err) return state.text('error ' + err.message)
          state.text('State: Published!')
        })
      })
      
      destroy.click(function(e) {
        var state = settings.find('.state')
        state.text('State: Destroying...')
        destroyWorld(world, function(err) {
          if (err) return state.text('error ' + err.message)
          state.text('State: Destroyed!!')
          window.location.href = "/"
        })
      })
      
    })
  }
  
  function publishWorld(world, cb) {
    var remote = user.remote(world.id)
    var local = user.db.sublevel(world.id)
    world.published = true
    var remote = user.db.sublevel('worlds')
    var opts = {valueEncoding: 'json'}
    user.db.sublevel('worlds').put(world.id, world, opts, function(err) {
      user.remote('worlds').put(world.id, world, opts, function(err) {
        var email = user.profile.email
        user.remote('profiles').get(email, function(err, profile) {
          if (err) return cb(err)
          if (!profile.worlds) profile.worlds = {}
          profile.worlds[world.id] = world
          user.remote('profiles').put(email, profile, opts, function(err, profile) {
            if (err) return cb(err)
            user.copy(local, remote, cb)
          })
        })
      })
    })
  }
  
  function destroyWorld(world, cb ) {
    var remote = user.remote('worlds')
    var local = user.db.sublevel('worlds')
    var pending = 3
    var errors = []
    user.destroy(local, function(err) {
      if (err) errors.push(err)
      pending--
      if (!pending) cb(errors.length ? errors : undefined)
    })
    user.destroy(remote, function(err) {
      if (err) errors.push(err)
      pending--
      if (!pending) cb(errors.length ? errors : undefined)
    })
    local.del(world.id, function(err) {
      if (err) errors.push(err)
      remote.del(world.id, function(err) {
        if (err) errors.push(err)
        pending--
        if (!pending) cb(errors.length ? errors : undefined)
      })
    })
  }
  
  function showImportPopup(e) {
    e.preventDefault()
    Avgrund.show('#import-popup')
  }

  function createNewWorld(e) {
    e.preventDefault()
    worldsDB.get(worldID, function(err, world){
      world.seed = 'foo'
      worldsDB.put(worldID, world, {valueEncoding: 'json'},function(err) {
        if (err) return console.error(err)
        voxelUtils.initGame(user, world)
      })
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