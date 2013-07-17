var createGame = require('voxel-hello-world')
var fly = require('voxel-fly')
var voxelLevel = require('voxel-level')
var workerstream = require('workerstream')
var blockInfo = require('minecraft-blockinfo')
var walk = require('voxel-walk')

var loadDelay = 1000 // milliseconds

module.exports = {
  initGame: initGame,
  saveRegion: saveRegion
}

function getState(game) {
  var state = {}
  var target = game.controls.target()
  state.player = {
    position: target.avatar.position,
    rotation: target.avatar.rotation
  }
  return state
}

function storeState(db, game, worldName, seed, cb) {
  if (!cb) cb = function noop(){}
  return setInterval(function() {
    var state = getState(game)
    if (seed) state.seed = seed
    db.put(worldName + '|state', state, cb)
  }, 5000)
}

function initGame(options) {
  $('.content').hide()

  var textures = "http://commondatastorage.googleapis.com/voxeltextures/painterly/"

  var materials = []
  
  Object.keys(blockInfo.blocks).map(function(b) {
    var type = blockInfo.blocks[b].type
    var id = blockInfo.blocks[b].id
    materials[id - 1] = type
  })
  
  var pos = [0, 0, 0]
  var chunkDimensions = [16, 16, 16]
  var gameChunkSize = 16
  
  initDB(initRendering)
  
  function initDB(cb) {
    var level = voxelLevel('blocks', function(err) {
      if (err) return cb(err.message)
      level.db.get(options.worldName + '|state', { asBuffer: false }, function(err, state) {
        if (!state) state = {}
        if (options.seed) state.seed = options.seed
        cb(false, level, state)
      })
    })
  }

  function initRendering(err, level, state) {
    if (err) return alert(err)
    
    var game = require('voxel-hello-world')({
      generateChunks: false,
      texturePath: textures,
      playerSkin: textures + '../player.png',
      chunkSize: gameChunkSize,
      chunkDistance: 4,
      arrayType: Uint8Array,
      worldOrigin: pos,
      // materials: materials,
      materials: ['#fff', '#6baed6', '#9ecae1', '#c6dbef', '#e6550d', '#fd8d3c', '#fdae6b', '#fdd0a2', '#31a354', '#74c476', '#a1d99b', '#c7e9c0', '#756bb1', '#9e9ac8', '#bcbddc', '#dadaeb', '#636363', '#969696', '#bdbdbd', '#d9d9d9'],
      materialFlatColor: true
    })

    window.game = game // for console debugging
    var target = game.controls.target()

    var worldWorker = workerstream('world-worker-bundle.js')
    worldWorker.on('data', function(data) {
      if (data.ready && game.paused) return startGame(game, level, state, worldWorker)
      if (data.log) return console.log(data)
      var chunk = {
        position: data.position,
        voxels: new Uint8Array(data.buffer),
        dims: data.dimensions
      }
      setTimeout(function() {
        game.showChunk(chunk)
      }, 10 + ~~(Math.random() * loadDelay))
    })
    worldWorker.on('error', function(e) { console.log('err', e)})
    worldWorker.write({ loadDB: 'blocks' })
  }
  
  function startGame(game, level, state, worldWorker) {
    
    game.voxels.on('missingChunk', function(p) {
      worldWorker.write({
        worldName: options.worldName,
        position: p,
        gameChunkSize: gameChunkSize,
        seed: state.seed
      })
    })
    
    game.on('dirtyChunkUpdate', function(chunk) {
      var storeChunk = {
        position: chunk.position.map(function(p) { return p * gameChunkSize }),
        voxels: chunk.voxels,
        dimensions: chunk.dimensions
      }
      level.store(options.worldName, storeChunk, function afterStore(err) {
        if (err) console.error('chunk store error', err)
      })
    })
    
    if (!state.player) state.player = {
      position: {x: 0, y: 10, z: 0},
      rotation: {x: 0, y: 0, z: 0}
    }

    game.paused = false
    game.flyer.startFlying()
    var avatar = game.controls.target().avatar
    avatar.position.copy(state.player.position)
    avatar.rotation.copy(state.player.rotation)
    storeState(level.db, game, options.worldName, state.seed)
  }
}

function saveRegion(buffer, worldName, regionX, regionZ, cb) {
  var progress = $('.progress.hidden')
  progress.removeClass('hidden')
  var progressBar = progress.find('.bar')
  progressBar.css('width', '0%')
  var worker = workerstream('convert-worker-bundle.js')
  worker.on('data', function(data) {
    if (data.progress) {
      progressBar.css('width', data.progress + '%')
    } else if (data.done) {
      progressBar.css('width', '100%')
      cb(data.errors)
    } else {
      console.log(data)
    }
  })
  worker.on('error', function(e) { console.log('err', e)})
  worker.write({worldName: worldName, regionX: regionX, regionZ: regionZ})
  worker.write(buffer, [buffer])
  worker.end()
}

