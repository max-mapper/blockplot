var loadUser = require('./user')
var commonStuff = require('./js/common')

var user = loadUser({dbName: 'blocks'})

user.getSession(function(err, session) {
  user.session = session
  loadWorld(user)
  commonStuff(user)
})

function loadWorld(user) {
  var voxelUtils = require('./js/voxel')
  var voxelLevel = require('voxel-level')
  window.voxelUtils = voxelUtils
  var level, worldName, userName

  $(document)
    .on('click', '#scratch', createNewWorld)
    .on('click', '#import', showImportPopup)
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
    userName = names[0]
    worldName = names[1]
  }

  level = voxelLevel('blocks', function ready() {
    if (user.session) route()
    else notLoggedIn()
  })

  function showImportPopup(e) {
    e.preventDefault()
    Avgrund.show('#import-popup')
  }

  function createNewWorld(e) {
    voxelUtils.initGame({ worldName: userName + '/' + worldName, seed: 'foo' })
    e.preventDefault()
  }

  function newWorld() {
    container.html($('.newWorld').html())
  }

  function loadWorld(user, id, seed) {
    // verify that there is world data to load
    var levelName = user + '/' + id
    var iter = level.db.iterator({ start: levelName, limit: 1 })
    iter.next(function (err, key, value) {
      if (!err && !key && !value) return
      iter.end(function(){
        if (err || !key || key.indexOf(levelName) < 0 ) {
          newWorld()
          return
        }
        voxelUtils.initGame({ worldName: levelName, seed: seed })
      })
    })
  }

  function getWorlds(cb) {
    console.log('getWorlds NOT IMPLEMENTED')
    // hoodie.store.findAll('world')
    //   .done(function (objects) {
    //     if (objects.length === 0) return cb(false, [])
    //     cb(false, objects)
    //   })
    //   .fail(cb)
  }

  function notLoggedIn() {
    container.html($('.notLoggedIn').html())
  }

  function route() {
    if (worldName) title.text(userName + ' / ' + worldName)
    loadWorld(userName, worldName)
  }

  // hoodie.account.on('signin signout', function() {
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
    var levelName = userName + '/' + worldName
    reader.onloadend = function() {
      voxelUtils.saveRegion(reader.result, levelName, parseInt(parts[1]), parseInt(parts[2]), function(errs) {
        if (errs) console.log(errs)
        try { Avgrund.hide() } catch(e){ }
        if (typeof game === 'undefined') voxelUtils.initGame({ worldName: levelName })
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
