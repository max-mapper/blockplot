var gravatar = require('gravatar')
var concat = require('concat-stream')
var hat = require('hat')

module.exports = function(user) {
  var username = 'anonymous'
  if (user.profile && user.profile.email) username = user.profile.email
  
  var formContainer = $('#default-popup')
  
  $(document)
    .on('click', '.upload-world', openDialog)
    .on('click', '.new-world', openDialog)
    .on('click', '.open-menu', openDialog)
    .on('click', '.menu-buttons .worlds', openWorldsList)
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

  function openWorldsList() {
    loadWorldsList(username, function() {
      Avgrund.show( "#default-popup" )
    })
  }
  
  function loadWorldsList(user, cb) {
    if (!cb) cb = function noop (){}
    var loggedIn = user !== 'anonymous'
    formContainer.html($('.welcome').html())
    if (loggedIn) {
      getGravatar(function(err, url) {
        if (err || !url) return
        formContainer.find('.gravatar').append('<img src="' + url + '">')
      })
    }
    getWorlds(function(err, worlds) {
      if (err) return console.error(err)
      var content = $('.demo-browser-content')
      var title = "Your Worlds"
      if (loggedIn) title = user + "'s Worlds"
      content.html("<h3>" + title + "</h3>")
      var itemHTML = $('.world-item').html()
      if (worlds.length === 0) content.html("You haven't created any worlds yet!")
      worlds.map(function(world) {
        content.append(itemHTML)
        content.find('a:last')
          .attr('href', '/world.html#' + world.id)
          .click(function() { setTimeout(function() { window.location.reload() }, 100) }) // ugh
        content.find('dt:last').html(world.name)
        content.find('dd:last').text(world.published ? "Published": "Unpublished")
      })
      cb()
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
    var worldStream = user.db.sublevel('worlds').createValueStream()
    var sentError
    worldStream.pipe(concat(function(worlds) {
      if (!worlds) worlds = []
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
    var uuid = hat()
    var world = {id: uuid, name: worldName, published: false}
    user.db.sublevel('worlds').put(uuid, world, function(err) {
      if (err) return submit.show()
      window.location.href = "/world.html#" + uuid
      
      // apparently setting href and triggering reload isn't synchronous!???
      // so I wait for 1 second before forcing it
      setTimeout(function() {
        window.location.reload()
      }, 1000)
    })
    return false
  }
}
