var hoodie  = new Hoodie()

var formContainer = $('#default-popup')
hoodieAuth(hoodie, formContainer)

function openDialog() {
  Avgrund.show( "#default-popup" )
}

function closeDialog() {
  Avgrund.hide()
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
  var missingPass = missing(form, 'password')
  var missingConfirm = missing(form, 'password_confirmation')
  if (missingUser || missingPass) return false
  if (data.action !== "signUp") return true
  var pass = formField(form, 'password').val()
  var confirm = formField(form, 'password_confirmation').val()
  if (pass !== confirm) {
    fieldParent(form, 'password').addClass('error')
    fieldParent(form, 'password_confirmation').addClass('error')
    return false
  } else {
    fieldParent(form, 'password').removeClass('error')
    fieldParent(form, 'password_confirmation').removeClass('error')
    return true
  }
  return true
}

function getLoginFormData(form) {
  var action = form.find('input[type="submit"]').attr('data-action')
  var username = form.find('input[name="username"]').val()
  var password = form.find('input[name="password"]').val()
  var password_confirmation = form.find('input[name="password_confirmation"]').val()
  return {
    action: action,
    username: username,
    password: password,
    password_confirmation: password_confirmation
  }
}
function submitLoginForm(e) {
  e.preventDefault()
  var form = $(e.target)
  var data = getLoginFormData(form)
  validate(form)
  return false
}

$(document)
  .on('click', '.open-menu', openDialog)
  .on('click', '.show-signup', showSignup)
  .on('click', '.show-login', showLogin)
  .on('submit', '.login-screen .form', submitLoginForm)