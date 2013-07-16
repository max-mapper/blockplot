var gravatar = require('gravatar')
var concat = require('concat-stream')

module.exports = function(user) {
  var username = 'anonymous'
  if (user.session && user.session.email) username = user.session.email
  
  var formContainer = $('#default-popup')
  
  $(document)
    .on('click', '.upload-world', openDialog)
    .on('click', '.new-world', openDialog)
    .on('click', '.open-menu', openDialog)
    .on('click', '.open-login', user.persona.identify.bind(user.persona))
    .on('click', '.show-login', showLogin)
    .on('click', '.logout', logout)
    .on('click', '.new-world', showNewWorldForm)
    .on('submit', '.new-world-form', submitNewWorldForm)
    .on('click', '.file-select', function(e) {
      var fileInput = $(e.target).parents('aside').find('input[type="file"]').first()
      fileInput.click()
    })
  
  loadWorldsList(username)
  
  
  function openDialog() {
    Avgrund.show( "#default-popup" )
  }

  function closeDialog() {
    Avgrund.hide()
  }
  
  function loadWorldsList(user) {
    var loggedIn = user !== 'anonymous'
    var greetingText = 'Hello!'
    if (loggedIn) greetingText = 'Hello ' + user + '+!'
    $('.greeting').text(greetingText)
    formContainer.html($('.welcome').html())
    if (loggedIn) {
      getGravatar(function(err, url) {
        if (err || !url) return
        formContainer.find('.gravatar').append('<img src="' + url + '">')
      })
    }
    getWorlds(function(err, worlds) {
      if (err) return
      var content = $('.demo-browser-content')
      var title = "Your Worlds"
      if (loggedIn) title = user + "'s Worlds"
      content.html("<h3>" + title + "</h3>")
      if (worlds.length === 0) content.html("You haven't created any worlds yet!")
      worlds.map(function(world) {
        content.append('<p><a href="/world.html#' + (loggedIn ? user : '') + '/' + world.name + '">' + world.name + '</a></p>')
      })
    })
  }

  function isLoggedOut() {
    console.log('isLoggedOut')
  }

  function showLogin() {
    formContainer.find('.form').html($('.login-form').html())
  }

  function formField(form, field) {
    return form.find('input[name="' + field + '"]')
  }

  function fieldParent(form, field) {
    var parent = formField(form, field).parents()[0]
    return $(parent)
  }

  function logout() {
    user.persona.unidentify.bind(user.persona)
  }
  
  function getWorlds(cb) {
    var worldStream = user.db.createReadStream({
      start: username + '|worlds',
      end: username + '|x' // todo range read module
    })
    var sentError
    worldStream.pipe(concat(function(worlds) {
      if (!worlds) worlds = []
      worlds = worlds.map(function(w) { return w.value })
      if (!sentError) cb(false, worlds)
    }))
    worldStream.on('error', function(err) {
      sentError = true
      cb(err)
    })
  }

  function getGravatar(cb) {
    user.db.get('profile', function(err, profile) {
      if (err) return cb(err)
      if (!profile) return cb(false, false)
      var email = profile.email
      if (!email) return cb(false, false)
      var gravURL = gravatar.url(email, {s: '200', r: 'pg', d: 'retro'})
      cb(false, gravURL)
    })
  }
  
  function showNewWorldForm(e) {
    $('.demo-browser-content').html($('.new-world-form').html())
  }
  
  function submitNewWorldForm(e) {
    e.preventDefault()
    var worldName = $(e.target).find('#world-name').val()
    var submit = $(e.target).find('input[type="submit"]')
    submit.hide()
    user.db.put(username + '|worlds|' + worldName, {name: worldName}, function(err) {
      if (err) return submit.show()
      window.location.href = "/world.html#" + (username !== 'anonymous' ? username : '') + '/' + worldName
      
      // apparently setting href and triggering reload isn't synchronous!???
      // so I wait for 1 second before forcing it
      setTimeout(function() {
        window.location.reload()
      }, 1000)
    })
    return false
  }
  
  function click(el) {
    // Simulate click on the element.
    var evt = document.createEvent('Event')
    evt.initEvent('click', true, true)
    el.dispatchEvent(evt)
  }
}
