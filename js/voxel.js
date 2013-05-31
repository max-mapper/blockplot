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
    materials.push(type)
  })

  var pos = [0, 0, 0]
  var chunkDimensions = [16, 16, 16]
  var gameChunkSize = 16
  // var regionX = Math.floor((pos[0] >> 4) / 32)
  // var regionZ = Math.floor((pos[2] >> 4) / 32)
  
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
  
  var worldWorker = workerstream('world-worker.js')
  worldWorker.on('data', function(data) {
    if (data.ready && game.paused) return startGame()
    game.setBlock(data.pos, data.type)
  })
  worldWorker.on('error', function(e) { console.log('err', e)})
  worldWorker.write({ loadDB: 'blocks' })
  
  game.voxels.on('missingChunk', function(p) {
    var chunkPosition = [p[0] * gameChunkSize, p[1] * gameChunkSize, p[2] * gameChunkSize]
    var empty = {
      position: p,
      voxels: new Uint8Array(gameChunkSize * gameChunkSize * gameChunkSize),
      dims: [gameChunkSize, gameChunkSize, gameChunkSize]
    }
    game.showChunk(empty)
    worldWorker.write({
      worldName: options.worldName,
      position: chunkPosition,
      dimensions: empty.dims,
      gameChunkSize: gameChunkSize
    })
  })
}

function saveRegion(buffer, worldName, regionX, regionZ, cb) {
  var progress = $('.progress.hidden')
  progress.removeClass('hidden')
  var progressBar = progress.find('.bar')
  progressBar.css('width', '0%')
  var worker = workerstream('convert-worker.js')
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
  worker.write(buffer)
  worker.end()
}

