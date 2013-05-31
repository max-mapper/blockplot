var createGame = require('voxel-hello-world')
var fly = require('voxel-fly')
var voxelLevel = require('voxel-level')
var workerstream = require('workerstream')
var blockInfo = require('minecraft-blockinfo')

module.exports = {
  initGame: initGame,
  saveRegion: saveRegion
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
  
  var game = require('voxel-hello-world')({
    generateChunks: false,
    texturePath: textures,
    playerSkin: textures + '../player.png',
    chunkSize: gameChunkSize,
    chunkDistance: 4,
    arrayType: Uint8Array,
    worldOrigin: pos,
    materials: materials
  })
  
  function startGame() {
    game.paused = false
    window.game = game // for console debugging
    var makeFly = fly(game)
    makeFly(game.controls.target()).startFlying()
    game.controls.target().avatar.position.copy({x: pos[0], y: pos[1], z: pos[2]})
  }
  
  var worldWorker = workerstream('world-worker-bundle.js')
  worldWorker.on('data', function(data) {
    if (data.ready && game.paused) return startGame()
    var chunk = {
      position: data.position,
      voxels: new Uint8Array(data.buffer),
      dims: data.dimensions
    }
    game.showChunk(chunk)
  })
  worldWorker.on('error', function(e) { console.log('err', e)})
  worldWorker.write({ loadDB: 'blocks' })
  
  game.voxels.on('missingChunk', function(p) {
    worldWorker.write({
      worldName: options.worldName,
      position: p,
      gameChunkSize: gameChunkSize
    })
  })
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

