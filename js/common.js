var gravatar = require('gravatar')
var concat = require('concat-stream')
var hat = require('hat')
var moment = require('moment')
var fort = require('fort')

module.exports = function(db) {
  var username = 'anonymous'
  
  var formContainer = $('#default-popup')
  
  $(document)
    .on('click', '.upload-world', openDialog)
    .on('click', '.new-world', openDialog)
    .on('click', '.open-menu', openDialog)
    .on('click', '.menu-buttons .worlds', openWorldsList)
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
  
  function loadWorldsList(username, cb) {
    if (!cb) cb = function noop (){}
    var loggedIn = username !== 'anonymous'
    formContainer.html($('.welcome').html())
    if (loggedIn) {
      getGravatar(function(err, url) {
        if (err || !url) return
        formContainer.find('.gravatar').append('<img src="' + url + '">')
      })
    }
    getWorlds(function(err, worlds) {
      if (err) return console.error(err)
      worlds = fort.descend(worlds, function(w) { return w.lastUpdate })
      var content = $('.demo-browser-content')
      var title = "Your Worlds"
      if (loggedIn) title = username + "'s Worlds"
      content.html("<h3>" + title + "</h3>")
      var itemHTML = $('.world-item').html()
      if (worlds.length === 0) content.html("You haven't created any worlds yet!")
      worlds.map(function(world) {
        content.append(itemHTML)
        content.find('a:last')
          .attr('href', '/world.html#' + world.id)
        content.find('dt:last').html(world.name)
        content.find('dd:last').text(world.lastUpdate ? 'Updated ' + moment(world.lastUpdate).fromNow() : "Not played yet")
      })
      cb()
    })
  }

  function isLoggedOut() {
    console.log('isLoggedOut')
  }

  function formField(form, field) {
    return form.find('input[name="' + field + '"]')
  }

  function fieldParent(form, field) {
    var parent = formField(form, field).parents()[0]
    return $(parent)
  }
  
  function getWorlds(cb) {
    var worldStream = db.sublevel('worlds').createValueStream({ valueEncoding: 'json' })
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
    db.sublevel('worlds').put(uuid, world, {valueEncoding: 'json'}, function(err) {
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
