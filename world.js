var loadUser = require('./user')
var commonStuff = require('./js/common')

var user = loadUser({dbName: 'blocks', baseURL: "http://localhost:8080" })

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

  if (user.session) route()
  else notLoggedIn()

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
        var sync = user.sync(world.name)
        sync.on('data', function(c) {
          console.log('stream', new Int8Array(c))
        })
        sync.on('error', function(e) {
          console.log('sync err', e, e.message)
        })
        sync.on('end', function() {
          console.log('sync closed')
        })
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
      if (err) return console.err(err)
      voxelUtils.initGame(user, opts)
    })
    e.preventDefault()
  }

  function newWorld() {
    container.html($('.newWorld').html())
  }

  function loadWorld(user, worldName, seed) {
    worldsDB.get(worldName, { asBuffer: false }, function(err, data) {
      if (err || !data || !data.state) return newWorld()
      voxelUtils.initGame(user, data)
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
    reader.onloadend = function() {
      voxelUtils.saveRegion(reader.result, userName, worldName, parseInt(parts[1]), parseInt(parts[2]), function(errs) {
        if (errs) console.log(errs)
        try { Avgrund.hide() } catch(e){ }
        if (typeof game === 'undefined') voxelUtils.initGame(user, { userName: userName, worldName: worldName })
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
}