var voxelLevel = require('voxel-level')
var bundle = require('voxel-bundle')
var blockInfo = require('minecraft-blockinfo')
var level

window = self
console = {log: function(msg) { self.postMessage({log: msg}) }}

function loadChunk(worldName, position, dimensions, gameChunkSize) {
  level.load(worldName, position, dimensions, function(err, chunk) {
    if (err) return
    var chunkBundle = bundle(chunk)
    chunkBundle.extract(function(x, y, z, val, idx) {
      if (!val) return
      var cx = x - chunk.position[0]
      var cy = y - chunk.position[1]
      var cz = z - chunk.position[2]
      var cidx = cx + (cy * gameChunkSize) + (cz * gameChunkSize * gameChunkSize)
      var pos = [x, y, z]
      var type = blockInfo.blocks['_' + val].type
      self.postMessage({pos: pos, type: type})
    })
  })
}

self.onmessage = function(event) {
  if (!level) return level = voxelLevel(event.data.loadDB, function() {
    self.postMessage({ready: true})
  })
  var data = event.data
  loadChunk(data.worldName, data.position, data.dimensions, data.gameChunkSize)
}