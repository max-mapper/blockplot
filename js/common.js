var gravatar = require('gravatar')

module.exports = function() {
  $(document)
    .on('click', '.open-menu', openDialog)
    .on('click', '.open-login', openDialog)
    .on('click', '.show-signup', showSignup)
    .on('click', '.show-login', showLogin)
    .on('submit', '.front-page-form .form', submitSignupForm)
    .on('click', '.logout', logout)
    .on('submit', '.login-screen .form', submitLoginForm)
    .on('click', '.file-select', function(e) {
      var fileInput = $(e.target).parents('aside').find('input[type="file"]').first()
      fileInput.click()
    })
    

  // var hoodie  = new Hoodie("http://blockplot.jit.su/_api/")
  var hoodie  = new Hoodie("http://blockplot.dev/_api/")

  var formContainer = $('#default-popup')
  var frontPageForm = $('.front-page-form')

  if (hoodie.account.username) isLoggedIn(hoodie.account.username)
  else isLoggedOut()

  function authError(e) {
    console.log('auth err', e)
    logout()
  }

  hoodie.account.on('signin', isLoggedIn)
  hoodie.account.on('signout', isLoggedOut)
  hoodie.on('account:error:unauthenticated remote:error:unauthenticated', authError)

  function openDialog() {
    Avgrund.show( "#default-popup" )
  }

  function closeDialog() {
    Avgrund.hide()
  }

  function isLoggedIn(user) {
    console.log('isloggedin')
    $('.greeting').text('Hello ' + user)
    frontPageForm.find('p:first').html($('.frontpage-logged-in').html())
    formContainer.html($('.welcome').html())
    setTimeout(function() {
      getGravatar(function(err, url) {
        if (err) return
        formContainer.find('.gravatar').append('<img src="' + url + '">')
      })
    }, 100)
  }

  function isLoggedOut() {
    console.log('isloggedout')
    $('.greeting').text('')
    formContainer.html($('.form-container').html())
    formContainer.find('.form').html($('.login-form').html())
    frontPageForm.find('p:first').html($('.frontpage-signup-form').html())
  }

  function showSignup() {
    formContainer.find('.form').html($('.signup-form').html())
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
    hoodie.account.signOut()
  }

  function getGravatar(cb) {
    hoodie.store.findAll('email')
      .done(function (objects) {
        if (objects.length === 0) return cb('no email stored')
        var email = objects[0].email
        if (!email) return cb('no email stored')
        var gravURL = gravatar.url(email, {s: '200', r: 'pg', d: '404'})
        cb(false, gravURL)
      })
      .fail(function(err) {
        cb(err)
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

  function submitSignupForm(e) {
    e.preventDefault()
    var form = $(e.target)
    form.find('.messages').html('')
    var data = getLoginFormData(form)
    if (!validate(form)) return
    form.find('input').addClass('disabled')
    hoodie.account.signUp(data.username, data.password)
      .done(function(user) {
        hoodie.store.add('profile', {email: data.email})
        form.find('input.disabled').removeClass('disabled')
        window.scrollTo(0,0)
        $('.open-login').click()
      })
      .fail(function(err) {
        var msg = err.reason
        if (err.error && err.error === "conflict") msg = "Username already exists."
        form.find('.messages').html('<p>' + msg + '</p>')
      })
    return false;
  }


  function submitLoginForm(e) {
    e.preventDefault()
    var form = $(e.target)
    form.find('.messages').html('')
    var data = getLoginFormData(form)
    if (!validate(form)) return
    var icon = $('.login-screen .login-icon > img')
    icon.addClass('rotating')
    hoodie.account[data.action](data.username, data.password)
      .done(function(user) {
        if (data.action === 'signUp') hoodie.store.add('email', {email: data.email})
        icon.removeClass('rotating')
      })
      .fail(function(err) {
        icon.removeClass('rotating')
        var msg = err.reason
        if (err.error && err.error === "conflict") msg = "Username already exists."
        form.find('.messages').html('<p>' + msg + '</p>')
      })
  }
  
  function click(el) {
    // Simulate click on the element.
    var evt = document.createEvent('Event')
    evt.initEvent('click', true, true)
    el.dispatchEvent(evt)
  }

  return hoodie
}
