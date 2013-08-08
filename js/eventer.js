module.exports = function(cb) {
  var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent"
  var eventer = window[eventMethod]
  var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message"

  eventer(messageEvent, function (e) {
    if (e.data && e.data === 'process-tick') return
    if (!e.data) return
    try { var data = JSON.parse(e.data) }
    catch (e) { var data = {} }
    cb(data)
  }, false)
}
