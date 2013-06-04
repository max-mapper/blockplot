;(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
require('./js/parallax')()

var hoodie = require('./js/common')()


},{"./js/parallax":2,"./js/common":3}],2:[function(require,module,exports){
module.exports = function() {
  // parallax junk:

  // Cache the Window object
  $window = $(window);

  // Cache the Y offset and the speed of each sprite
  $('[data-type]').each(function() {  
    $(this).data('offsetY', parseInt($(this).attr('data-offsetY')))
    $(this).data('Xposition', $(this).attr('data-Xposition'))
    $(this).data('speed', $(this).attr('data-speed'))
  })

  // For each element that has a data-type attribute
  $('section[data-type="background"]').each(function() {


    // Store some variables based on where we are
    var $self = $(this),
      offsetCoords = $self.offset(),
      topOffset = offsetCoords.top

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
}

},{}],3:[function(require,module,exports){
var gravatar = require('gravatar')
var Hoodie = require('hoodie')

module.exports = function() {
  $(document)
    .on('click', '.open-menu', openDialog)
    .on('click', '.open-login', openDialog)
    .on('click', '.show-signup', showSignup)
    .on('click', '.show-login', showLogin)
    .on('submit', '.front-page-form .form', submitSignupForm)
    .on('click', '.logout', logout)
    .on('submit', '.login-screen .form', submitLoginForm)
    .on('click', '.new-world', showNewWorldForm)
    .on('submit', '.new-world-form', function(e) {
      e.preventDefault()
      var worldName = $(e.target).find('#world-name').val()
      var submit = $(e.target).find('input[type="submit"]')
      submit.hide()
      hoodie.store.add('world', {name: worldName})
        .done(function(user) {
          window.location.href = "/world.html#" + hoodie.account.username + '/' + worldName
        })
        .fail(function(e) {
          submit.show()
        })
      return false
    })
    .on('click', '.file-select', function(e) {
      var fileInput = $(e.target).parents('aside').find('input[type="file"]').first()
      fileInput.click()
    })
    

  var hoodie  = new Hoodie("http://blockplot.jit.su/_api/")
  // var hoodie  = new Hoodie("http://127.0.0.1:8080/_api/")

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
    loadProfile(user)
  }
  
  function loadProfile(user) {
    $('.greeting').text('Hello ' + user)
    frontPageForm.find('p:first').html($('.frontpage-logged-in').html())
    formContainer.html($('.welcome').html())
    // set timeout is because of some hoodie login race condition weirdness
    setTimeout(function() {
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
    }, 100)
  }

  function isLoggedOut() {
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
  
  function getWorlds(cb) {
    hoodie.store.findAll('world')
      .done(function (objects) {
        if (objects.length === 0) return cb(false, [])
        cb(false, objects)
      })
      .fail(cb)
  }

  function getGravatar(cb) {
    hoodie.store.findAll('profile')
      .done(function (objects) {
        if (objects.length === 0) return cb(false, false)
        var email = objects[0].email
        if (!email) return cb(false, false)
        var gravURL = gravatar.url(email, {s: '200', r: 'pg', d: 'retro'})
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
        var saveProfile = hoodie.store.add('profile', {email: data.email})
          .done(function() {
            form.find('input.disabled').removeClass('disabled')
            window.scrollTo(0,0)
            $('.open-login').click()
          })
          .fail(function(err) { alert('error saving profile!') })
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
  
  function showNewWorldForm(e) {
    $('.demo-browser-content').html($('.new-world-form').html())
  }
  
  function click(el) {
    // Simulate click on the element.
    var evt = document.createEvent('Event')
    evt.initEvent('click', true, true)
    el.dispatchEvent(evt)
  }

  return hoodie
}

},{"gravatar":4,"hoodie":5}],5:[function(require,module,exports){
(function(){// Generated by CoffeeScript 1.6.2
var ConnectionError, Events, Hoodie,
  __slice = [].slice,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Events = (function() {
  function Events() {}

  Events.prototype.bind = function(ev, callback) {
    var calls, evs, name, _i, _len, _results;

    evs = ev.split(' ');
    calls = this.hasOwnProperty('_callbacks') && this._callbacks || (this._callbacks = {});
    _results = [];
    for (_i = 0, _len = evs.length; _i < _len; _i++) {
      name = evs[_i];
      calls[name] || (calls[name] = []);
      _results.push(calls[name].push(callback));
    }
    return _results;
  };

  Events.prototype.on = Events.prototype.bind;

  Events.prototype.one = function(ev, callback) {
    return this.bind(ev, function() {
      this.unbind(ev, arguments.callee);
      return callback.apply(this, arguments);
    });
  };

  Events.prototype.trigger = function() {
    var args, callback, ev, list, _i, _len, _ref;

    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    ev = args.shift();
    list = this.hasOwnProperty('_callbacks') && ((_ref = this._callbacks) != null ? _ref[ev] : void 0);
    if (!list) {
      return;
    }
    for (_i = 0, _len = list.length; _i < _len; _i++) {
      callback = list[_i];
      callback.apply(this, args);
    }
    return true;
  };

  Events.prototype.unbind = function(ev, callback) {
    var cb, i, list, _i, _len, _ref;

    if (!ev) {
      this._callbacks = {};
      return this;
    }
    list = (_ref = this._callbacks) != null ? _ref[ev] : void 0;
    if (!list) {
      return this;
    }
    if (!callback) {
      delete this._callbacks[ev];
      return this;
    }
    for (i = _i = 0, _len = list.length; _i < _len; i = ++_i) {
      cb = list[i];
      if (!(cb === callback)) {
        continue;
      }
      list = list.slice();
      list.splice(i, 1);
      this._callbacks[ev] = list;
      break;
    }
    return this;
  };

  return Events;

})();

Hoodie = (function(_super) {
  __extends(Hoodie, _super);

  Hoodie.prototype.online = true;

  Hoodie.prototype.checkConnectionInterval = 30000;

  function Hoodie(baseUrl) {
    this.baseUrl = baseUrl;
    this._handleCheckConnectionError = __bind(this._handleCheckConnectionError, this);
    this._handleCheckConnectionSuccess = __bind(this._handleCheckConnectionSuccess, this);
    this.rejectWith = __bind(this.rejectWith, this);
    this.resolveWith = __bind(this.resolveWith, this);
    this.reject = __bind(this.reject, this);
    this.resolve = __bind(this.resolve, this);
    this.checkConnection = __bind(this.checkConnection, this);
    if (this.baseUrl) {
      this.baseUrl = this.baseUrl.replace(/\/+$/, '');
    } else {
      this.baseUrl = "/_api";
    }
    this.store = new this.constructor.LocalStore(this);
    this.config = new this.constructor.Config(this);
    this.account = new this.constructor.Account(this);
    this.remote = new this.constructor.AccountRemote(this);
    this._loadExtensions();
    this.checkConnection();
  }

  Hoodie.prototype.request = function(type, url, options) {
    var defaults;

    if (options == null) {
      options = {};
    }
    if (!/^http/.test(url)) {
      url = "" + this.baseUrl + url;
    }
    defaults = {
      type: type,
      url: url,
      xhrFields: {
        withCredentials: true
      },
      crossDomain: true,
      dataType: 'json'
    };
    return $.ajax($.extend(defaults, options));
  };

  Hoodie.prototype._checkConnectionRequest = null;

  Hoodie.prototype.checkConnection = function() {
    var _ref;

    if (((_ref = this._checkConnectionRequest) != null ? typeof _ref.state === "function" ? _ref.state() : void 0 : void 0) === 'pending') {
      return this._checkConnectionRequest;
    }
    return this._checkConnectionRequest = this.request('GET', '/').pipe(this._handleCheckConnectionSuccess, this._handleCheckConnectionError);
  };

  Hoodie.prototype.open = function(storeName, options) {
    if (options == null) {
      options = {};
    }
    $.extend(options, {
      name: storeName
    });
    return new Hoodie.Remote(this, options);
  };

  Hoodie.prototype.uuid = function(len) {
    var chars, i, radix;

    if (len == null) {
      len = 7;
    }
    chars = '0123456789abcdefghijklmnopqrstuvwxyz'.split('');
    radix = chars.length;
    return ((function() {
      var _i, _results;

      _results = [];
      for (i = _i = 0; 0 <= len ? _i < len : _i > len; i = 0 <= len ? ++_i : --_i) {
        _results.push(chars[0 | Math.random() * radix]);
      }
      return _results;
    })()).join('');
  };

  Hoodie.prototype.defer = $.Deferred;

  Hoodie.prototype.isPromise = function(obj) {
    return typeof (obj != null ? obj.done : void 0) === 'function' && typeof obj.resolve === 'undefined';
  };

  Hoodie.prototype.resolve = function() {
    return this.defer().resolve().promise();
  };

  Hoodie.prototype.reject = function() {
    return this.defer().reject().promise();
  };

  Hoodie.prototype.resolveWith = function() {
    var _ref;

    return (_ref = this.defer()).resolve.apply(_ref, arguments).promise();
  };

  Hoodie.prototype.rejectWith = function() {
    var _ref;

    return (_ref = this.defer()).reject.apply(_ref, arguments).promise();
  };

  Hoodie.prototype.dispose = function() {
    return this.trigger('dispose');
  };

  Hoodie.extend = function(name, Module) {
    this._extensions || (this._extensions = {});
    return this._extensions[name] = Module;
  };

  Hoodie.prototype.extend = function(name, Module) {
    return this[name] = new Module(this);
  };

  Hoodie.prototype._loadExtensions = function() {
    var Module, instanceName, _ref, _results;

    _ref = this.constructor._extensions;
    _results = [];
    for (instanceName in _ref) {
      Module = _ref[instanceName];
      _results.push(this[instanceName] = new Module(this));
    }
    return _results;
  };

  Hoodie.prototype._handleCheckConnectionSuccess = function(response) {
    this.checkConnectionInterval = 30000;
    window.setTimeout(this.checkConnection, this.checkConnectionInterval);
    if (!this.online) {
      this.trigger('reconnected');
      this.online = true;
    }
    return this.defer().resolve();
  };

  Hoodie.prototype._handleCheckConnectionError = function(response) {
    this.checkConnectionInterval = 3000;
    window.setTimeout(this.checkConnection, this.checkConnectionInterval);
    if (this.online) {
      this.trigger('disconnected');
      this.online = false;
    }
    return this.defer().reject();
  };

  return Hoodie;

})(Events);

if (typeof module !== "undefined" && module !== null ? module.exports : void 0) {
  module.exports = Hoodie;
}

Hoodie.Account = (function() {
  Account.prototype.username = void 0;

  function Account(hoodie) {
    this.hoodie = hoodie;
    this._handleChangeUsernameAndPasswordRequest = __bind(this._handleChangeUsernameAndPasswordRequest, this);
    this._sendChangeUsernameAndPasswordRequest = __bind(this._sendChangeUsernameAndPasswordRequest, this);
    this._cleanupAndTriggerSignOut = __bind(this._cleanupAndTriggerSignOut, this);
    this._cleanup = __bind(this._cleanup, this);
    this._handleFetchBeforeDestroyError = __bind(this._handleFetchBeforeDestroyError, this);
    this._handleFetchBeforeDestroySucces = __bind(this._handleFetchBeforeDestroySucces, this);
    this._handlePasswordResetStatusRequestError = __bind(this._handlePasswordResetStatusRequestError, this);
    this._handlePasswordResetStatusRequestSuccess = __bind(this._handlePasswordResetStatusRequestSuccess, this);
    this._checkPasswordResetStatus = __bind(this._checkPasswordResetStatus, this);
    this._handleSignInSuccess = __bind(this._handleSignInSuccess, this);
    this._delayedSignIn = __bind(this._delayedSignIn, this);
    this._handleSignUpSucces = __bind(this._handleSignUpSucces, this);
    this._handleRequestError = __bind(this._handleRequestError, this);
    this._handleAuthenticateRequestSuccess = __bind(this._handleAuthenticateRequestSuccess, this);
    this.fetch = __bind(this.fetch, this);
    this.signOut = __bind(this.signOut, this);
    this.authenticate = __bind(this.authenticate, this);
    this._doc = {};
    this._requests = {};
    this.init();
  }

  Account.prototype.init = function() {
    this.username = this.hoodie.config.get('_account.username');
    this.ownerHash = this.hoodie.config.get('_account.ownerHash');
    if (!this.ownerHash) {
      this._setOwner(this.hoodie.uuid());
    }
    window.setTimeout(this.authenticate);
    return this._checkPasswordResetStatus();
  };

  Account.prototype.authenticate = function() {
    var sendAndHandleAuthRequest, _ref, _ref1,
      _this = this;

    if (this._authenticated === false) {
      return this.hoodie.defer().reject().promise();
    }
    if (this._authenticated === true) {
      return this.hoodie.defer().resolve(this.username).promise();
    }
    if (((_ref = this._requests.signOut) != null ? _ref.state() : void 0) === 'pending') {
      return this._requests.signOut.then(this.hoodie.rejectWith);
    }
    if (((_ref1 = this._requests.signIn) != null ? _ref1.state() : void 0) === 'pending') {
      return this._requests.signIn;
    }
    if (this.username === void 0) {
      return this._sendSignOutRequest().then(function() {
        _this._authenticated = false;
        return _this.hoodie.rejectWith();
      });
    }
    sendAndHandleAuthRequest = function() {
      return _this.request('GET', "/_session").pipe(_this._handleAuthenticateRequestSuccess, _this._handleRequestError);
    };
    return this._withSingleRequest('authenticate', sendAndHandleAuthRequest);
  };

  Account.prototype.signUp = function(username, password) {
    var options;

    if (password == null) {
      password = '';
    }
    if (!username) {
      return this.hoodie.defer().reject({
        error: 'username must be set'
      }).promise();
    }
    if (this.hasAnonymousAccount()) {
      return this._upgradeAnonymousAccount(username, password);
    }
    if (this.hasAccount()) {
      return this.hoodie.defer().reject({
        error: 'you have to sign out first'
      }).promise();
    }
    username = username.toLowerCase();
    options = {
      data: JSON.stringify({
        _id: this._key(username),
        name: this._userKey(username),
        type: 'user',
        roles: [],
        password: password,
        ownerHash: this.ownerHash,
        database: this.db(),
        updatedAt: this._now(),
        createdAt: this._now(),
        signedUpAt: username !== this.ownerHash ? this._now() : void 0
      }),
      contentType: 'application/json'
    };
    return this.request('PUT', this._url(username), options).pipe(this._handleSignUpSucces(username, password), this._handleRequestError);
  };

  Account.prototype.anonymousSignUp = function() {
    var password, username,
      _this = this;

    password = this.hoodie.uuid(10);
    username = this.ownerHash;
    return this.signUp(username, password).done(function() {
      _this.setAnonymousPassword(password);
      return _this.trigger('signup:anonymous', username);
    });
  };

  Account.prototype.hasAccount = function() {
    return this.username != null;
  };

  Account.prototype.hasAnonymousAccount = function() {
    return this.getAnonymousPassword() != null;
  };

  Account.prototype._anonymousPasswordKey = '_account.anonymousPassword';

  Account.prototype.setAnonymousPassword = function(password) {
    return this.hoodie.config.set(this._anonymousPasswordKey, password);
  };

  Account.prototype.getAnonymousPassword = function(password) {
    return this.hoodie.config.get(this._anonymousPasswordKey);
  };

  Account.prototype.removeAnonymousPassword = function(password) {
    return this.hoodie.config.remove(this._anonymousPasswordKey);
  };

  Account.prototype.signIn = function(username, password) {
    var _this = this;

    if (username == null) {
      username = '';
    }
    if (password == null) {
      password = '';
    }
    username = username.toLowerCase();
    if (this.username !== username) {
      return this.signOut({
        silent: true
      }).pipe(function() {
        return _this._sendSignInRequest(username, password);
      });
    } else {
      return this._sendSignInRequest(username, password, {
        reauthenticated: true
      });
    }
  };

  Account.prototype.signOut = function(options) {
    var _this = this;

    if (options == null) {
      options = {};
    }
    if (!this.hasAccount()) {
      return this._cleanup().then(function() {
        if (!options.silent) {
          return _this.trigger('signout');
        }
      });
    }
    this.hoodie.remote.disconnect();
    return this._sendSignOutRequest().pipe(this._cleanupAndTriggerSignOut);
  };

  Account.prototype.on = function(event, cb) {
    event = event.replace(/(^| )([^ ]+)/g, "$1account:$2");
    return this.hoodie.on(event, cb);
  };

  Account.prototype.trigger = function() {
    var event, parameters, _ref;

    event = arguments[0], parameters = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return (_ref = this.hoodie).trigger.apply(_ref, ["account:" + event].concat(__slice.call(parameters)));
  };

  Account.prototype.request = function(type, path, options) {
    var _ref;

    if (options == null) {
      options = {};
    }
    return (_ref = this.hoodie).request.apply(_ref, arguments);
  };

  Account.prototype.db = function() {
    return "user/" + this.ownerHash;
  };

  Account.prototype.fetch = function(username) {
    var _this = this;

    if (username == null) {
      username = this.username;
    }
    if (!username) {
      return this.hoodie.defer().reject({
        error: "unauthenticated",
        reason: "not logged in"
      }).promise();
    }
    return this._withSingleRequest('fetch', function() {
      return _this.request('GET', _this._url(username)).pipe(null, _this._handleRequestError).done(function(response) {
        return _this._doc = response;
      });
    });
  };

  Account.prototype.changePassword = function(currentPassword, newPassword) {
    if (!this.username) {
      return this.hoodie.defer().reject({
        error: "unauthenticated",
        reason: "not logged in"
      }).promise();
    }
    this.hoodie.remote.disconnect();
    return this.fetch().pipe(this._sendChangeUsernameAndPasswordRequest(currentPassword, null, newPassword), this._handleRequestError);
  };

  Account.prototype.resetPassword = function(username) {
    var data, key, options, resetPasswordId,
      _this = this;

    if (resetPasswordId = this.hoodie.config.get('_account.resetPasswordId')) {
      return this._checkPasswordResetStatus();
    }
    resetPasswordId = "" + username + "/" + (this.hoodie.uuid());
    this.hoodie.config.set('_account.resetPasswordId', resetPasswordId);
    key = "" + this._prefix + ":$passwordReset/" + resetPasswordId;
    data = {
      _id: key,
      name: "$passwordReset/" + resetPasswordId,
      type: 'user',
      roles: [],
      password: resetPasswordId,
      createdAt: this._now(),
      updatedAt: this._now()
    };
    options = {
      data: JSON.stringify(data),
      contentType: "application/json"
    };
    return this._withPreviousRequestsAborted('resetPassword', function() {
      return _this.request('PUT', "/_users/" + (encodeURIComponent(key)), options).pipe(null, _this._handleRequestError).done(_this._checkPasswordResetStatus);
    });
  };

  Account.prototype.changeUsername = function(currentPassword, newUsername) {
    if (newUsername == null) {
      newUsername = '';
    }
    return this._changeUsernameAndPassword(currentPassword, newUsername.toLowerCase());
  };

  Account.prototype.destroy = function() {
    if (!this.hasAccount()) {
      return this._cleanupAndTriggerSignOut();
    }
    return this.fetch().pipe(this._handleFetchBeforeDestroySucces, this._handleFetchBeforeDestroyError).pipe(this._cleanupAndTriggerSignOut);
  };

  Account.prototype._prefix = 'org.couchdb.user';

  Account.prototype._setUsername = function(username) {
    if (username === this.username) {
      return;
    }
    this.username = username;
    return this.hoodie.config.set('_account.username', this.username);
  };

  Account.prototype._setOwner = function(ownerHash) {
    if (ownerHash === this.ownerHash) {
      return;
    }
    this.ownerHash = ownerHash;
    this.hoodie.config.set('createdBy', this.ownerHash);
    return this.hoodie.config.set('_account.ownerHash', this.ownerHash);
  };

  Account.prototype._handleAuthenticateRequestSuccess = function(response) {
    if (response.userCtx.name) {
      this._authenticated = true;
      this._setUsername(response.userCtx.name.replace(/^user(_anonymous)?\//, ''));
      this._setOwner(response.userCtx.roles[0]);
      return this.hoodie.defer().resolve(this.username).promise();
    }
    if (this.hasAnonymousAccount()) {
      this.signIn(this.username, this.getAnonymousPassword());
      return;
    }
    this._authenticated = false;
    this.trigger('error:unauthenticated');
    return this.hoodie.defer().reject().promise();
  };

  Account.prototype._handleRequestError = function(error) {
    var e, xhr;

    if (error == null) {
      error = {};
    }
    if (error.reason) {
      return this.hoodie.defer().reject(error).promise();
    }
    xhr = error;
    try {
      error = JSON.parse(xhr.responseText);
    } catch (_error) {
      e = _error;
      error = {
        error: xhr.responseText || "unknown"
      };
    }
    return this.hoodie.defer().reject(error).promise();
  };

  Account.prototype._handleSignUpSucces = function(username, password) {
    var _this = this;

    return function(response) {
      _this.trigger('signup', username);
      _this._doc._rev = response.rev;
      return _this._delayedSignIn(username, password);
    };
  };

  Account.prototype._delayedSignIn = function(username, password, options, defer) {
    var _this = this;

    if (!defer) {
      defer = this.hoodie.defer();
    }
    window.setTimeout((function() {
      var promise;

      promise = _this._sendSignInRequest(username, password);
      promise.done(defer.resolve);
      return promise.fail(function(error) {
        if (error.error === 'unconfirmed') {
          return _this._delayedSignIn(username, password, options, defer);
        } else {
          return defer.reject.apply(defer, arguments);
        }
      });
    }), 300);
    return defer.promise();
  };

  Account.prototype._handleSignInSuccess = function(options) {
    var _this = this;

    if (options == null) {
      options = {};
    }
    return function(response) {
      var defer, username;

      defer = _this.hoodie.defer();
      username = response.name.replace(/^user(_anonymous)?\//, '');
      if (~response.roles.indexOf("error")) {
        _this.fetch(username).fail(defer.reject).done(function() {
          return defer.reject({
            error: "error",
            reason: _this._doc.$error
          });
        });
        return defer.promise();
      }
      if (!~response.roles.indexOf("confirmed")) {
        return defer.reject({
          error: "unconfirmed",
          reason: "account has not been confirmed yet"
        });
      }
      _this._setUsername(username);
      _this._setOwner(response.roles[0]);
      _this._authenticated = true;
      if (!(options.silent || options.reauthenticated)) {
        if (_this.hasAnonymousAccount()) {
          _this.trigger('signin:anonymous', username);
        } else {
          _this.trigger('signin', username);
        }
      }
      if (options.reauthenticated) {
        _this.trigger('reauthenticated', username);
      }
      _this.fetch();
      return defer.resolve(_this.username, response.roles[0]);
    };
  };

  Account.prototype._checkPasswordResetStatus = function() {
    var hash, options, resetPasswordId, url, username,
      _this = this;

    resetPasswordId = this.hoodie.config.get('_account.resetPasswordId');
    if (!resetPasswordId) {
      return this.hoodie.defer().reject({
        error: "missing"
      }).promise();
    }
    username = "$passwordReset/" + resetPasswordId;
    url = "/_users/" + (encodeURIComponent("" + this._prefix + ":" + username));
    hash = btoa("" + username + ":" + resetPasswordId);
    options = {
      headers: {
        Authorization: "Basic " + hash
      }
    };
    return this._withPreviousRequestsAborted('passwordResetStatus', function() {
      return _this.request('GET', url, options).pipe(_this._handlePasswordResetStatusRequestSuccess, _this._handlePasswordResetStatusRequestError).fail(function(error) {
        if (error.error === 'pending') {
          window.setTimeout(_this._checkPasswordResetStatus, 1000);
          return;
        }
        return _this.trigger('password_reset:error');
      });
    });
  };

  Account.prototype._handlePasswordResetStatusRequestSuccess = function(response) {
    var defer;

    defer = this.hoodie.defer();
    if (response.$error) {
      defer.reject(response.$error);
    } else {
      defer.reject({
        error: 'pending'
      });
    }
    return defer.promise();
  };

  Account.prototype._handlePasswordResetStatusRequestError = function(xhr) {
    if (xhr.status === 401) {
      this.hoodie.config.remove('_account.resetPasswordId');
      this.trigger('passwordreset');
      return this.hoodie.defer().resolve();
    } else {
      return this._handleRequestError(xhr);
    }
  };

  Account.prototype._changeUsernameAndPassword = function(currentPassword, newUsername, newPassword) {
    var _this = this;

    return this._sendSignInRequest(this.username, currentPassword, {
      silent: true
    }).pipe(function() {
      return _this.fetch().pipe(_this._sendChangeUsernameAndPasswordRequest(currentPassword, newUsername, newPassword));
    });
  };

  Account.prototype._upgradeAnonymousAccount = function(username, password) {
    var currentPassword,
      _this = this;

    currentPassword = this.getAnonymousPassword();
    return this._changeUsernameAndPassword(currentPassword, username, password).done(function() {
      _this.trigger('signup', username);
      return _this.removeAnonymousPassword();
    });
  };

  Account.prototype._handleFetchBeforeDestroySucces = function() {
    var _this = this;

    this.hoodie.remote.disconnect();
    this._doc._deleted = true;
    return this._withPreviousRequestsAborted('updateUsersDoc', function() {
      return _this.request('PUT', _this._url(), {
        data: JSON.stringify(_this._doc),
        contentType: 'application/json'
      });
    });
  };

  Account.prototype._handleFetchBeforeDestroyError = function(error) {
    if (error.error === 'not_found') {
      return this.hoodie.defer().resolve().promise();
    } else {
      return this.hoodie.defer().reject(error).promise();
    }
  };

  Account.prototype._cleanup = function(options) {
    if (options == null) {
      options = {};
    }
    this.trigger('cleanup');
    this._authenticated = options.authenticated;
    this.hoodie.config.clear();
    this._setUsername(options.username);
    this._setOwner(options.ownerHash || this.hoodie.uuid());
    return this.hoodie.defer().resolve().promise();
  };

  Account.prototype._cleanupAndTriggerSignOut = function() {
    var _this = this;

    return this._cleanup().then(function() {
      return _this.trigger('signout');
    });
  };

  Account.prototype._userKey = function(username) {
    var prefix;

    if (username === this.ownerHash) {
      prefix = 'user_anonymous';
    } else {
      prefix = 'user';
    }
    return "" + prefix + "/" + username;
  };

  Account.prototype._key = function(username) {
    if (username == null) {
      username = this.username;
    }
    return "" + this._prefix + ":" + (this._userKey(username));
  };

  Account.prototype._url = function(username) {
    return "/_users/" + (encodeURIComponent(this._key(username)));
  };

  Account.prototype._sendChangeUsernameAndPasswordRequest = function(currentPassword, newUsername, newPassword) {
    var _this = this;

    return function() {
      var data, options;

      data = $.extend({}, _this._doc);
      if (newUsername) {
        data.$newUsername = newUsername;
      }
      data.updatedAt = _this._now();
      data.signedUpAt || (data.signedUpAt = _this._now());
      if (newPassword != null) {
        delete data.salt;
        delete data.password_sha;
        data.password = newPassword;
      }
      options = {
        data: JSON.stringify(data),
        contentType: 'application/json'
      };
      return _this._withPreviousRequestsAborted('updateUsersDoc', function() {
        return _this.request('PUT', _this._url(), options).pipe(_this._handleChangeUsernameAndPasswordRequest(newUsername, newPassword || currentPassword), _this._handleRequestError);
      });
    };
  };

  Account.prototype._handleChangeUsernameAndPasswordRequest = function(newUsername, newPassword) {
    var _this = this;

    return function() {
      _this.hoodie.remote.disconnect();
      if (newUsername) {
        return _this._delayedSignIn(newUsername, newPassword, {
          silent: true
        });
      } else {
        return _this.signIn(_this.username, newPassword);
      }
    };
  };

  Account.prototype._withPreviousRequestsAborted = function(name, requestFunction) {
    var _ref;

    if ((_ref = this._requests[name]) != null) {
      if (typeof _ref.abort === "function") {
        _ref.abort();
      }
    }
    return this._requests[name] = requestFunction();
  };

  Account.prototype._withSingleRequest = function(name, requestFunction) {
    var _ref;

    if (((_ref = this._requests[name]) != null ? typeof _ref.state === "function" ? _ref.state() : void 0 : void 0) === 'pending') {
      return this._requests[name];
    }
    return this._requests[name] = requestFunction();
  };

  Account.prototype._sendSignOutRequest = function() {
    var _this = this;

    return this._withSingleRequest('signOut', function() {
      return _this.request('DELETE', '/_session').pipe(null, _this._handleRequestError);
    });
  };

  Account.prototype._sendSignInRequest = function(username, password, options) {
    var requestOptions,
      _this = this;

    requestOptions = {
      data: {
        name: this._userKey(username),
        password: password
      }
    };
    return this._withPreviousRequestsAborted('signIn', function() {
      var promise;

      promise = _this.request('POST', '/_session', requestOptions);
      return promise.pipe(_this._handleSignInSuccess(options), _this._handleRequestError);
    });
  };

  Account.prototype._now = function() {
    return new Date;
  };

  return Account;

})();

Hoodie.Config = (function() {
  Config.prototype.type = '$config';

  Config.prototype.id = 'hoodie';

  function Config(hoodie, options) {
    var _this = this;

    this.hoodie = hoodie;
    if (options == null) {
      options = {};
    }
    this.clear = __bind(this.clear, this);
    this.cache = {};
    if (options.type) {
      this.type = options.type;
    }
    if (options.id) {
      this.id = options.id;
    }
    this.hoodie.store.find(this.type, this.id).done(function(obj) {
      return _this.cache = obj;
    });
    this.hoodie.on('account:signedOut', this.clear);
  }

  Config.prototype.set = function(key, value) {
    var isSilent, update;

    if (this.cache[key] === value) {
      return;
    }
    this.cache[key] = value;
    update = {};
    update[key] = value;
    isSilent = key.charAt(0) === '_';
    return this.hoodie.store.update(this.type, this.id, update, {
      silent: isSilent
    });
  };

  Config.prototype.get = function(key) {
    return this.cache[key];
  };

  Config.prototype.clear = function() {
    this.cache = {};
    return this.hoodie.store.remove(this.type, this.id);
  };

  Config.prototype.remove = function(key) {
    return this.set(key, void 0);
  };

  return Config;

})();

Hoodie.Email = (function() {
  function Email(hoodie) {
    this.hoodie = hoodie;
    this._handleEmailUpdate = __bind(this._handleEmailUpdate, this);
  }

  Email.prototype.send = function(emailAttributes) {
    var attributes, defer,
      _this = this;

    if (emailAttributes == null) {
      emailAttributes = {};
    }
    defer = this.hoodie.defer();
    attributes = $.extend({}, emailAttributes);
    if (!this._isValidEmail(emailAttributes.to)) {
      attributes.error = "Invalid email address (" + (attributes.to || 'empty') + ")";
      return defer.reject(attributes).promise();
    }
    this.hoodie.store.add('$email', attributes).then(function(obj) {
      return _this._handleEmailUpdate(defer, obj);
    });
    return defer.promise();
  };

  Email.prototype._isValidEmail = function(email) {
    if (email == null) {
      email = '';
    }
    return /@/.test(email);
  };

  Email.prototype._handleEmailUpdate = function(defer, attributes) {
    var _this = this;

    if (attributes == null) {
      attributes = {};
    }
    if (attributes.error) {
      return defer.reject(attributes);
    } else if (attributes.deliveredAt) {
      return defer.resolve(attributes);
    } else {
      return this.hoodie.remote.one("updated:$email:" + attributes.id, function(attributes) {
        return _this._handleEmailUpdate(defer, attributes);
      });
    }
  };

  return Email;

})();

Hoodie.extend('email', Hoodie.Email);

Hoodie.Errors = {
  INVALID_KEY: function(idOrType) {
    var key;

    key = idOrType.id ? 'id' : 'type';
    return new Error("invalid " + key + " '" + idOrType[key] + "': numbers and lowercase letters allowed only");
  },
  INVALID_ARGUMENTS: function(msg) {
    return new Error(msg);
  },
  NOT_FOUND: function(type, id) {
    return new Error("" + type + " with " + id + " could not be found");
  }
};

Hoodie.Store = (function() {
  function Store(hoodie) {
    this.hoodie = hoodie;
  }

  Store.prototype.save = function(type, id, object, options) {
    var defer;

    if (options == null) {
      options = {};
    }
    defer = this.hoodie.defer();
    if (typeof object !== 'object') {
      defer.reject(Hoodie.Errors.INVALID_ARGUMENTS("object is " + (typeof object)));
      return defer.promise();
    }
    if (id && !this._isValidId(id)) {
      return defer.reject(Hoodie.Errors.INVALID_KEY({
        id: id
      })).promise();
    }
    if (!this._isValidType(type)) {
      return defer.reject(Hoodie.Errors.INVALID_KEY({
        type: type
      })).promise();
    }
    return defer;
  };

  Store.prototype.add = function(type, object, options) {
    if (object == null) {
      object = {};
    }
    if (options == null) {
      options = {};
    }
    return this.save(type, object.id, object);
  };

  Store.prototype.update = function(type, id, objectUpdate, options) {
    var defer, _loadPromise,
      _this = this;

    defer = this.hoodie.defer();
    _loadPromise = this.find(type, id).pipe(function(currentObj) {
      var changedProperties, key, newObj, value;

      newObj = $.extend(true, {}, currentObj);
      if (typeof objectUpdate === 'function') {
        objectUpdate = objectUpdate(newObj);
      }
      if (!objectUpdate) {
        return defer.resolve(currentObj);
      }
      changedProperties = (function() {
        var _results;

        _results = [];
        for (key in objectUpdate) {
          value = objectUpdate[key];
          if (!(currentObj[key] !== value)) {
            continue;
          }
          newObj[key] = value;
          _results.push(key);
        }
        return _results;
      })();
      if (!(changedProperties.length || options)) {
        return defer.resolve(newObj);
      }
      return _this.save(type, id, newObj, options).then(defer.resolve, defer.reject);
    });
    _loadPromise.fail(function() {
      return _this.save(type, id, objectUpdate, options).then(defer.resolve, defer.reject);
    });
    return defer.promise();
  };

  Store.prototype.updateAll = function(filterOrObjects, objectUpdate, options) {
    var promise,
      _this = this;

    if (options == null) {
      options = {};
    }
    switch (true) {
      case typeof filterOrObjects === 'string':
        promise = this.findAll(filterOrObjects);
        break;
      case this.hoodie.isPromise(filterOrObjects):
        promise = filterOrObjects;
        break;
      case $.isArray(filterOrObjects):
        promise = this.hoodie.defer().resolve(filterOrObjects).promise();
        break;
      default:
        promise = this.findAll();
    }
    return promise.pipe(function(objects) {
      var defer, object, _updatePromises;

      defer = _this.hoodie.defer();
      if (!$.isArray(objects)) {
        objects = [objects];
      }
      _updatePromises = (function() {
        var _i, _len, _results;

        _results = [];
        for (_i = 0, _len = objects.length; _i < _len; _i++) {
          object = objects[_i];
          _results.push(this.update(object.type, object.id, objectUpdate, options));
        }
        return _results;
      }).call(_this);
      $.when.apply(null, _updatePromises).then(defer.resolve);
      return defer.promise();
    });
  };

  Store.prototype.find = function(type, id) {
    var defer;

    defer = this.hoodie.defer();
    if (!(typeof type === 'string' && typeof id === 'string')) {
      return defer.reject(Hoodie.Errors.INVALID_ARGUMENTS("type & id are required")).promise();
    }
    return defer;
  };

  Store.prototype.findOrAdd = function(type, id, attributes) {
    var defer,
      _this = this;

    if (attributes == null) {
      attributes = {};
    }
    defer = this.hoodie.defer();
    this.find(type, id).done(defer.resolve).fail(function() {
      var newAttributes;

      newAttributes = $.extend(true, {
        id: id
      }, attributes);
      return _this.add(type, newAttributes).then(defer.resolve, defer.reject);
    });
    return defer.promise();
  };

  Store.prototype.findAll = function() {
    return this.hoodie.defer();
  };

  Store.prototype.remove = function(type, id, options) {
    var defer;

    if (options == null) {
      options = {};
    }
    defer = this.hoodie.defer();
    if (!(typeof type === 'string' && typeof id === 'string')) {
      return defer.reject(Hoodie.Errors.INVALID_ARGUMENTS("type & id are required")).promise();
    }
    return defer;
  };

  Store.prototype.removeAll = function(type, options) {
    var _this = this;

    if (options == null) {
      options = {};
    }
    return this.findAll(type).pipe(function(objects) {
      var object, _i, _len, _results;

      _results = [];
      for (_i = 0, _len = objects.length; _i < _len; _i++) {
        object = objects[_i];
        _results.push(_this.remove(object.type, object.id, options));
      }
      return _results;
    });
  };

  Store.prototype._now = function() {
    return new Date;
  };

  Store.prototype._isValidId = function(key) {
    return /^[^\/]+$/.test(key);
  };

  Store.prototype._isValidType = function(key) {
    return /^[^\/]+$/.test(key);
  };

  return Store;

})();

Hoodie.Remote = (function(_super) {
  __extends(Remote, _super);

  Remote.prototype.name = void 0;

  Remote.prototype.connected = false;

  Remote.prototype.prefix = '';

  function Remote(hoodie, options) {
    this.hoodie = hoodie;
    if (options == null) {
      options = {};
    }
    this._handlePullResults = __bind(this._handlePullResults, this);
    this._handlePullError = __bind(this._handlePullError, this);
    this._handlePullSuccess = __bind(this._handlePullSuccess, this);
    this._restartPullRequest = __bind(this._restartPullRequest, this);
    this._mapDocsFromFindAll = __bind(this._mapDocsFromFindAll, this);
    this._parseAllFromRemote = __bind(this._parseAllFromRemote, this);
    this._parseFromRemote = __bind(this._parseFromRemote, this);
    this.sync = __bind(this.sync, this);
    this.push = __bind(this.push, this);
    this.pull = __bind(this.pull, this);
    this.disconnect = __bind(this.disconnect, this);
    this.connect = __bind(this.connect, this);
    if (options.name != null) {
      this.name = options.name;
    }
    if (options.prefix != null) {
      this.prefix = options.prefix;
    }
    if (options.connected != null) {
      this.connected = options.connected;
    }
    if (options.baseUrl != null) {
      this.baseUrl = options.baseUrl;
    }
    this._knownObjects = {};
    if (this.isConnected()) {
      this.connect();
    }
  }

  Remote.prototype.request = function(type, path, options) {
    if (options == null) {
      options = {};
    }
    if (this.name) {
      path = "/" + (encodeURIComponent(this.name)) + path;
    }
    if (this.baseUrl) {
      path = "" + this.baseUrl + path;
    }
    options.contentType || (options.contentType = 'application/json');
    if (type === 'POST' || type === 'PUT') {
      options.dataType || (options.dataType = 'json');
      options.processData || (options.processData = false);
      options.data = JSON.stringify(options.data);
    }
    return this.hoodie.request(type, path, options);
  };

  Remote.prototype.get = function(view_name, params) {
    return console.log.apply(console, [".get() not yet implemented"].concat(__slice.call(arguments)));
  };

  Remote.prototype.post = function(update_function_name, params) {
    return console.log.apply(console, [".post() not yet implemented"].concat(__slice.call(arguments)));
  };

  Remote.prototype.find = function(type, id) {
    var defer, path;

    defer = Remote.__super__.find.apply(this, arguments);
    if (this.hoodie.isPromise(defer)) {
      return defer;
    }
    path = "" + type + "/" + id;
    if (this.prefix) {
      path = this.prefix + path;
    }
    path = "/" + encodeURIComponent(path);
    return this.request("GET", path).pipe(this._parseFromRemote);
  };

  Remote.prototype.findAll = function(type) {
    var defer, endkey, path, startkey;

    defer = Remote.__super__.findAll.apply(this, arguments);
    if (this.hoodie.isPromise(defer)) {
      return defer;
    }
    path = "/_all_docs?include_docs=true";
    switch (true) {
      case (type != null) && this.prefix !== '':
        startkey = "" + this.prefix + type + "/";
        break;
      case type != null:
        startkey = "" + type + "/";
        break;
      case this.prefix !== '':
        startkey = this.prefix;
        break;
      default:
        startkey = '';
    }
    if (startkey) {
      endkey = startkey.replace(/.$/, function(char) {
        var charCode;

        charCode = char.charCodeAt(0);
        return String.fromCharCode(charCode + 1);
      });
      path = "" + path + "&startkey=\"" + (encodeURIComponent(startkey)) + "\"&endkey=\"" + (encodeURIComponent(endkey)) + "\"";
    }
    return this.request("GET", path).pipe(this._mapDocsFromFindAll).pipe(this._parseAllFromRemote);
  };

  Remote.prototype.save = function(type, id, object) {
    var defer, path;

    defer = Remote.__super__.save.apply(this, arguments);
    if (this.hoodie.isPromise(defer)) {
      return defer;
    }
    if (!id) {
      id = this.hoodie.uuid();
    }
    object = $.extend({
      type: type,
      id: id
    }, object);
    object = this._parseForRemote(object);
    path = "/" + encodeURIComponent(object._id);
    return this.request("PUT", path, {
      data: object
    });
  };

  Remote.prototype.remove = function(type, id) {
    return this.update(type, id, {
      _deleted: true
    });
  };

  Remote.prototype.removeAll = function(type) {
    return this.updateAll(type, {
      _deleted: true
    });
  };

  Remote.prototype.isKnownObject = function(object) {
    var key;

    key = "" + object.type + "/" + object.id;
    return this._knownObjects[key] != null;
  };

  Remote.prototype.markAsKnownObject = function(object) {
    var key;

    key = "" + object.type + "/" + object.id;
    return this._knownObjects[key] = 1;
  };

  Remote.prototype.connect = function(options) {
    this.connected = true;
    return this.pull();
  };

  Remote.prototype.disconnect = function() {
    var _ref, _ref1;

    this.connected = false;
    if ((_ref = this._pullRequest) != null) {
      _ref.abort();
    }
    return (_ref1 = this._pushRequest) != null ? _ref1.abort() : void 0;
  };

  Remote.prototype.isConnected = function() {
    return this.connected;
  };

  Remote.prototype.getSinceNr = function() {
    return this._since || 0;
  };

  Remote.prototype.setSinceNr = function(seq) {
    return this._since = seq;
  };

  Remote.prototype.pull = function() {
    this._pullRequest = this.request('GET', this._pullUrl());
    if (this.isConnected()) {
      window.clearTimeout(this._pullRequestTimeout);
      this._pullRequestTimeout = window.setTimeout(this._restartPullRequest, 25000);
    }
    return this._pullRequest.then(this._handlePullSuccess, this._handlePullError);
  };

  Remote.prototype.push = function(objects) {
    var object, objectsForRemote, _i, _len;

    if (!(objects != null ? objects.length : void 0)) {
      return this.hoodie.resolveWith([]);
    }
    objectsForRemote = [];
    for (_i = 0, _len = objects.length; _i < _len; _i++) {
      object = objects[_i];
      this._addRevisionTo(object);
      object = this._parseForRemote(object);
      objectsForRemote.push(object);
    }
    return this._pushRequest = this.request('POST', "/_bulk_docs", {
      data: {
        docs: objectsForRemote,
        new_edits: false
      }
    });
  };

  Remote.prototype.sync = function(objects) {
    return this.push(objects).pipe(this.pull);
  };

  Remote.prototype.on = function(event, cb) {
    event = event.replace(/(^| )([^ ]+)/g, "$1" + this.name + ":$2");
    return this.hoodie.on(event, cb);
  };

  Remote.prototype.one = function(event, cb) {
    event = event.replace(/(^| )([^ ]+)/g, "$1" + this.name + ":$2");
    return this.hoodie.one(event, cb);
  };

  Remote.prototype.trigger = function() {
    var event, parameters, _ref;

    event = arguments[0], parameters = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return (_ref = this.hoodie).trigger.apply(_ref, ["" + this.name + ":" + event].concat(__slice.call(parameters)));
  };

  Remote.prototype._validSpecialAttributes = ['_id', '_rev', '_deleted', '_revisions', '_attachments'];

  Remote.prototype._parseForRemote = function(object) {
    var attr, properties;

    properties = $.extend({}, object);
    for (attr in properties) {
      if (~this._validSpecialAttributes.indexOf(attr)) {
        continue;
      }
      if (!/^_/.test(attr)) {
        continue;
      }
      delete properties[attr];
    }
    properties._id = "" + properties.type + "/" + properties.id;
    if (this.prefix) {
      properties._id = "" + this.prefix + properties._id;
    }
    delete properties.id;
    return properties;
  };

  Remote.prototype._parseFromRemote = function(object) {
    var id, ignore, _ref;

    id = object._id || object.id;
    delete object._id;
    if (this.prefix) {
      id = id.replace(RegExp('^' + this.prefix), '');
    }
    _ref = id.match(/([^\/]+)\/(.*)/), ignore = _ref[0], object.type = _ref[1], object.id = _ref[2];
    return object;
  };

  Remote.prototype._parseAllFromRemote = function(objects) {
    var object, _i, _len, _results;

    _results = [];
    for (_i = 0, _len = objects.length; _i < _len; _i++) {
      object = objects[_i];
      _results.push(this._parseFromRemote(object));
    }
    return _results;
  };

  Remote.prototype._addRevisionTo = function(attributes) {
    var currentRevId, currentRevNr, newRevisionId, _ref;

    try {
      _ref = attributes._rev.split(/-/), currentRevNr = _ref[0], currentRevId = _ref[1];
    } catch (_error) {}
    currentRevNr = parseInt(currentRevNr, 10) || 0;
    newRevisionId = this._generateNewRevisionId();
    if (attributes._$local) {
      newRevisionId += "-local";
    }
    attributes._rev = "" + (currentRevNr + 1) + "-" + newRevisionId;
    attributes._revisions = {
      start: 1,
      ids: [newRevisionId]
    };
    if (currentRevId) {
      attributes._revisions.start += currentRevNr;
      return attributes._revisions.ids.push(currentRevId);
    }
  };

  Remote.prototype._generateNewRevisionId = function() {
    return this.hoodie.uuid(9);
  };

  Remote.prototype._mapDocsFromFindAll = function(response) {
    return response.rows.map(function(row) {
      return row.doc;
    });
  };

  Remote.prototype._pullUrl = function() {
    var since;

    since = this.getSinceNr();
    if (this.isConnected()) {
      return "/_changes?include_docs=true&since=" + since + "&heartbeat=10000&feed=longpoll";
    } else {
      return "/_changes?include_docs=true&since=" + since;
    }
  };

  Remote.prototype._restartPullRequest = function() {
    var _ref;

    return (_ref = this._pullRequest) != null ? _ref.abort() : void 0;
  };

  Remote.prototype._handlePullSuccess = function(response) {
    this.setSinceNr(response.last_seq);
    this._handlePullResults(response.results);
    if (this.isConnected()) {
      return this.pull();
    }
  };

  Remote.prototype._handlePullError = function(xhr, error, resp) {
    if (!this.isConnected()) {
      return;
    }
    switch (xhr.status) {
      case 401:
        this.trigger('error:unauthenticated', error);
        return this.disconnect();
      case 404:
        return window.setTimeout(this.pull, 3000);
      case 500:
        this.trigger('error:server', error);
        window.setTimeout(this.pull, 3000);
        return this.hoodie.checkConnection();
      default:
        if (!this.isConnected()) {
          return;
        }
        if (xhr.statusText === 'abort') {
          return this.pull();
        } else {
          window.setTimeout(this.pull, 3000);
          return this.hoodie.checkConnection();
        }
    }
  };

  Remote.prototype._handlePullResults = function(changes) {
    var doc, event, object, _i, _len, _results;

    _results = [];
    for (_i = 0, _len = changes.length; _i < _len; _i++) {
      doc = changes[_i].doc;
      if (this.prefix && doc._id.indexOf(this.prefix) !== 0) {
        continue;
      }
      object = this._parseFromRemote(doc);
      if (object._deleted) {
        if (!this.isKnownObject(object)) {
          continue;
        }
        event = 'remove';
        delete this.isKnownObject(object);
      } else {
        if (this.isKnownObject(object)) {
          event = 'update';
        } else {
          event = 'add';
          this.markAsKnownObject(object);
        }
      }
      this.trigger("" + event, object);
      this.trigger("" + event + ":" + object.type, object);
      this.trigger("" + event + ":" + object.type + ":" + object.id, object);
      this.trigger("change", event, object);
      this.trigger("change:" + object.type, event, object);
      _results.push(this.trigger("change:" + object.type + ":" + object.id, event, object));
    }
    return _results;
  };

  return Remote;

})(Hoodie.Store);

ConnectionError = (function(_super) {
  __extends(ConnectionError, _super);

  ConnectionError.prototype.name = "ConnectionError";

  function ConnectionError(message, data) {
    this.message = message;
    this.data = data;
    ConnectionError.__super__.constructor.apply(this, arguments);
  }

  return ConnectionError;

})(Error);

Hoodie.AccountRemote = (function(_super) {
  __extends(AccountRemote, _super);

  AccountRemote.prototype.connected = true;

  function AccountRemote(hoodie, options) {
    this.hoodie = hoodie;
    if (options == null) {
      options = {};
    }
    this._handleSignIn = __bind(this._handleSignIn, this);
    this._connect = __bind(this._connect, this);
    this.push = __bind(this.push, this);
    this.disconnect = __bind(this.disconnect, this);
    this.connect = __bind(this.connect, this);
    this.name = this.hoodie.account.db();
    this.connected = true;
    options.prefix = '';
    this.hoodie.on('account:signin', this._handleSignIn);
    this.hoodie.on('account:reauthenticated', this._connect);
    this.hoodie.on('account:signout', this.disconnect);
    this.hoodie.on('reconnected', this.connect);
    AccountRemote.__super__.constructor.call(this, this.hoodie, options);
    this.bootstrapKnownObjects();
  }

  AccountRemote.prototype.connect = function() {
    return this.hoodie.account.authenticate().pipe(this._connect);
  };

  AccountRemote.prototype.disconnect = function() {
    this.hoodie.unbind('store:idle', this.push);
    return AccountRemote.__super__.disconnect.apply(this, arguments);
  };

  AccountRemote.prototype.bootstrapKnownObjects = function() {
    var id, key, type, _i, _len, _ref, _ref1, _results;

    _ref = this.hoodie.store.index();
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      key = _ref[_i];
      _ref1 = key.split(/\//), type = _ref1[0], id = _ref1[1];
      _results.push(this.markAsKnownObject({
        type: type,
        id: id
      }));
    }
    return _results;
  };

  AccountRemote.prototype.getSinceNr = function(since) {
    return this.hoodie.config.get('_remote.since') || 0;
  };

  AccountRemote.prototype.setSinceNr = function(since) {
    return this.hoodie.config.set('_remote.since', since);
  };

  AccountRemote.prototype.push = function(objects) {
    var error, promise;

    if (!this.isConnected()) {
      error = new ConnectionError("Not connected: could not push local changes to remote");
      return this.hoodie.rejectWith(error);
    }
    if (!$.isArray(objects)) {
      objects = this.hoodie.store.changedObjects();
    }
    promise = AccountRemote.__super__.push.call(this, objects);
    promise.fail(this.hoodie.checkConnection);
    return promise;
  };

  AccountRemote.prototype.on = function(event, cb) {
    event = event.replace(/(^| )([^ ]+)/g, "$1remote:$2");
    return this.hoodie.on(event, cb);
  };

  AccountRemote.prototype.one = function(event, cb) {
    event = event.replace(/(^| )([^ ]+)/g, "$1remote:$2");
    return this.hoodie.one(event, cb);
  };

  AccountRemote.prototype.trigger = function() {
    var event, parameters, _ref;

    event = arguments[0], parameters = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return (_ref = this.hoodie).trigger.apply(_ref, ["remote:" + event].concat(__slice.call(parameters)));
  };

  AccountRemote.prototype._connect = function() {
    this.connected = true;
    this.hoodie.on('store:idle', this.push);
    return this.sync();
  };

  AccountRemote.prototype._handleSignIn = function() {
    this.name = this.hoodie.account.db();
    return this._connect();
  };

  return AccountRemote;

})(Hoodie.Remote);

Hoodie.LocalStore = (function(_super) {
  __extends(LocalStore, _super);

  LocalStore.prototype.idleTimeout = 2000;

  function LocalStore(hoodie) {
    this.hoodie = hoodie;
    this._triggerDirtyAndIdleEvents = __bind(this._triggerDirtyAndIdleEvents, this);
    this._handleRemoteChange = __bind(this._handleRemoteChange, this);
    this.clear = __bind(this.clear, this);
    this.markAllAsChanged = __bind(this.markAllAsChanged, this);
    this._cached = {};
    this._dirty = {};
    this._promiseApi = {
      hoodie: this.hoodie
    };
    if (!this.isPersistent()) {
      this.db = {
        getItem: function() {
          return null;
        },
        setItem: function() {
          return null;
        },
        removeItem: function() {
          return null;
        },
        key: function() {
          return null;
        },
        length: function() {
          return 0;
        },
        clear: function() {
          return null;
        }
      };
    }
    this._subscribeToOutsideEvents();
    this._bootstrap();
  }

  LocalStore.prototype.db = {
    getItem: function(key) {
      return window.localStorage.getItem(key);
    },
    setItem: function(key, value) {
      return window.localStorage.setItem(key, value);
    },
    removeItem: function(key) {
      return window.localStorage.removeItem(key);
    },
    key: function(nr) {
      return window.localStorage.key(nr);
    },
    length: function() {
      return window.localStorage.length;
    },
    clear: function() {
      return window.localStorage.clear();
    }
  };

  LocalStore.prototype.save = function(type, id, properties, options) {
    var currentObject, defer, error, event, isNew, key, object;

    if (options == null) {
      options = {};
    }
    defer = LocalStore.__super__.save.apply(this, arguments);
    if (this.hoodie.isPromise(defer)) {
      return this._decoratePromise(defer);
    }
    object = $.extend(true, {}, properties);
    if (id) {
      currentObject = this.cache(type, id);
      isNew = typeof currentObject !== 'object';
    } else {
      isNew = true;
      id = this.hoodie.uuid();
    }
    if (isNew && this.hoodie.account) {
      object.createdBy || (object.createdBy = this.hoodie.account.ownerHash);
    }
    if (!isNew) {
      for (key in currentObject) {
        if (!object.hasOwnProperty(key)) {
          switch (key.charAt(0)) {
            case '_':
              if (options.remote) {
                object[key] = currentObject[key];
              }
              break;
            case '$':
              if (!options.remote) {
                object[key] = currentObject[key];
              }
          }
        }
      }
    }
    if (options.remote) {
      object._syncedAt = this._now();
    } else if (!options.silent) {
      object.updatedAt = this._now();
      object.createdAt || (object.createdAt = object.updatedAt);
    }
    if (options.local) {
      object._$local = true;
    } else {
      delete object._$local;
    }
    try {
      object = this.cache(type, id, object, options);
      defer.resolve(object, isNew).promise();
      event = isNew ? 'add' : 'update';
      this._triggerEvents(event, object, options);
    } catch (_error) {
      error = _error;
      defer.reject(error).promise();
    }
    return this._decoratePromise(defer.promise());
  };

  LocalStore.prototype.find = function(type, id) {
    var defer, error, object;

    defer = LocalStore.__super__.find.apply(this, arguments);
    if (this.hoodie.isPromise(defer)) {
      return this._decoratePromise(defer);
    }
    try {
      object = this.cache(type, id);
      if (!object) {
        defer.reject(Hoodie.Errors.NOT_FOUND(type, id)).promise();
      }
      defer.resolve(object);
    } catch (_error) {
      error = _error;
      defer.reject(error);
    }
    return this._decoratePromise(defer.promise());
  };

  LocalStore.prototype.findAll = function(filter) {
    var currentType, defer, error, id, key, keys, obj, results, type;

    if (filter == null) {
      filter = function() {
        return true;
      };
    }
    defer = LocalStore.__super__.findAll.apply(this, arguments);
    if (this.hoodie.isPromise(defer)) {
      return this._decoratePromise(defer);
    }
    keys = this.index();
    if (typeof filter === 'string') {
      type = filter;
      filter = function(obj) {
        return obj.type === type;
      };
    }
    try {
      results = (function() {
        var _i, _len, _ref, _results;

        _results = [];
        for (_i = 0, _len = keys.length; _i < _len; _i++) {
          key = keys[_i];
          if (!(this._isSemanticId(key))) {
            continue;
          }
          _ref = key.split('/'), currentType = _ref[0], id = _ref[1];
          obj = this.cache(currentType, id);
          if (obj && filter(obj)) {
            _results.push(obj);
          } else {
            continue;
          }
        }
        return _results;
      }).call(this);
      results.sort(function(a, b) {
        if (a.createdAt > b.createdAt) {
          return -1;
        } else if (a.createdAt < b.createdAt) {
          return 1;
        } else {
          return 0;
        }
      });
      defer.resolve(results).promise();
    } catch (_error) {
      error = _error;
      defer.reject(error).promise();
    }
    return this._decoratePromise(defer.promise());
  };

  LocalStore.prototype.remove = function(type, id, options) {
    var defer, key, object, objectWasMarkedAsDeleted, promise;

    if (options == null) {
      options = {};
    }
    defer = LocalStore.__super__.remove.apply(this, arguments);
    if (this.hoodie.isPromise(defer)) {
      return this._decoratePromise(defer);
    }
    key = "" + type + "/" + id;
    if (options.remote) {
      this.db.removeItem(key);
      objectWasMarkedAsDeleted = this._cached[key] && this._isMarkedAsDeleted(this._cached[key]);
      this._cached[key] = false;
      this.clearChanged(type, id);
      if (objectWasMarkedAsDeleted) {
        return;
      }
    }
    object = this.cache(type, id);
    if (!object) {
      return this._decoratePromise(defer.reject(Hoodie.Errors.NOT_FOUND(type, id)).promise());
    }
    if (object._syncedAt) {
      object._deleted = true;
      this.cache(type, id, object);
    } else {
      key = "" + type + "/" + id;
      this.db.removeItem(key);
      this._cached[key] = false;
      this.clearChanged(type, id);
    }
    this._triggerEvents("remove", object, options);
    promise = defer.resolve(object).promise();
    return this._decoratePromise(promise);
  };

  LocalStore.prototype.update = function() {
    return this._decoratePromise(LocalStore.__super__.update.apply(this, arguments));
  };

  LocalStore.prototype.updateAll = function() {
    return this._decoratePromise(LocalStore.__super__.updateAll.apply(this, arguments));
  };

  LocalStore.prototype.removeAll = function() {
    return this._decoratePromise(LocalStore.__super__.removeAll.apply(this, arguments));
  };

  LocalStore.prototype.index = function() {
    var i, key, keys, _i, _ref;

    keys = [];
    for (i = _i = 0, _ref = this.db.length(); 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
      key = this.db.key(i);
      if (this._isSemanticId(key)) {
        keys.push(key);
      }
    }
    return keys;
  };

  LocalStore.prototype.cache = function(type, id, object, options) {
    var key;

    if (object == null) {
      object = false;
    }
    if (options == null) {
      options = {};
    }
    key = "" + type + "/" + id;
    if (object) {
      $.extend(object, {
        type: type,
        id: id
      });
      this._setObject(type, id, object);
      if (options.remote) {
        this.clearChanged(type, id);
        this._cached[key] = $.extend(true, {}, object);
        return this._cached[key];
      }
    } else {
      if (this._cached[key] === false) {
        return false;
      }
      if (this._cached[key]) {
        return $.extend(true, {}, this._cached[key]);
      }
      object = this._getObject(type, id);
      if (object === false) {
        this.clearChanged(type, id);
        this._cached[key] = false;
        return false;
      }
    }
    if (this._isMarkedAsDeleted(object)) {
      this.markAsChanged(type, id, object, options);
      this._cached[key] = false;
      return false;
    }
    this._cached[key] = $.extend(true, {}, object);
    if (this._isDirty(object)) {
      this.markAsChanged(type, id, this._cached[key], options);
    } else {
      this.clearChanged(type, id);
    }
    return $.extend(true, {}, object);
  };

  LocalStore.prototype.clearChanged = function(type, id) {
    var key;

    if (type && id) {
      key = "" + type + "/" + id;
      delete this._dirty[key];
    } else {
      this._dirty = {};
    }
    this._saveDirtyIds();
    return window.clearTimeout(this._dirtyTimeout);
  };

  LocalStore.prototype.isMarkedAsDeleted = function(type, id) {
    return this._isMarkedAsDeleted(this.cache(type, id));
  };

  LocalStore.prototype.markAsChanged = function(type, id, object, options) {
    var key;

    if (options == null) {
      options = {};
    }
    key = "" + type + "/" + id;
    this._dirty[key] = object;
    this._saveDirtyIds();
    if (options.silent) {
      return;
    }
    return this._triggerDirtyAndIdleEvents();
  };

  LocalStore.prototype.markAllAsChanged = function() {
    var _this = this;

    return this.findAll().pipe(function(objects) {
      var key, object, _i, _len;

      for (_i = 0, _len = objects.length; _i < _len; _i++) {
        object = objects[_i];
        key = "" + object.type + "/" + object.id;
        _this._dirty[key] = object;
      }
      _this._saveDirtyIds();
      return _this._triggerDirtyAndIdleEvents();
    });
  };

  LocalStore.prototype.changedObjects = function() {
    var id, key, object, type, _ref, _ref1, _results;

    _ref = this._dirty;
    _results = [];
    for (key in _ref) {
      object = _ref[key];
      _ref1 = key.split('/'), type = _ref1[0], id = _ref1[1];
      object.type = type;
      object.id = id;
      _results.push(object);
    }
    return _results;
  };

  LocalStore.prototype.isDirty = function(type, id) {
    if (!type) {
      return !$.isEmptyObject(this._dirty);
    }
    return this._isDirty(this.cache(type, id));
  };

  LocalStore.prototype.clear = function() {
    var defer, error, key, keys, results;

    defer = this.hoodie.defer();
    try {
      keys = this.index();
      results = (function() {
        var _i, _len, _results;

        _results = [];
        for (_i = 0, _len = keys.length; _i < _len; _i++) {
          key = keys[_i];
          if (this._isSemanticId(key)) {
            _results.push(this.db.removeItem(key));
          }
        }
        return _results;
      }).call(this);
      this._cached = {};
      this.clearChanged();
      defer.resolve();
      this.trigger("clear");
    } catch (_error) {
      error = _error;
      defer.reject(error);
    }
    return defer.promise();
  };

  LocalStore.prototype.isPersistent = function() {
    var e;

    try {
      if (!window.localStorage) {
        return false;
      }
      localStorage.setItem('Storage-Test', "1");
      if (localStorage.getItem('Storage-Test') !== "1") {
        return false;
      }
      localStorage.removeItem('Storage-Test');
    } catch (_error) {
      e = _error;
      return false;
    }
    return true;
  };

  LocalStore.prototype.trigger = function() {
    var event, parameters, _ref;

    event = arguments[0], parameters = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return (_ref = this.hoodie).trigger.apply(_ref, ["store:" + event].concat(__slice.call(parameters)));
  };

  LocalStore.prototype.on = function(event, data) {
    event = event.replace(/(^| )([^ ]+)/g, "$1store:$2");
    return this.hoodie.on(event, data);
  };

  LocalStore.prototype.decoratePromises = function(methods) {
    return $.extend(this._promiseApi, methods);
  };

  LocalStore.prototype._bootstrap = function() {
    var id, key, keys, obj, type, _i, _len, _ref, _results;

    keys = this.db.getItem('_dirty');
    if (!keys) {
      return;
    }
    keys = keys.split(',');
    _results = [];
    for (_i = 0, _len = keys.length; _i < _len; _i++) {
      key = keys[_i];
      _ref = key.split('/'), type = _ref[0], id = _ref[1];
      _results.push(obj = this.cache(type, id));
    }
    return _results;
  };

  LocalStore.prototype._subscribeToOutsideEvents = function() {
    this.hoodie.on('account:cleanup', this.clear);
    this.hoodie.on('account:signup', this.markAllAsChanged);
    return this.hoodie.on('remote:change', this._handleRemoteChange);
  };

  LocalStore.prototype._handleRemoteChange = function(typeOfChange, object) {
    if (typeOfChange === 'remove') {
      return this.remove(object.type, object.id, {
        remote: true
      });
    } else {
      return this.save(object.type, object.id, object, {
        remote: true
      });
    }
  };

  LocalStore.prototype._setObject = function(type, id, object) {
    var key, store;

    key = "" + type + "/" + id;
    store = $.extend({}, object);
    delete store.type;
    delete store.id;
    return this.db.setItem(key, JSON.stringify(store));
  };

  LocalStore.prototype._getObject = function(type, id) {
    var json, key, obj;

    key = "" + type + "/" + id;
    json = this.db.getItem(key);
    if (json) {
      obj = JSON.parse(json);
      obj.type = type;
      obj.id = id;
      return obj;
    } else {
      return false;
    }
  };

  LocalStore.prototype._saveDirtyIds = function() {
    var ids;

    if ($.isEmptyObject(this._dirty)) {
      return this.db.removeItem('_dirty');
    } else {
      ids = Object.keys(this._dirty);
      return this.db.setItem('_dirty', ids.join(','));
    }
  };

  LocalStore.prototype._now = function() {
    return JSON.stringify(new Date).replace(/"/g, '');
  };

  LocalStore.prototype._isValidId = function(key) {
    return /^[a-z0-9\-]+$/.test(key);
  };

  LocalStore.prototype._isValidType = function(key) {
    return /^[a-z$][a-z0-9]+$/.test(key);
  };

  LocalStore.prototype._isSemanticId = function(key) {
    return /^[a-z$][a-z0-9]+\/[a-z0-9]+$/.test(key);
  };

  LocalStore.prototype._isDirty = function(object) {
    if (!object.updatedAt) {
      return false;
    }
    if (!object._syncedAt) {
      return true;
    }
    return object._syncedAt < object.updatedAt;
  };

  LocalStore.prototype._isMarkedAsDeleted = function(object) {
    return object._deleted === true;
  };

  LocalStore.prototype._triggerEvents = function(event, object, options) {
    this.trigger(event, object, options);
    this.trigger("" + event + ":" + object.type, object, options);
    if (event !== 'new') {
      this.trigger("" + event + ":" + object.type + ":" + object.id, object, options);
    }
    this.trigger("change", event, object, options);
    this.trigger("change:" + object.type, event, object, options);
    if (event !== 'new') {
      return this.trigger("change:" + object.type + ":" + object.id, event, object, options);
    }
  };

  LocalStore.prototype._triggerDirtyAndIdleEvents = function() {
    var _this = this;

    this.trigger('dirty');
    window.clearTimeout(this._dirtyTimeout);
    return this._dirtyTimeout = window.setTimeout((function() {
      return _this.trigger('idle', _this.changedObjects());
    }), this.idleTimeout);
  };

  LocalStore.prototype._decoratePromise = function(promise) {
    return $.extend(promise, this._promiseApi);
  };

  return LocalStore;

})(Hoodie.Store);

Hoodie.Share = (function() {
  function Share(hoodie) {
    var api;

    this.hoodie = hoodie;
    this._open = __bind(this._open, this);
    this.instance = Hoodie.ShareInstance;
    api = this._open;
    $.extend(api, this);
    this.hoodie.store.decoratePromises({
      shareAt: this._storeShareAt,
      unshareAt: this._storeUnshareAt,
      unshare: this._storeUnshare,
      share: this._storeShare
    });
    return api;
  }

  Share.prototype.add = function(options) {
    var _this = this;

    if (options == null) {
      options = {};
    }
    return this.hoodie.store.add('$share', this._filterShareOptions(options)).pipe(function(object) {
      if (!_this.hoodie.account.hasAccount()) {
        _this.hoodie.account.anonymousSignUp();
      }
      return new _this.instance(_this.hoodie, object);
    });
  };

  Share.prototype.find = function(id) {
    var _this = this;

    return this.hoodie.store.find('$share', id).pipe(function(object) {
      return new _this.instance(_this.hoodie, object);
    });
  };

  Share.prototype.findAll = function() {
    var _this = this;

    return this.hoodie.store.findAll('$share').pipe(function(objects) {
      var obj, _i, _len, _results;

      _results = [];
      for (_i = 0, _len = objects.length; _i < _len; _i++) {
        obj = objects[_i];
        _results.push(new _this.instance(_this.hoodie, obj));
      }
      return _results;
    });
  };

  Share.prototype.findOrAdd = function(id, options) {
    var _this = this;

    return this.hoodie.store.findOrAdd('$share', id, this._filterShareOptions(options)).pipe(function(object) {
      if (!_this.hoodie.account.hasAccount()) {
        _this.hoodie.account.anonymousSignUp();
      }
      return new _this.instance(_this.hoodie, object);
    });
  };

  Share.prototype.save = function(id, options) {
    var _this = this;

    return this.hoodie.store.save('$share', id, this._filterShareOptions(options)).pipe(function(object) {
      return new _this.instance(_this.hoodie, object);
    });
  };

  Share.prototype.update = function(id, changed_options) {
    var _this = this;

    return this.hoodie.store.update('$share', id, this._filterShareOptions(changed_options)).pipe(function(object) {
      return new _this.instance(_this.hoodie, object);
    });
  };

  Share.prototype.updateAll = function(changed_options) {
    var _this = this;

    return this.hoodie.store.updateAll('$share', this._filterShareOptions(changed_options)).pipe(function(objects) {
      var obj, _i, _len, _results;

      _results = [];
      for (_i = 0, _len = objects.length; _i < _len; _i++) {
        obj = objects[_i];
        _results.push(new _this.instance(_this.hoodie, obj));
      }
      return _results;
    });
  };

  Share.prototype.remove = function(id) {
    this.hoodie.store.findAll(function(obj) {
      return obj.$shares[id];
    }).unshareAt(id);
    return this.hoodie.store.remove('$share', id);
  };

  Share.prototype.removeAll = function() {
    this.hoodie.store.findAll(function(obj) {
      return obj.$shares;
    }).unshare();
    return this.hoodie.store.removeAll('$share');
  };

  Share.prototype._allowedOptions = ["id", "access", "createdBy"];

  Share.prototype._filterShareOptions = function(options) {
    var filteredOptions, option, _i, _len, _ref;

    if (options == null) {
      options = {};
    }
    filteredOptions = {};
    _ref = this._allowedOptions;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      option = _ref[_i];
      if (options.hasOwnProperty(option)) {
        filteredOptions[option] = options[option];
      }
    }
    return filteredOptions;
  };

  Share.prototype._open = function(shareId, options) {
    if (options == null) {
      options = {};
    }
    $.extend(options, {
      id: shareId
    });
    return new this.instance(this.hoodie, options);
  };

  Share.prototype._storeShareAt = function(shareId) {
    var _this = this;

    return this.pipe(function(objects) {
      var object, updateObject, _i, _len, _results;

      updateObject = function(object) {
        _this.hoodie.store.update(object.type, object.id, {
          $sharedAt: shareId
        });
        return object;
      };
      if ($.isArray(objects)) {
        _results = [];
        for (_i = 0, _len = objects.length; _i < _len; _i++) {
          object = objects[_i];
          _results.push(updateObject(object));
        }
        return _results;
      } else {
        return updateObject(objects);
      }
    });
  };

  Share.prototype._storeUnshareAt = function(shareId) {
    var _this = this;

    return this.pipe(function(objects) {
      var object, updateObject, _i, _len, _results;

      updateObject = function(object) {
        if (object.$sharedAt !== shareId) {
          return object;
        }
        _this.hoodie.store.update(object.type, object.id, {
          $unshared: true
        });
        return object;
      };
      if ($.isArray(objects)) {
        _results = [];
        for (_i = 0, _len = objects.length; _i < _len; _i++) {
          object = objects[_i];
          _results.push(updateObject(object));
        }
        return _results;
      } else {
        return updateObject(objects);
      }
    });
  };

  Share.prototype._storeUnshare = function() {
    var _this = this;

    return this.pipe(function(objects) {
      var object, updateObject, _i, _len, _results;

      updateObject = function(object) {
        if (!object.$sharedAt) {
          return object;
        }
        _this.hoodie.store.update(object.type, object.id, {
          $unshared: true
        });
        return object;
      };
      if ($.isArray(objects)) {
        _results = [];
        for (_i = 0, _len = objects.length; _i < _len; _i++) {
          object = objects[_i];
          _results.push(updateObject(object));
        }
        return _results;
      } else {
        return updateObject(objects);
      }
    });
  };

  Share.prototype._storeShare = function(properties) {
    var _this = this;

    return this.pipe(function(objects) {
      return _this.hoodie.share.add().pipe(function(newShare) {
        var object, updateObject, value;

        updateObject = function(object) {
          _this.hoodie.store.update(object.type, object.id, {
            $sharedAt: newShare.id
          });
          return object;
        };
        value = (function() {
          var _i, _len, _results;

          if ($.isArray(objects)) {
            _results = [];
            for (_i = 0, _len = objects.length; _i < _len; _i++) {
              object = objects[_i];
              _results.push(updateObject(object));
            }
            return _results;
          } else {
            return updateObject(objects);
          }
        })();
        return _this.hoodie.defer().resolve(value, newShare).promise();
      });
    });
  };

  return Share;

})();

Hoodie.extend('share', Hoodie.Share);

Hoodie.User = (function() {
  function User(hoodie) {
    this.hoodie = hoodie;
    this.api = __bind(this.api, this);
    this.hoodie.store.decoratePromises({
      publish: this._storePublish,
      unpublish: this._storeUnpublish
    });
    return this.api;
  }

  User.prototype.api = function(userHash, options) {
    if (options == null) {
      options = {};
    }
    $.extend(options, {
      prefix: '$public'
    });
    return this.hoodie.open("user/" + userHash + "/public", options);
  };

  User.prototype._storePublish = function(properties) {
    var _this = this;

    return this.pipe(function(objects) {
      var object, _i, _len, _results;

      if (!$.isArray(objects)) {
        objects = [objects];
      }
      _results = [];
      for (_i = 0, _len = objects.length; _i < _len; _i++) {
        object = objects[_i];
        _results.push(_this.hoodie.store.update(object.type, object.id, {
          $public: properties || true
        }));
      }
      return _results;
    });
  };

  User.prototype._storeUnpublish = function() {
    var _this = this;

    return this.pipe(function(objects) {
      var object, _i, _len, _results;

      if (!$.isArray(objects)) {
        objects = [objects];
      }
      _results = [];
      for (_i = 0, _len = objects.length; _i < _len; _i++) {
        object = objects[_i];
        if (object.$public) {
          _results.push(_this.hoodie.store.update(object.type, object.id, {
            $public: false
          }));
        }
      }
      return _results;
    });
  };

  return User;

})();

Hoodie.extend('user', Hoodie.User);

Hoodie.Global = (function() {
  function Global(hoodie) {
    return hoodie.open("global");
  }

  return Global;

})();

Hoodie.extend('global', Hoodie.Global);

Hoodie.ShareInstance = (function(_super) {
  __extends(ShareInstance, _super);

  ShareInstance.prototype.access = false;

  function ShareInstance(hoodie, options) {
    this.hoodie = hoodie;
    if (options == null) {
      options = {};
    }
    this._handleSecurityResponse = __bind(this._handleSecurityResponse, this);
    this._objectBelongsToMe = __bind(this._objectBelongsToMe, this);
    this.id = options.id || this.hoodie.uuid();
    this.name = "share/" + this.id;
    this.prefix = this.name;
    $.extend(this, options);
    ShareInstance.__super__.constructor.apply(this, arguments);
  }

  ShareInstance.prototype.subscribe = function() {
    return this.request('GET', '/_security').pipe(this._handleSecurityResponse);
  };

  ShareInstance.prototype.unsubscribe = function() {
    this.hoodie.share.remove(this.id);
    this.hoodie.store.removeAll(this._objectBelongsToMe, {
      local: true
    });
    return this;
  };

  ShareInstance.prototype.grantReadAccess = function(users) {
    var currentUsers, user, _i, _len;

    if (this.access === true || this.access.read === true) {
      return this.hoodie.resolveWith(this);
    }
    if (typeof users === 'string') {
      users = [users];
    }
    if (this.access === false || this.access.read === false) {
      if (this.access.read != null) {
        this.access.read = users || true;
      } else {
        this.access = users || true;
      }
    }
    if (users) {
      currentUsers = this.access.read || this.access;
      for (_i = 0, _len = users.length; _i < _len; _i++) {
        user = users[_i];
        if (currentUsers.indexOf(user) === -1) {
          currentUsers.push(user);
        }
      }
      if (this.access.read != null) {
        this.access.read = currentUsers;
      } else {
        this.access = currentUsers;
      }
    } else {
      if (this.access.read != null) {
        this.access.read = true;
      } else {
        this.access = true;
      }
    }
    return this.hoodie.share.update(this.id, {
      access: this.access
    });
  };

  ShareInstance.prototype.revokeReadAccess = function(users) {
    var changed, currentUsers, idx, user, _i, _len;

    this.revokeWriteAccess(users);
    if (this.access === false || this.access.read === false) {
      return this.hoodie.resolveWith(this);
    }
    if (users) {
      if (this.access === true || this.access.read === true) {
        return this.hoodie.rejectWith(this);
      }
      if (typeof users === 'string') {
        users = [users];
      }
      currentUsers = this.access.read || this.access;
      changed = false;
      for (_i = 0, _len = users.length; _i < _len; _i++) {
        user = users[_i];
        idx = currentUsers.indexOf(user);
        if (idx !== -1) {
          currentUsers.splice(idx, 1);
          changed = true;
        }
      }
      if (!changed) {
        return this.hoodie.resolveWith(this);
      }
      if (currentUsers.length === 0) {
        currentUsers = false;
      }
      if (this.access.read != null) {
        this.access.read = currentUsers;
      } else {
        this.access = currentUsers;
      }
    } else {
      this.access = false;
    }
    return this.hoodie.share.update(this.id, {
      access: this.access
    });
  };

  ShareInstance.prototype.grantWriteAccess = function(users) {
    this.grantReadAccess(users);
    if (this.access.read == null) {
      this.access = {
        read: this.access
      };
    }
    if (this.access.write === true) {
      return this.hoodie.resolveWith(this);
    }
    if (users) {
      if (typeof users === 'string') {
        users = [users];
      }
      this.access.write = users;
    } else {
      this.access.write = true;
    }
    return this.hoodie.share.update(this.id, {
      access: this.access
    });
  };

  ShareInstance.prototype.revokeWriteAccess = function(users) {
    var idx, user, _i, _len;

    if (this.access.write == null) {
      return this.hoodie.resolveWith(this);
    }
    if (users) {
      if (typeof this.access.write === 'boolean') {
        return this.hoodie.rejectWith(this);
      }
      if (typeof users === 'string') {
        users = [users];
      }
      for (_i = 0, _len = users.length; _i < _len; _i++) {
        user = users[_i];
        idx = this.access.write.indexOf(user);
        if (idx !== -1) {
          this.access.write.splice(idx, 1);
        }
      }
      if (this.access.write.length === 0) {
        this.access = this.access.read;
      }
    } else {
      this.access = this.access.read;
    }
    return this.hoodie.share.update(this.id, {
      access: this.access
    });
  };

  ShareInstance.prototype._objectBelongsToMe = function(object) {
    return object.$sharedAt === this.id;
  };

  ShareInstance.prototype._handleSecurityResponse = function(security) {
    var access, createdBy;

    access = this._parseSecurity(security);
    createdBy = '$subscription';
    return this.hoodie.share.findOrAdd(this.id, {
      access: access,
      createdBy: createdBy
    });
  };

  ShareInstance.prototype._parseSecurity = function(security) {
    var access, read, write, _ref, _ref1;

    read = (_ref = security.members) != null ? _ref.roles : void 0;
    write = (_ref1 = security.writers) != null ? _ref1.roles : void 0;
    access = {};
    if (read != null) {
      access.read = read === true || read.length === 0;
      if (read.length) {
        access.read = -1 !== read.indexOf(this.hoodie.account.ownerHash);
      }
    }
    if (write != null) {
      access.write = write === true || write.length === 0;
      if (write.length) {
        access.write = -1 !== write.indexOf(this.hoodie.account.ownerHash);
      }
    }
    return access;
  };

  return ShareInstance;

})(Hoodie.Remote);

})()
},{}],4:[function(require,module,exports){
module.exports = require('./lib/gravatar');

},{"./lib/gravatar":6}],6:[function(require,module,exports){
var crypto = require('crypto')
  , querystring = require('querystring');

var gravatar = module.exports = {
    url: function (email, options, https) {
      var baseURL = (https && "https://secure.gravatar.com/avatar/") || 'http://www.gravatar.com/avatar/';
      var queryData = querystring.stringify(options);
      var query = (queryData && "?" + queryData) || "";

      return baseURL + crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex') + query;
    }
};

},{"crypto":7,"querystring":8}],8:[function(require,module,exports){
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    };

var objectKeys = Object.keys || function objectKeys(object) {
    if (object !== Object(object)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in object) if (object.hasOwnProperty(key)) keys[keys.length] = key;
    return keys;
}


/*!
 * querystring
 * Copyright(c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Library version.
 */

exports.version = '0.3.1';

/**
 * Object#toString() ref for stringify().
 */

var toString = Object.prototype.toString;

/**
 * Cache non-integer test regexp.
 */

var notint = /[^0-9]/;

/**
 * Parse the given query `str`, returning an object.
 *
 * @param {String} str
 * @return {Object}
 * @api public
 */

exports.parse = function(str){
  if (null == str || '' == str) return {};

  function promote(parent, key) {
    if (parent[key].length == 0) return parent[key] = {};
    var t = {};
    for (var i in parent[key]) t[i] = parent[key][i];
    parent[key] = t;
    return t;
  }

  return String(str)
    .split('&')
    .reduce(function(ret, pair){
      try{ 
        pair = decodeURIComponent(pair.replace(/\+/g, ' '));
      } catch(e) {
        // ignore
      }

      var eql = pair.indexOf('=')
        , brace = lastBraceInKey(pair)
        , key = pair.substr(0, brace || eql)
        , val = pair.substr(brace || eql, pair.length)
        , val = val.substr(val.indexOf('=') + 1, val.length)
        , parent = ret;

      // ?foo
      if ('' == key) key = pair, val = '';

      // nested
      if (~key.indexOf(']')) {
        var parts = key.split('[')
          , len = parts.length
          , last = len - 1;

        function parse(parts, parent, key) {
          var part = parts.shift();

          // end
          if (!part) {
            if (isArray(parent[key])) {
              parent[key].push(val);
            } else if ('object' == typeof parent[key]) {
              parent[key] = val;
            } else if ('undefined' == typeof parent[key]) {
              parent[key] = val;
            } else {
              parent[key] = [parent[key], val];
            }
          // array
          } else {
            obj = parent[key] = parent[key] || [];
            if (']' == part) {
              if (isArray(obj)) {
                if ('' != val) obj.push(val);
              } else if ('object' == typeof obj) {
                obj[objectKeys(obj).length] = val;
              } else {
                obj = parent[key] = [parent[key], val];
              }
            // prop
            } else if (~part.indexOf(']')) {
              part = part.substr(0, part.length - 1);
              if(notint.test(part) && isArray(obj)) obj = promote(parent, key);
              parse(parts, obj, part);
            // key
            } else {
              if(notint.test(part) && isArray(obj)) obj = promote(parent, key);
              parse(parts, obj, part);
            }
          }
        }

        parse(parts, parent, 'base');
      // optimize
      } else {
        if (notint.test(key) && isArray(parent.base)) {
          var t = {};
          for(var k in parent.base) t[k] = parent.base[k];
          parent.base = t;
        }
        set(parent.base, key, val);
      }

      return ret;
    }, {base: {}}).base;
};

/**
 * Turn the given `obj` into a query string
 *
 * @param {Object} obj
 * @return {String}
 * @api public
 */

var stringify = exports.stringify = function(obj, prefix) {
  if (isArray(obj)) {
    return stringifyArray(obj, prefix);
  } else if ('[object Object]' == toString.call(obj)) {
    return stringifyObject(obj, prefix);
  } else if ('string' == typeof obj) {
    return stringifyString(obj, prefix);
  } else {
    return prefix;
  }
};

/**
 * Stringify the given `str`.
 *
 * @param {String} str
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyString(str, prefix) {
  if (!prefix) throw new TypeError('stringify expects an object');
  return prefix + '=' + encodeURIComponent(str);
}

/**
 * Stringify the given `arr`.
 *
 * @param {Array} arr
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyArray(arr, prefix) {
  var ret = [];
  if (!prefix) throw new TypeError('stringify expects an object');
  for (var i = 0; i < arr.length; i++) {
    ret.push(stringify(arr[i], prefix + '[]'));
  }
  return ret.join('&');
}

/**
 * Stringify the given `obj`.
 *
 * @param {Object} obj
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyObject(obj, prefix) {
  var ret = []
    , keys = objectKeys(obj)
    , key;
  for (var i = 0, len = keys.length; i < len; ++i) {
    key = keys[i];
    ret.push(stringify(obj[key], prefix
      ? prefix + '[' + encodeURIComponent(key) + ']'
      : encodeURIComponent(key)));
  }
  return ret.join('&');
}

/**
 * Set `obj`'s `key` to `val` respecting
 * the weird and wonderful syntax of a qs,
 * where "foo=bar&foo=baz" becomes an array.
 *
 * @param {Object} obj
 * @param {String} key
 * @param {String} val
 * @api private
 */

function set(obj, key, val) {
  var v = obj[key];
  if (undefined === v) {
    obj[key] = val;
  } else if (isArray(v)) {
    v.push(val);
  } else {
    obj[key] = [v, val];
  }
}

/**
 * Locate last brace in `str` within the key.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function lastBraceInKey(str) {
  var len = str.length
    , brace
    , c;
  for (var i = 0; i < len; ++i) {
    c = str[i];
    if (']' == c) brace = false;
    if ('[' == c) brace = true;
    if ('=' == c && !brace) return i;
  }
}

},{}],7:[function(require,module,exports){
var sha = require('./sha')
var rng = require('./rng')
var md5 = require('./md5')

var algorithms = {
  sha1: {
    hex: sha.hex_sha1,
    binary: sha.b64_sha1,
    ascii: sha.str_sha1
  },
  md5: {
    hex: md5.hex_md5,
    binary: md5.b64_md5,
    ascii: md5.any_md5
  }
}

function error () {
  var m = [].slice.call(arguments).join(' ')
  throw new Error([
    m,
    'we accept pull requests',
    'http://github.com/dominictarr/crypto-browserify'
    ].join('\n'))
}

exports.createHash = function (alg) {
  alg = alg || 'sha1'
  if(!algorithms[alg])
    error('algorithm:', alg, 'is not yet supported')
  var s = ''
  var _alg = algorithms[alg]
  return {
    update: function (data) {
      s += data
      return this
    },
    digest: function (enc) {
      enc = enc || 'binary'
      var fn
      if(!(fn = _alg[enc]))
        error('encoding:', enc , 'is not yet supported for algorithm', alg)
      var r = fn(s)
      s = null //not meant to use the hash after you've called digest.
      return r
    }
  }
}

exports.randomBytes = function(size, callback) {
  if (callback && callback.call) {
    try {
      callback.call(this, undefined, rng(size));
    } catch (err) { callback(err); }
  } else {
    return rng(size);
  }
}

// the least I can do is make error messages for the rest of the node.js/crypto api.
;['createCredentials'
, 'createHmac'
, 'createCypher'
, 'createCypheriv'
, 'createDecipher'
, 'createDecipheriv'
, 'createSign'
, 'createVerify'
, 'createDeffieHellman'
, 'pbkdf2'].forEach(function (name) {
  exports[name] = function () {
    error('sorry,', name, 'is not implemented yet')
  }
})

},{"./sha":9,"./rng":10,"./md5":11}],9:[function(require,module,exports){
/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS PUB 180-1
 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */

exports.hex_sha1 = hex_sha1;
exports.b64_sha1 = b64_sha1;
exports.str_sha1 = str_sha1;
exports.hex_hmac_sha1 = hex_hmac_sha1;
exports.b64_hmac_sha1 = b64_hmac_sha1;
exports.str_hmac_sha1 = str_hmac_sha1;

/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
var hexcase = 0;  /* hex output format. 0 - lowercase; 1 - uppercase        */
var b64pad  = ""; /* base-64 pad character. "=" for strict RFC compliance   */
var chrsz   = 8;  /* bits per input character. 8 - ASCII; 16 - Unicode      */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function hex_sha1(s){return binb2hex(core_sha1(str2binb(s),s.length * chrsz));}
function b64_sha1(s){return binb2b64(core_sha1(str2binb(s),s.length * chrsz));}
function str_sha1(s){return binb2str(core_sha1(str2binb(s),s.length * chrsz));}
function hex_hmac_sha1(key, data){ return binb2hex(core_hmac_sha1(key, data));}
function b64_hmac_sha1(key, data){ return binb2b64(core_hmac_sha1(key, data));}
function str_hmac_sha1(key, data){ return binb2str(core_hmac_sha1(key, data));}

/*
 * Perform a simple self-test to see if the VM is working
 */
function sha1_vm_test()
{
  return hex_sha1("abc") == "a9993e364706816aba3e25717850c26c9cd0d89d";
}

/*
 * Calculate the SHA-1 of an array of big-endian words, and a bit length
 */
function core_sha1(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << (24 - len % 32);
  x[((len + 64 >> 9) << 4) + 15] = len;

  var w = Array(80);
  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;
  var e = -1009589776;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;
    var olde = e;

    for(var j = 0; j < 80; j++)
    {
      if(j < 16) w[j] = x[i + j];
      else w[j] = rol(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
      var t = safe_add(safe_add(rol(a, 5), sha1_ft(j, b, c, d)),
                       safe_add(safe_add(e, w[j]), sha1_kt(j)));
      e = d;
      d = c;
      c = rol(b, 30);
      b = a;
      a = t;
    }

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
    e = safe_add(e, olde);
  }
  return Array(a, b, c, d, e);

}

/*
 * Perform the appropriate triplet combination function for the current
 * iteration
 */
function sha1_ft(t, b, c, d)
{
  if(t < 20) return (b & c) | ((~b) & d);
  if(t < 40) return b ^ c ^ d;
  if(t < 60) return (b & c) | (b & d) | (c & d);
  return b ^ c ^ d;
}

/*
 * Determine the appropriate additive constant for the current iteration
 */
function sha1_kt(t)
{
  return (t < 20) ?  1518500249 : (t < 40) ?  1859775393 :
         (t < 60) ? -1894007588 : -899497514;
}

/*
 * Calculate the HMAC-SHA1 of a key and some data
 */
function core_hmac_sha1(key, data)
{
  var bkey = str2binb(key);
  if(bkey.length > 16) bkey = core_sha1(bkey, key.length * chrsz);

  var ipad = Array(16), opad = Array(16);
  for(var i = 0; i < 16; i++)
  {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = core_sha1(ipad.concat(str2binb(data)), 512 + data.length * chrsz);
  return core_sha1(opad.concat(hash), 512 + 160);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

/*
 * Convert an 8-bit or 16-bit string to an array of big-endian words
 * In 8-bit function, characters >255 have their hi-byte silently ignored.
 */
function str2binb(str)
{
  var bin = Array();
  var mask = (1 << chrsz) - 1;
  for(var i = 0; i < str.length * chrsz; i += chrsz)
    bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (32 - chrsz - i%32);
  return bin;
}

/*
 * Convert an array of big-endian words to a string
 */
function binb2str(bin)
{
  var str = "";
  var mask = (1 << chrsz) - 1;
  for(var i = 0; i < bin.length * 32; i += chrsz)
    str += String.fromCharCode((bin[i>>5] >>> (32 - chrsz - i%32)) & mask);
  return str;
}

/*
 * Convert an array of big-endian words to a hex string.
 */
function binb2hex(binarray)
{
  var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var str = "";
  for(var i = 0; i < binarray.length * 4; i++)
  {
    str += hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8+4)) & 0xF) +
           hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8  )) & 0xF);
  }
  return str;
}

/*
 * Convert an array of big-endian words to a base-64 string
 */
function binb2b64(binarray)
{
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var str = "";
  for(var i = 0; i < binarray.length * 4; i += 3)
  {
    var triplet = (((binarray[i   >> 2] >> 8 * (3 -  i   %4)) & 0xFF) << 16)
                | (((binarray[i+1 >> 2] >> 8 * (3 - (i+1)%4)) & 0xFF) << 8 )
                |  ((binarray[i+2 >> 2] >> 8 * (3 - (i+2)%4)) & 0xFF);
    for(var j = 0; j < 4; j++)
    {
      if(i * 8 + j * 6 > binarray.length * 32) str += b64pad;
      else str += tab.charAt((triplet >> 6*(3-j)) & 0x3F);
    }
  }
  return str;
}


},{}],10:[function(require,module,exports){
// Original code adapted from Robert Kieffer.
// details at https://github.com/broofa/node-uuid
(function() {
  var _global = this;

  var mathRNG, whatwgRNG;

  // NOTE: Math.random() does not guarantee "cryptographic quality"
  mathRNG = function(size) {
    var bytes = new Array(size);
    var r;

    for (var i = 0, r; i < size; i++) {
      if ((i & 0x03) == 0) r = Math.random() * 0x100000000;
      bytes[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return bytes;
  }

  // currently only available in webkit-based browsers.
  if (_global.crypto && crypto.getRandomValues) {
    var _rnds = new Uint32Array(4);
    whatwgRNG = function(size) {
      var bytes = new Array(size);
      crypto.getRandomValues(_rnds);

      for (var c = 0 ; c < size; c++) {
        bytes[c] = _rnds[c >> 2] >>> ((c & 0x03) * 8) & 0xff;
      }
      return bytes;
    }
  }

  module.exports = whatwgRNG || mathRNG;

}())
},{}],11:[function(require,module,exports){
/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
var hexcase = 0;   /* hex output format. 0 - lowercase; 1 - uppercase        */
var b64pad  = "";  /* base-64 pad character. "=" for strict RFC compliance   */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function hex_md5(s)    { return rstr2hex(rstr_md5(str2rstr_utf8(s))); }
function b64_md5(s)    { return rstr2b64(rstr_md5(str2rstr_utf8(s))); }
function any_md5(s, e) { return rstr2any(rstr_md5(str2rstr_utf8(s)), e); }
function hex_hmac_md5(k, d)
  { return rstr2hex(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d))); }
function b64_hmac_md5(k, d)
  { return rstr2b64(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d))); }
function any_hmac_md5(k, d, e)
  { return rstr2any(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d)), e); }

/*
 * Perform a simple self-test to see if the VM is working
 */
function md5_vm_test()
{
  return hex_md5("abc").toLowerCase() == "900150983cd24fb0d6963f7d28e17f72";
}

/*
 * Calculate the MD5 of a raw string
 */
function rstr_md5(s)
{
  return binl2rstr(binl_md5(rstr2binl(s), s.length * 8));
}

/*
 * Calculate the HMAC-MD5, of a key and some data (raw strings)
 */
function rstr_hmac_md5(key, data)
{
  var bkey = rstr2binl(key);
  if(bkey.length > 16) bkey = binl_md5(bkey, key.length * 8);

  var ipad = Array(16), opad = Array(16);
  for(var i = 0; i < 16; i++)
  {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = binl_md5(ipad.concat(rstr2binl(data)), 512 + data.length * 8);
  return binl2rstr(binl_md5(opad.concat(hash), 512 + 128));
}

/*
 * Convert a raw string to a hex string
 */
function rstr2hex(input)
{
  try { hexcase } catch(e) { hexcase=0; }
  var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var output = "";
  var x;
  for(var i = 0; i < input.length; i++)
  {
    x = input.charCodeAt(i);
    output += hex_tab.charAt((x >>> 4) & 0x0F)
           +  hex_tab.charAt( x        & 0x0F);
  }
  return output;
}

/*
 * Convert a raw string to a base-64 string
 */
function rstr2b64(input)
{
  try { b64pad } catch(e) { b64pad=''; }
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var output = "";
  var len = input.length;
  for(var i = 0; i < len; i += 3)
  {
    var triplet = (input.charCodeAt(i) << 16)
                | (i + 1 < len ? input.charCodeAt(i+1) << 8 : 0)
                | (i + 2 < len ? input.charCodeAt(i+2)      : 0);
    for(var j = 0; j < 4; j++)
    {
      if(i * 8 + j * 6 > input.length * 8) output += b64pad;
      else output += tab.charAt((triplet >>> 6*(3-j)) & 0x3F);
    }
  }
  return output;
}

/*
 * Convert a raw string to an arbitrary string encoding
 */
function rstr2any(input, encoding)
{
  var divisor = encoding.length;
  var i, j, q, x, quotient;

  /* Convert to an array of 16-bit big-endian values, forming the dividend */
  var dividend = Array(Math.ceil(input.length / 2));
  for(i = 0; i < dividend.length; i++)
  {
    dividend[i] = (input.charCodeAt(i * 2) << 8) | input.charCodeAt(i * 2 + 1);
  }

  /*
   * Repeatedly perform a long division. The binary array forms the dividend,
   * the length of the encoding is the divisor. Once computed, the quotient
   * forms the dividend for the next step. All remainders are stored for later
   * use.
   */
  var full_length = Math.ceil(input.length * 8 /
                                    (Math.log(encoding.length) / Math.log(2)));
  var remainders = Array(full_length);
  for(j = 0; j < full_length; j++)
  {
    quotient = Array();
    x = 0;
    for(i = 0; i < dividend.length; i++)
    {
      x = (x << 16) + dividend[i];
      q = Math.floor(x / divisor);
      x -= q * divisor;
      if(quotient.length > 0 || q > 0)
        quotient[quotient.length] = q;
    }
    remainders[j] = x;
    dividend = quotient;
  }

  /* Convert the remainders to the output string */
  var output = "";
  for(i = remainders.length - 1; i >= 0; i--)
    output += encoding.charAt(remainders[i]);

  return output;
}

/*
 * Encode a string as utf-8.
 * For efficiency, this assumes the input is valid utf-16.
 */
function str2rstr_utf8(input)
{
  var output = "";
  var i = -1;
  var x, y;

  while(++i < input.length)
  {
    /* Decode utf-16 surrogate pairs */
    x = input.charCodeAt(i);
    y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
    if(0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF)
    {
      x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
      i++;
    }

    /* Encode output as utf-8 */
    if(x <= 0x7F)
      output += String.fromCharCode(x);
    else if(x <= 0x7FF)
      output += String.fromCharCode(0xC0 | ((x >>> 6 ) & 0x1F),
                                    0x80 | ( x         & 0x3F));
    else if(x <= 0xFFFF)
      output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F),
                                    0x80 | ((x >>> 6 ) & 0x3F),
                                    0x80 | ( x         & 0x3F));
    else if(x <= 0x1FFFFF)
      output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07),
                                    0x80 | ((x >>> 12) & 0x3F),
                                    0x80 | ((x >>> 6 ) & 0x3F),
                                    0x80 | ( x         & 0x3F));
  }
  return output;
}

