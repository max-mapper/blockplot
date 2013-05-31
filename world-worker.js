var voxelLevel = require('voxel-level')
var bundle = require('voxel-bundle')
var blockInfo = require('minecraft-blockinfo')
var level

window = self
console = {log: function(msg) { self.postMessage({log: msg}) }}

function loadChunk(worldName, position, gameChunkSize) {
  var p = position
  var cs = gameChunkSize
  var dimensions = [cs, cs, cs]
  var chunkPosition = [p[0] * cs, p[1] * cs, p[2] * cs]
  level.load(worldName, chunkPosition, dimensions, function(err, chunk) {
    if (err) return
    self.postMessage({
      position: p,
      buffer: chunk.voxels.buffer,
      dimensions: chunk.dimensions
    }, [chunk.voxels.buffer])
  })
}

self.onmessage = function(event) {
  if (!level) return level = voxelLevel(event.data.loadDB, function() {
    self.postMessage({ready: true})
  })
  var data = event.data
  loadChunk(data.worldName, data.position, data.gameChunkSize)
}