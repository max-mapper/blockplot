var mca2js = require('mca2js')
var voxelLevel = require('voxel-level')
var regionX, regionZ
window = self
console = {log: function(msg) { self.postMessage({log: msg}) }}

function convert(buffer, X, Z) {
  var level = voxelLevel('blocks', function ready() {
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
      level.store(chunk, function afterStore(err) {
        if (err) errors[key] = err
        pending--
        if (done && pending === 0) self.postMessage({ done: true, errors: Object.keys(errors).length > 0 ? errors : false })
      })
    })
    converter.on('end', function(){
      done = true
    })
    converter.convert(buffer, X, Z)
  })
}

self.onmessage = function(event) {
  var data = event.data
  if (data.regionX) regionX = data.regionX
  if (data.regionZ) regionZ = data.regionZ
  if (data instanceof ArrayBuffer) {
    convert(data, regionX, regionZ)
  }
}