/*
 * Encode a string as utf-16
 */
function str2rstr_utf16le(input)
{
  var output = "";
  for(var i = 0; i < input.length; i++)
    output += String.fromCharCode( input.charCodeAt(i)        & 0xFF,
                                  (input.charCodeAt(i) >>> 8) & 0xFF);
  return output;
}

function str2rstr_utf16be(input)
{
  var output = "";
  for(var i = 0; i < input.length; i++)
    output += String.fromCharCode((input.charCodeAt(i) >>> 8) & 0xFF,
                                   input.charCodeAt(i)        & 0xFF);
  return output;
}

/*
 * Convert a raw string to an array of little-endian words
 * Characters >255 have their high-byte silently ignored.
 */
function rstr2binl(input)
{
  var output = Array(input.length >> 2);
  for(var i = 0; i < output.length; i++)
    output[i] = 0;
  for(var i = 0; i < input.length * 8; i += 8)
    output[i>>5] |= (input.charCodeAt(i / 8) & 0xFF) << (i%32);
  return output;
}

/*
 * Convert an array of little-endian words to a string
 */
function binl2rstr(input)
{
  var output = "";
  for(var i = 0; i < input.length * 32; i += 8)
    output += String.fromCharCode((input[i>>5] >>> (i % 32)) & 0xFF);
  return output;
}

