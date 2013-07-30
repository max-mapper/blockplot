var levelUser = require('level-user')
var request = require('browser-request')
var backend = "http://localhost:8080"

var username = window.location.hash.replace('#', '')
if (username.length === 0) return window.location.href = "/"

var user = levelUser({dbName: 'blocks', baseURL: backend })
user.getProfile(function(err, profile) {
  if (!profile.username) return
  if (profile.username === username) isAdmin()
})

request({url: backend + '/user/' + username, json: true}, function(err, resp, profile) {
  if (!profile.username) noUser()
  else showUser()
})

function showUser() {
  
}

function noUser() {
  $('.gravatar').css('background', 'url("/img/cat.png") no-repeat 0 0')
  $('.right').html("<h1>User doesn't exist</h1><p><a href='/'>Go home</a><p>")
}

function isAdmin() {
  console.log('is admin')
}