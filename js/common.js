var gravatar = require('gravatar')
var concat = require('concat-stream')

module.exports = function(user) {
  var formContainer = $('#default-popup')
  var frontPageForm = $('.front-page-form')
  
  $(document)
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
  
  user.getSession(function(err, session) {
    if (session.email) isLoggedIn(session.email)
    else isLoggedOut()
  })
  
  function openDialog() {
    Avgrund.show( "#default-popup" )
  }

  function closeDialog() {
    Avgrund.hide()
  }

  function isLoggedIn(user) {
    loadProfile(user)
  }
  
  function loadProfile(user) {
    $('.greeting').text('Hello ' + user)
    frontPageForm.find('p:first').html($('.frontpage-logged-in').html())
    formContainer.html($('.welcome').html())
    getGravatar(function(err, url) {
      if (err || !url) return
      formContainer.find('.gravatar').append('<img src="' + url + '">')
    })
    getWorlds(function(err, worlds) {
      if (err) return
      var content = $('.demo-browser-content')
      content.html("<h3>" + user + "'s Worlds</h3>")
      if (worlds.length === 0) content.html("You haven't created any worlds yet!")
      worlds.map(function(world) {
        content.append('<p><a href="' + "/world.html#" + user + '/' + world.name + '">' + world.name + '</a></p>')
      })
    })
  }

  function isLoggedOut() {
    $('.greeting').text('')
    formContainer.html($('.form-container').html())
    formContainer.find('.form').html($('.login-form').html())
    frontPageForm.find('p:first').html($('.frontpage-signup-form').html())
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
      start: 'user|worlds',
      end: 'user|x' // todo range read module
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

  function missing(form, field) {
    var data = getLoginFormData(form)
    var thisField = fieldParent(form, field)
    if (!data[field] || data[field] === "") {
      thisField.addClass('error')
      return true
    } else {
      thisField.removeClass('error')
      return false
    }
  }

  function validate(form) {
    var data = getLoginFormData(form)
    var missingUser = missing(form, 'username')
    var missingEmail = missing(form, 'email')
    var missingPass = missing(form, 'password')
    if (missingUser || missingPass) return false
    if (data.action !== "signUp") return true
    var pass = formField(form, 'password').val()
    if (missingEmail) return
    return true
  }

  function getLoginFormData(form) {
    var action = form.find('input[type="submit"]').attr('data-action')
    var username = form.find('input[name="username"]').val()
    var email = form.find('input[name="email"]').val()
    var password = form.find('input[name="password"]').val()
    return {
      action: action,
      username: username,
      email: email,
      password: password
    }
  }


  
  function showNewWorldForm(e) {
    $('.demo-browser-content').html($('.new-world-form').html())
  }
  
  function submitNewWorldForm(e) {
    e.preventDefault()
    var worldName = $(e.target).find('#world-name').val()
    var submit = $(e.target).find('input[type="submit"]')
    submit.hide()
    user.db.put('user|worlds|' + worldName, {name: worldName}, function(err) {
      if (err) return submit.show()
      return console.log('saved!', worldName, err)
      window.location.href = "/world.html#" + hoodie.account.username + '/' + worldName
      
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
