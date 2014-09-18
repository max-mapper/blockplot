var mca2js = require('mca2js')
var leveljs = require('level-js')
var sublevel = require('level-sublevel')
var levelup = require('levelup')
var voxelLevel = require('voxel-level')

module.exports = function() {
  var regionX, regionZ, worldID
  window = self
  console = {log: function(msg) { self.postMessage({log: msg}) }}
  function convert(buffer, X, Z) {
    var level = voxelLevel(sublevel(levelup('blockplot', {
      db: leveljs
    })))
    var converter = mca2js()
    var count = 0
    var progress = 0
    var pending = 0
    var done = false
    var errors = {}
    converter.on('data', function(chunk) {
      pending++
      level.store(worldID, chunk, function afterStore(err, encodedLength) {
        pending--
        count++
        var percent = ~~((count / 1024) * 100)
        self.postMessage({ progress: percent, position: chunk.position, length: encodedLength })
        progress = percent
        if (done && pending === 0) {
          self.postMessage({ done: true })
          self.close()
        }
      })
    })
    converter.on('end', function(){
      done = true
    })
    converter.convert(buffer, X, Z)
  }

  self.onmessage = function(event) {
    var data = event.data
    var keys = Object.keys(data)
    if (keys.indexOf('regionX') > -1) regionX = data.regionX
    if (keys.indexOf('regionZ') > -1) regionZ = data.regionZ
    if (keys.indexOf('worldID') > -1) worldID = data.worldID
    if (data instanceof ArrayBuffer) {
      convert(data, regionX, regionZ)
    }
  }
}
