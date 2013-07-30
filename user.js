var levelUser = require('level-user')
var request = require('browser-request')
var gravatar = require('gravatar')
var backend = "http://localhost:8080"

var username = window.location.hash.replace('#', '')
if (username.length === 0) return window.location.href = "/"

var user = levelUser({dbName: 'blocks', baseURL: backend })
user.getProfile(function(err, profile) {
  if (!profile.username) return
  if (profile.username === username) isAdmin()
  showUser(profile)
})

request({url: backend + '/user/' + username, json: true}, function(err, resp, profile) {
  if (!profile.username) noUser()
})

function showUser(profile) {
  var gravURL = gravatar.url(profile.email, {s: '200', r: 'pg', d: 'retro'})
  $('.gravatar').css('background', 'url("' + gravURL + '") no-repeat 0 0')
  var worlds = []
  if (profile.worlds) {
    Object.keys(profile.worlds).map(function(w) {
      worlds.push(profile.worlds[w])
    })
  }
  var content = $('.demo-browser-content')
  var body = ""
  if (profile.username) body = "<h3>" + profile.username + "'s worlds</h3>"
  content.html(body)
  var itemHTML = $('.world-item').html()
  if (worlds.length === 0) content.html("This user has no worlds!")
  worlds.map(function(world) {
    content.append(itemHTML)
    content.find('a:last')
      .attr('href', '/world.html#' + world.id)
    content.find('dt:last').html(world.name)
    content.find('dd:last').text("Click to play")
  })
}

function noUser() {
  $('.gravatar').css('background', 'url("/img/cat.png") no-repeat 0 0')
  $('.right').html("<h1>User doesn't exist</h1><p><a href='/'>Go home</a><p>")
}

function isAdmin() {
  console.log('is admin')
}