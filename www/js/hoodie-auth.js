(function(exports) {
  exports.hoodieAuth = function(hoodie, container) {
    hoodie.account.authenticate().then(isLoggedIn, isLoggedOut)

    function isLoggedIn() {
      console.log('logged in')
    }

    function isLoggedOut() {
      $('.greeting').text('Log in or sign up')
      container.html($('.form-container').html())
      container.find('.form').html($('.login-form').html())
    }

    function authenticated() {
      console.log('auth')
    }

    function unauthenticated() {
      console.log('unauth')
    }

    function authError() {
      console.log('auth err')
    }

    hoodie.account.on('authenticated', authenticated)
    hoodie.account.on('signout', unauthenticated)
    hoodie.on('account:error:unauthenticated remote:error:unauthenticated', authError)
    
  }

})(typeof process === 'undefined' ? window : module.exports)