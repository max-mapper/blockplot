(function(exports) {
  exports.hoodieAuth = function(hoodie, container) {
    hoodie.account.authenticate().then(isLoggedIn, isLoggedOut)

    function isLoggedIn(user) {
      console.log('logged in', user)
      $('.greeting').text('Hello ' + user)
      container.html($('.welcome').html())
    }

    function isLoggedOut() {
      $('.greeting').text('Log in or sign up')
      container.html($('.form-container').html())
      container.find('.form').html($('.login-form').html())
    }

    function authenticated(e) {
      
    }

    function unauthenticated(e) {
      console.log('unauth', e)
    }

    function authError(e) {
      console.log('auth err', e)
    }

    hoodie.account.on('authenticated', authenticated)
    hoodie.account.on('signout', unauthenticated)
    hoodie.on('account:error:unauthenticated remote:error:unauthenticated', authError)
    
  }

})(typeof process === 'undefined' ? window : module.exports)