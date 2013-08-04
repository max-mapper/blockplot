var terrain = require('voxel-perlin-terrain')
var leveljs = require('level-js')
var sublevel = require('level-sublevel')
var levelup = require('levelup')
var voxelLevel = require('voxel-level')
var bundle = require('voxel-bundle')
var blockInfo = require('minecraft-blockinfo')

module.exports = function() {
  var level, generateChunk

  window = self
  console = {log: function(msg) { self.postMessage({log: msg}) }}

  function loadChunk(worldID, position, gameChunkSize, seed) {
    if (seed && !generateChunk) generateChunk = terrain(seed, 0, 5, 60)
    var p = position
    var cs = gameChunkSize
    var dimensions = [cs, cs, cs]
    var chunkPosition = [p[0] * cs, p[1] * cs, p[2] * cs]
    level.load(worldID, chunkPosition, dimensions, function(err, chunk) {
      if (err && seed) {
        var voxels = generateChunk(p, gameChunkSize)
        chunk = { voxels: voxels, dimensions: dimensions }
      }
      if (err && !seed) return
      self.postMessage({
        position: p,
        buffer: chunk.voxels.buffer,
        dimensions: chunk.dimensions
      }, [chunk.voxels.buffer])
    })
  }

  self.onmessage = function(event) {
    var data = event.data
    if (data.dbName) {
      level = voxelLevel(sublevel(levelup(data.dbName, {
        db: leveljs
      })))
      return self.postMessage({ready: true})
    }
    loadChunk(data.worldID, data.position, data.gameChunkSize, data.seed)
  }
}

