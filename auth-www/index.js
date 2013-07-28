var persona = require('persona-id')()
var ractive = require('ractive')
var $ = require('jquery-untouched')
var request = require('browser-request')
var input

var button = new ractive({
  el: document.querySelector('.buttons'),
  template: '<a class="btn btn-large btn-block {{classes}}">{{text}}</a>',
  data: {
    text: "Log In",
    classes: "login"
  }
})

function getProfile(cb) {
  request({url: '/_profile', json: true}, function(err, resp, profile) {
    cb(err, profile)
  })
}

function usernameAvailable(username, cb) {
  request({url: '/user/' + username, json: true}, function(err, resp, profile) {
    cb(err, resp.statusCode !== 200)
  })
}

getProfile(function(err, profile){
  if (profile.email) persona.set(profile.email)
})

$(document)
  .on('click', '.login', function() {
    persona.identify()
  })
  .on('click', '.logout', function() {
    persona.unidentify()
  })
  .on('submit', '.input form', function(e) {
    e.preventDefault()
    var button = $('.input form input[type="submit"]')
    if (button.hasClass('disabled')) return
    var username = $(e.target).find('.namepicker').val()
    request({url: '/user/' + username, json: true, method: 'PUT'}, function(err, resp, profile) {
      if (err) console.log('username save error', err)
      $('.input form').hide()
      $('.buttons').show()
    })
    return false
  })
  .on('blur', '.namepicker', function(e) {
    input.set('inputClasses', '')
  })
  .on('keyup', '.namepicker', function(e) {
    var val = e.target.value
    input.set('inputClasses', '')
    if (val === '' || val.length < 3) return input.set({
      'inputClasses': 'error',
      'classes': 'disabled'
    })
    usernameAvailable(val, function(err, available) {
      if (err) return console.error(err.message)
      if (available) {
        input.set({
          'inputClasses': 'success',
          'classes': ''
        })
      } else {
        input.set({
          'inputClasses': 'error',
          'classes': 'disabled'
        })
      }
    })
  })

persona.on('login', function (id) {
  getProfile(function(err, profile) {
    if (profile && profile.username) return
    $('.buttons').show()
    input = new ractive({
      el: document.querySelector('.input'),
      template: '<form><div class="span3"><div class="control-group {{inputClasses}}"><input type="text" placeholder="Pick a Username" class="namepicker span3"></div></div><input type="submit" value="OK" class="btn btn-large {{classes}}"></form>',
      data: {
        text: "Log In",
        classes: "disabled"
      }
    })
  })
  button.set({
    text: "Log Out",
    classes: "logout btn-danger"
  })
  window.parent.postMessage(JSON.stringify({ login: id }), '*')
})

persona.on('logout', function () {
  button.set({
    text: "Log In",
    classes: "login"
  })
  window.parent.postMessage(JSON.stringify({ logout: true }), '*')
})

window.button = button