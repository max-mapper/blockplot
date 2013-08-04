require('./parallax')()
var Modernizr = require('./modernizr-pointerlock-webgl')
var startArea = $('.start-area')
var missingAPIs = []
if (!Modernizr.pointerlock) missingAPIs.push('Pointer Lock')
if (!Modernizr.webgl) missingAPIs.push('WebGL')
if (!Modernizr.indexeddb) missingAPIs.push('IndexedDB')
if (missingAPIs.length > 0) {
  startArea.html('<a href="http://google.com/chrome" target="_blank" class="btn btn-large btn-block btn-danger">Browser Upgrade Needed</a><span class="micro">Missing ' + missingAPIs.join(', ') + '</span>')
}

startArea.removeClass('hidden')

var levelUser = require('level-user')
var commonStuff = require('./common')

var user = levelUser({dbName: 'blocks', baseURL: "http://localhost:8080" })

user.getProfile(function(err, profile) {
  user.profile = profile
  commonStuff(user)
})
