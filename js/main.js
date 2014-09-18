var levelup = require('levelup')
var leveljs = require('level-js')
var sublevel = require('level-sublevel')
var commonStuff = require('./common')
require('./parallax')()

var startArea = $('.start-area')
var missingAPIs = []
if (!Modernizr.pointerlock) missingAPIs.push('Pointer Lock')
if (!Modernizr.webgl) missingAPIs.push('WebGL')
if (!Modernizr.indexeddb) missingAPIs.push('IndexedDB')
if (missingAPIs.length > 0) {
  startArea.html('<a href="http://google.com/chrome" target="_blank" class="btn btn-large btn-block btn-danger">Browser Upgrade Needed</a><span class="micro">Missing ' + missingAPIs.join(', ') + '</span>')
}

startArea.removeClass('hidden')

var db = sublevel(levelup('blockplot', {
  db: leveljs,
  valueEncoding: 'json'
}))

commonStuff(db)

