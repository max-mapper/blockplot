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

$(document)
  .on('click', '.open-menu', openDialog)
  .on('click', '.show-signup', showSignup)
  .on('click', '.show-login', showLogin)