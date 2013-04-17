var hoodie  = new Hoodie()

var formContainer = $('#default-popup')

hoodie.account.authenticate().then(function(){}, isLoggedOut)

function authError(e) {
  console.log('auth err', e)
}

hoodie.account.on('authenticated', isLoggedIn)
hoodie.account.on('signout', isLoggedOut)
hoodie.on('account:error:unauthenticated remote:error:unauthenticated', authError)

function openDialog() {
  Avgrund.show( "#default-popup" )
}

function closeDialog() {
  Avgrund.hide()
}

function isLoggedIn(user) {
  $('.greeting').text('Hello ' + user)
  formContainer.html($('.welcome').html())
}

function isLoggedOut() {
  $('.greeting').text('Log in or sign up')
  formContainer.html($('.form-container').html())
  formContainer.find('.form').html($('.login-form').html())
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
  var missingConfirm = missing(form, 'password_confirmation')
  if (missingUser || missingPass) return false
  if (data.action !== "signUp") return true
  var pass = formField(form, 'password').val()
  var confirm = formField(form, 'password_confirmation').val()
  if (missingEmail) return
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
  var email = form.find('input[name="email"]').val()
  var password = form.find('input[name="password"]').val()
  var password_confirmation = form.find('input[name="password_confirmation"]').val()
  return {
    action: action,
    username: username,
    email: email,
    password: password,
    password_confirmation: password_confirmation
  }
}

function submitLoginForm(e) {
  e.preventDefault()
  var form = $(e.target)
  form.find('.messages').html('')
  var data = getLoginFormData(form)
  if (!validate(form)) return
  var icon = $('.login-screen .login-icon > img')
  icon.addClass('rotating')
  hoodie.store.add('email', data.email)
  hoodie.account[data.action](data.username, data.password)
    .done(function(user) {
      icon.removeClass('rotating')
      isLoggedIn(user)
    })
    .fail(function(err) {
      icon.removeClass('rotating')
      var msg = err.reason
      if (err.error && err.error === "conflict") msg = "Username already exists."
      form.find('.messages').html('<p>' + msg + '</p>')
    })
}

$(document)
  .on('click', '.open-menu', openDialog)
  .on('click', '.show-signup', showSignup)
  .on('click', '.show-login', showLogin)
  .on('click', '.logout', logout)
  .on('submit', '.login-screen .form', submitLoginForm)
  

// Cache the Window object
$window = $(window);

// Cache the Y offset and the speed of each sprite
$('[data-type]').each(function() {  
  $(this).data('offsetY', parseInt($(this).attr('data-offsetY')));
  $(this).data('Xposition', $(this).attr('data-Xposition'));
  $(this).data('speed', $(this).attr('data-speed'));
});

// For each element that has a data-type attribute
$('section[data-type="background"]').each(function(){


  // Store some variables based on where we are
  var $self = $(this),
    offsetCoords = $self.offset(),
    topOffset = offsetCoords.top;
  
  // When the window is scrolled...
    $(window).scroll(function() {

    // If this section is in view
    if ( ($window.scrollTop() + $window.height()) > (topOffset) &&
       ( (topOffset + $self.height()) > $window.scrollTop() ) ) {

      // Scroll the background at var speed
      // the yPos is a negative value because we're scrolling it UP!                
      var yPos = -($window.scrollTop() / $self.data('speed')); 
      
      // If this element has a Y offset then add it on
      if ($self.data('offsetY')) {
        yPos += $self.data('offsetY');
      }
      
      // Put together our final background position
      var coords = '80% '+ yPos + 'px';

      // Move the background
      $self.css({ backgroundPosition: coords });
      
      // Check for other sprites in this section  
      $('[data-type="sprite"]', $self).each(function() {
        
        // Cache the sprite
        var $sprite = $(this);
        
        // Use the same calculation to work out how far to scroll the sprite
        var yPos = -($window.scrollTop() / $sprite.data('speed'));          
        var coords = $sprite.data('Xposition') + ' ' + (yPos + $sprite.data('offsetY')) + 'px';
        
        $sprite.css({ backgroundPosition: coords });                          
        
      }); // sprites
    
    
    }; // in view

  }); // window scroll
    
});  // each data-type