/*
 * Calculate the MD5 of an array of little-endian words, and a bit length.
 */
function binl_md5(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << ((len) % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;

    a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
    d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
    c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
    b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
    a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
    d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
    c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
    b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
    a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
    d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
    c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
    b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
    a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
    d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
    c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
    b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

    a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
    d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
    c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
    b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
    a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
    d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
    c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
    b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
    a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
    d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
    c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
    b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
    a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
    d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
    c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
    b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

    a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
    d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
    c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
    b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
    a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
    d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
    c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
    b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
    a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
    d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
    c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
    b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
    a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
    d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
    c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
    b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

    a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
    d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
    c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
    b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
    a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
    d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
    c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
    b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
    a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
    d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
    c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
    b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
    a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
    d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
    c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
    b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
  }
  return Array(a, b, c, d);
}

/*
 * These functions implement the four basic operations the algorithm uses.
 */
function md5_cmn(q, a, b, x, s, t)
{
  return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
}
function md5_ff(a, b, c, d, x, s, t)
{
  return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
}
function md5_gg(a, b, c, d, x, s, t)
{
  return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
}
function md5_hh(a, b, c, d, x, s, t)
{
  return md5_cmn(b ^ c ^ d, a, b, x, s, t);
}
function md5_ii(a, b, c, d, x, s, t)
{
  return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function bit_rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}


exports.hex_md5 = hex_md5;
exports.b64_md5 = b64_md5;
exports.any_md5 = any_md5;

},{}]},{},[1])
;