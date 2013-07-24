var mca2js = require('mca2js')
var leveljs = require('level-js')
var sublevel = require('level-sublevel')
var levelup = require('levelup')
var voxelLevel = require('voxel-level')
var regionX, regionZ, worldID
window = self
console = {log: function(msg) { self.postMessage({log: msg}) }}
function convert(buffer, X, Z) {
  var level = voxelLevel(sublevel(levelup('blocks', {
    db: leveljs
  })))
  var converter = mca2js()
  var pending = 0
  var progress = 0
  var done = false
  var errors = {}
  converter.on('data', function(chunk) {
    pending++
    var percent = ~~((chunk._count / 1024) * 100)
    if (percent > progress) {
      self.postMessage({ progress: percent })
      progress = percent
    }
    level.store(worldID, chunk, function afterStore(err) {
      if (err) errors[key] = err
      pending--
      if (done && pending === 0) {
        self.postMessage({ done: true, errors: Object.keys(errors).length > 0 ? errors : false })
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