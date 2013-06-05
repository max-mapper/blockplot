;(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
var mca2js = require('mca2js')
var voxelLevel = require('voxel-level')
var regionX, regionZ, worldName
window = self
console = {log: function(msg) { self.postMessage({log: msg}) }}
function convert(buffer, X, Z) {
  var level = voxelLevel('blocks', function ready() {
    var converter = mca2js()
    var pending = 0
    var progress = 0
    var done = false
    var errors = {}
    converter.on('data', function(chunk) {
      pending++
      var percent = ~~((chunk._count / 1024) * 100)
      if (percent > progress) {
        self.postMessage({ progress: percent })
        progress = percent
      }
      level.store(worldName, chunk, function afterStore(err) {
        if (err) errors[key] = err
        pending--
        if (done && pending === 0) {
          self.postMessage({ done: true, errors: Object.keys(errors).length > 0 ? errors : false })
          self.close()
        }
      })
    })
    converter.on('end', function(){
      done = true
    })
    converter.convert(buffer, X, Z)
  })
}

self.onmessage = function(event) {
  var data = event.data
  var keys = Object.keys(data)
  if (keys.indexOf('regionX') > -1) regionX = data.regionX
  if (keys.indexOf('regionZ') > -1) regionZ = data.regionZ
  if (keys.indexOf('worldName') > -1) worldName = data.worldName
  if (data instanceof ArrayBuffer) {
    convert(data, regionX, regionZ)
  }
}
},{"voxel-level":2,"mca2js":3}],4:[function(require,module,exports){
var events = require('events');
var util = require('util');

function Stream() {
  events.EventEmitter.call(this);
}
util.inherits(Stream, events.EventEmitter);
module.exports = Stream;
// Backwards-compat with node 0.4.x
Stream.Stream = Stream;

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once, and
  // only when all sources have ended.
  if (!dest._isStdio && (!options || options.end !== false)) {
    dest._pipeCount = dest._pipeCount || 0;
    dest._pipeCount++;

    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest._pipeCount--;

    // remove the listeners
    cleanup();

    if (dest._pipeCount > 0) {
      // waiting for other incoming streams to end.
      return;
    }

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest._pipeCount--;

    // remove the listeners
    cleanup();

    if (dest._pipeCount > 0) {
      // waiting for other incoming streams to end.
      return;
    }

    dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (this.listeners('error').length === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('end', cleanup);
    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('end', cleanup);
  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":5,"util":6}],6:[function(require,module,exports){
var events = require('events');

exports.isArray = isArray;
exports.isDate = function(obj){return Object.prototype.toString.call(obj) === '[object Date]'};
exports.isRegExp = function(obj){return Object.prototype.toString.call(obj) === '[object RegExp]'};


exports.print = function () {};
exports.puts = function () {};
exports.debug = function() {};

exports.inspect = function(obj, showHidden, depth, colors) {
  var seen = [];

  var stylize = function(str, styleType) {
    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    var styles =
        { 'bold' : [1, 22],
          'italic' : [3, 23],
          'underline' : [4, 24],
          'inverse' : [7, 27],
          'white' : [37, 39],
          'grey' : [90, 39],
          'black' : [30, 39],
          'blue' : [34, 39],
          'cyan' : [36, 39],
          'green' : [32, 39],
          'magenta' : [35, 39],
          'red' : [31, 39],
          'yellow' : [33, 39] };

    var style =
        { 'special': 'cyan',
          'number': 'blue',
          'boolean': 'yellow',
          'undefined': 'grey',
          'null': 'bold',
          'string': 'green',
          'date': 'magenta',
          // "name": intentionally not styling
          'regexp': 'red' }[styleType];

    if (style) {
      return '\033[' + styles[style][0] + 'm' + str +
             '\033[' + styles[style][1] + 'm';
    } else {
      return str;
    }
  };
  if (! colors) {
    stylize = function(str, styleType) { return str; };
  }

  function format(value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (value && typeof value.inspect === 'function' &&
        // Filter out the util module, it's inspect function is special
        value !== exports &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      return value.inspect(recurseTimes);
    }

    // Primitive types cannot have properties
    switch (typeof value) {
      case 'undefined':
        return stylize('undefined', 'undefined');

      case 'string':
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                 .replace(/'/g, "\\'")
                                                 .replace(/\\"/g, '"') + '\'';
        return stylize(simple, 'string');

      case 'number':
        return stylize('' + value, 'number');

      case 'boolean':
        return stylize('' + value, 'boolean');
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
      return stylize('null', 'null');
    }

    // Look up the keys of the object.
    var visible_keys = Object_keys(value);
    var keys = showHidden ? Object_getOwnPropertyNames(value) : visible_keys;

    // Functions without properties can be shortcutted.
    if (typeof value === 'function' && keys.length === 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        var name = value.name ? ': ' + value.name : '';
        return stylize('[Function' + name + ']', 'special');
      }
    }

    // Dates without properties can be shortcutted
    if (isDate(value) && keys.length === 0) {
      return stylize(value.toUTCString(), 'date');
    }

    var base, type, braces;
    // Determine the object type
    if (isArray(value)) {
      type = 'Array';
      braces = ['[', ']'];
    } else {
      type = 'Object';
      braces = ['{', '}'];
    }

    // Make functions say that they are functions
    if (typeof value === 'function') {
      var n = value.name ? ': ' + value.name : '';
      base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
    } else {
      base = '';
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + value.toUTCString();
    }

    if (keys.length === 0) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        return stylize('[Object]', 'special');
      }
    }

    seen.push(value);

    var output = keys.map(function(key) {
      var name, str;
      if (value.__lookupGetter__) {
        if (value.__lookupGetter__(key)) {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Getter/Setter]', 'special');
          } else {
            str = stylize('[Getter]', 'special');
          }
        } else {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Setter]', 'special');
          }
        }
      }
      if (visible_keys.indexOf(key) < 0) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (seen.indexOf(value[key]) < 0) {
          if (recurseTimes === null) {
            str = format(value[key]);
          } else {
            str = format(value[key], recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (isArray(value)) {
              str = str.split('\n').map(function(line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function(line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = stylize('[Circular]', 'special');
        }
      }
      if (typeof name === 'undefined') {
        if (type === 'Array' && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    });

    seen.pop();

    var numLinesEst = 0;
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf('\n') >= 0) numLinesEst++;
      return prev + cur.length + 1;
    }, 0);

    if (length > 50) {
      output = braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];

    } else {
      output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }

    return output;
  }
  return format(obj, (typeof depth === 'undefined' ? 2 : depth));
};


function isArray(ar) {
  return ar instanceof Array ||
         Array.isArray(ar) ||
         (ar && ar !== Object.prototype && isArray(ar.__proto__));
}


function isRegExp(re) {
  return re instanceof RegExp ||
    (typeof re === 'object' && Object.prototype.toString.call(re) === '[object RegExp]');
}


function isDate(d) {
  if (d instanceof Date) return true;
  if (typeof d !== 'object') return false;
  var properties = Date.prototype && Object_getOwnPropertyNames(Date.prototype);
  var proto = d.__proto__ && Object_getOwnPropertyNames(d.__proto__);
  return JSON.stringify(proto) === JSON.stringify(properties);
}

function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}

exports.log = function (msg) {};

exports.pump = null;

var Object_keys = Object.keys || function (obj) {
    var res = [];
    for (var key in obj) res.push(key);
    return res;
};

var Object_getOwnPropertyNames = Object.getOwnPropertyNames || function (obj) {
    var res = [];
    for (var key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) res.push(key);
    }
    return res;
};

var Object_create = Object.create || function (prototype, properties) {
    // from es5-shim
    var object;
    if (prototype === null) {
        object = { '__proto__' : null };
    }
    else {
        if (typeof prototype !== 'object') {
            throw new TypeError(
                'typeof prototype[' + (typeof prototype) + '] != \'object\''
            );
        }
        var Type = function () {};
        Type.prototype = prototype;
        object = new Type();
        object.__proto__ = prototype;
    }
    if (typeof properties !== 'undefined' && Object.defineProperties) {
        Object.defineProperties(object, properties);
    }
    return object;
};

exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object_create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (typeof f !== 'string') {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(exports.inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j': return JSON.stringify(args[i++]);
      default:
        return x;
    }
  });
  for(var x = args[i]; i < len; x = args[++i]){
    if (x === null || typeof x !== 'object') {
      str += ' ' + x;
    } else {
      str += ' ' + exports.inspect(x);
    }
  }
  return str;
};

},{"events":5}],2:[function(require,module,exports){
var leveljs = require('level-js')
var crunch = require('voxel-crunch')

module.exports = VoxelLevel

function VoxelLevel(game, readyCB) {
  if (!(this instanceof VoxelLevel)) return new VoxelLevel(game, readyCB)
  this.game = game
  this.db = leveljs('blocks')
  this.db.open(readyCB)
}

VoxelLevel.prototype.load = function(prefix, chunkPosition, dimensions, cb) {
  var chunkLength = dimensions[0] * dimensions[1] * dimensions[2]
  var chunkIndex = prefix + '|' + chunkPosition.join('|') + '|' + chunkLength
  this.db.get(chunkIndex, function(err, rle) {
    if (err) return cb(err)
    var voxels = new Uint8Array(chunkLength)
    crunch.decode(rle, voxels)
    cb(false, {position: chunkPosition, voxels: voxels, dimensions: dimensions})
  })
}

VoxelLevel.prototype.store = function(prefix, chunk, cb) {
  var rle = crunch.encode(chunk.voxels)
  var key = prefix + '|'
  key += chunk.position.join('|')
  key += '|' + chunk.voxels.length
  this.db.put(key, rle, cb)
}

},{"level-js":7,"voxel-crunch":8}],9:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],5:[function(require,module,exports){
(function(process){if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    }
;
function indexOf (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0; i < xs.length; i++) {
        if (x === xs[i]) return i;
    }
    return -1;
}

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = indexOf(list, listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  if (arguments.length === 0) {
    this._events = {};
    return this;
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

})(require("__browserify_process"))
},{"__browserify_process":9}],3:[function(require,module,exports){
var mcRegion = require('minecraft-region')
var mca = require('minecraft-mca')
var stream = require('stream')
var util = require('util')

var width = 16
var height = 256
var size = 16
var length = size * size * size
var bufferType = Uint32Array

module.exports = MCA2JSON

function MCA2JSON(opts) {
  if (!(this instanceof MCA2JSON)) return new MCA2JSON(opts)
  if (!opts) opts = {}
  this.opts = opts
  this.chunks = {}
  var self = this
  stream.Stream.call(self)
  self.readable = true
}

util.inherits(MCA2JSON, stream.Stream)

MCA2JSON.prototype.chunksInChunk = function(chunkX, chunkZ) {
  var chunks = []
  for (var i = 0; i < 256/size; i++) {
    chunks.push([chunkX * size, i * size, chunkZ * size])
  }
  return chunks
}

MCA2JSON.prototype.convert = function(buf, regionX, regionZ) {
  var self = this
  var region = mcRegion(buf, regionX, regionZ)
  var lastChunk
  var count = 0
  function onChunk() { count++ }
  function onVoxel(x, y, z, block, chunkX, chunkZ) {
    var currentChunk = chunkX + ',' + chunkZ
    if (!lastChunk) lastChunk = currentChunk
    if (currentChunk !== lastChunk) {
      var lc = lastChunk.split(',').map(function(n) { return +n })
      self.chunksInChunk(lc[0], lc[1]).map(function(c) {
        var cidx = c.join('|')
        var finishedChunk = self.chunks[cidx]
        if (!finishedChunk) return
        finishedChunk._count = count
        self.emit('data', finishedChunk)
      })
      lastChunk = currentChunk
    }
    var chunkY = Math.floor(y / size)
    y = y % size
    var chunkPos = [chunkX * size, chunkY * size, chunkZ * size]
    var chunkIDX = chunkPos.join('|')
    x = Math.abs((size + x % size) % size)
    y = Math.abs((size + y % size) % size)
    z = Math.abs((size + z % size) % size)
    var idx = x + (y * size) + (z * size * size)
    if (!self.chunks[chunkIDX]) {
      var chunk = {
        dimensions: [size, size, size],
        position: chunkPos,
        voxels: new bufferType(length)
      }
      self.chunks[chunkIDX] = chunk
    }
    self.chunks[chunkIDX].voxels[idx] = block.id
  }
  var opts = {ymin: 0, onVoxel: onVoxel, onChunk: onChunk }
  var mcaReader = mca(region, opts)
  var distance = this.opts.distance || 1
  if (this.opts.start) {
    mcaReader.loadNearby(this.opts.start, distance)
  } else if (this.opts.distance) {
    mcaReader.loadNearby(mcaReader.positionBounds()[0], distance)
  } else {
    mcaReader.loadAll()
  }
  self.emit('end')
}

},{"stream":4,"util":6,"minecraft-mca":10,"minecraft-region":11}],8:[function(require,module,exports){
var bits = require("bit-twiddle")

function size(chunk) {
  var count = 0
  var chunk_len = chunk.length
  var i = 0, v, l
  while(i<chunk.length) {
    v = chunk[i]
    l = 0
    while(i < chunk_len && chunk[i] === v) {
      ++i
      ++l
    }
    count += (bits.log2(l) / 7)|0
    count += (bits.log2(v>>>0) / 7)|0
    count += 2
  }
  return count
}
exports.size = size

function encode(chunk, runs) {
  if(!runs) {
    runs = new Uint8Array(size(chunk))
  }
  var rptr = 0, nruns = runs.length
  var i = 0, v, l
  while(i<chunk.length) {
    v = chunk[i]
    l = 0
    while(i < chunk.length && chunk[i] === v) {
      ++i
      ++l
    }
    while(rptr < nruns && l >= 128) {
      runs[rptr++] = 128 + (l&0x7f)
      l >>>= 7
    }
    if(rptr >= nruns) {
      throw new Error("RLE buffer overflow")
    }
    runs[rptr++] = l
    v >>>= 0
    while(rptr < nruns && v >= 128) {
      runs[rptr++] = 128 + (v&0x7f)
      v >>>= 7
    }
    if(rptr >= nruns) {
      throw new Error("RLE buffer overflow")
    }
    runs[rptr++] = v
  }
  return runs
}
exports.encode = encode

function decode(runs, chunk) {
  var buf_len = chunk.length
  var nruns = runs.length
  var cptr = 0
  var ptr = 0
  var l, s, v, i
  while(ptr < nruns) {
    l = 0
    s = 0
    while(ptr < nruns && runs[ptr] >= 128) {
      l += (runs[ptr++]&0x7f) << s
      s += 7
    }
    l += runs[ptr++] << s
    if(ptr >= nruns) {
      throw new Error("RLE buffer underrun")
    }
    if(cptr + l > buf_len) {
      throw new Error("Chunk buffer overflow")
    }
    v = 0
    s = 0
    while(ptr < nruns && runs[ptr] >= 128) {
      v += (runs[ptr++]&0x7f) << s
      s += 7
    }
    if(ptr >= nruns) {
      throw new Error("RLE buffer underrun")
    }
    v += runs[ptr++] << s
    for(i=0; i<l; ++i) {
      chunk[cptr++] = v
    }
  }
  return chunk
}
exports.decode = decode

},{"bit-twiddle":12}],7:[function(require,module,exports){
module.exports = Level

var IDB = require('idb-wrapper')
var AbstractLevelDOWN = require('abstract-leveldown').AbstractLevelDOWN
var util = require('util')
var Iterator = require('./iterator')
var isBuffer = require('isbuffer')

function Level(location) {
  if (!(this instanceof Level)) return new Level(location)
  if (!location) throw new Error("constructor requires at least a location argument")
  
  this.location = location
}

util.inherits(Level, AbstractLevelDOWN)

Level.prototype._open = function(options, callback) {
  var self = this
  
  this.idb = new IDB({
    storeName: this.location,
    autoIncrement: false,
    keyPath: null,
    onStoreReady: function () {
      callback && callback(null, self.idb)
    }, 
    onError: function(err) {
      callback && callback(err)
    }
  })
}

Level.prototype._get = function (key, options, callback) {
  this.idb.get(key, function (value) {
    if (value === undefined) {
      // 'NotFound' error, consistent with LevelDOWN API
      return callback(new Error('NotFound'))
    }
    if (options.asBuffer !== false && !isBuffer(value))
      value = StringToArrayBuffer(String(value))
    return callback(null, value, key)
  }, callback)
}

Level.prototype._del = function(id, options, callback) {
  this.idb.remove(id, callback, callback)
}

Level.prototype._put = function (key, value, options, callback) {
  this.idb.put(key, value, function() { callback() }, callback)
}

Level.prototype.iterator = function (options) {
  if (typeof options !== 'object') options = {}
  return new Iterator(this.idb, options)
}

Level.prototype._batch = function (array, options, callback) {
  return this.idb.batch(array, function(){ callback() }, callback)
}

Level.prototype._close = function (callback) {
  this.idb.db.close()
  callback()
}

Level.prototype._approximateSize = function() {
  throw new Error('Not implemented')
}

Level.prototype._isBuffer = isBuffer

var checkKeyValue = Level.prototype._checkKeyValue = function (obj, type) {
  if (obj === null || obj === undefined)
    return new Error(type + ' cannot be `null` or `undefined`')
  if (obj === null || obj === undefined)
    return new Error(type + ' cannot be `null` or `undefined`')
  if (isBuffer(obj) && obj.byteLength === 0)
    return new Error(type + ' cannot be an empty ArrayBuffer')
  if (String(obj) === '')
    return new Error(type + ' cannot be an empty String')
  if (obj.length === 0)
    return new Error(type + ' cannot be an empty Array')
}

function ArrayBufferToString(buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf))
}

function StringToArrayBuffer(str) {
  var buf = new ArrayBuffer(str.length * 2) // 2 bytes for each char
  var bufView = new Uint16Array(buf)
  for (var i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i)
  }
  return buf
}

},{"util":6,"./iterator":13,"abstract-leveldown":14,"isbuffer":15,"idb-wrapper":16}],15:[function(require,module,exports){
(function(){var Buffer = require('buffer').Buffer;

module.exports = isBuffer;

function isBuffer (o) {
  return Buffer.isBuffer(o)
    || /\[object (.+Array|Array.+)\]/.test(Object.prototype.toString.call(o));
}

})()
},{"buffer":17}],12:[function(require,module,exports){
/**
 * Bit twiddling hacks for JavaScript.
 *
 * Author: Mikola Lysenko
 *
 * Ported from Stanford bit twiddling hack library:
 *    http://graphics.stanford.edu/~seander/bithacks.html
 */

"use strict"; "use restrict";

//Number of bits in an integer
var INT_BITS = 32;

//Constants
exports.INT_BITS  = INT_BITS;
exports.INT_MAX   =  0x7fffffff;
exports.INT_MIN   = -1<<(INT_BITS-1);

//Returns -1, 0, +1 depending on sign of x
exports.sign = function(v) {
  return (v > 0) - (v < 0);
}

//Computes absolute value of integer
exports.abs = function(v) {
  var mask = v >> (INT_BITS-1);
  return (v ^ mask) - mask;
}

//Computes minimum of integers x and y
exports.min = function(x, y) {
  return y ^ ((x ^ y) & -(x < y));
}

//Computes maximum of integers x and y
exports.max = function(x, y) {
  return x ^ ((x ^ y) & -(x < y));
}

//Checks if a number is a power of two
exports.isPow2 = function(v) {
  return !(v & (v-1)) && (!!v);
}

//Computes log base 2 of v
exports.log2 = function(v) {
  var r, shift;
  r =     (v > 0xFFFF) << 4; v >>>= r;
  shift = (v > 0xFF  ) << 3; v >>>= shift; r |= shift;
  shift = (v > 0xF   ) << 2; v >>>= shift; r |= shift;
  shift = (v > 0x3   ) << 1; v >>>= shift; r |= shift;
  return r | (v >> 1);
}

//Computes log base 10 of v
exports.log10 = function(v) {
  return  (v >= 1000000000) ? 9 : (v >= 100000000) ? 8 : (v >= 10000000) ? 7 :
          (v >= 1000000) ? 6 : (v >= 100000) ? 5 : (v >= 10000) ? 4 :
          (v >= 1000) ? 3 : (v >= 100) ? 2 : (v >= 10) ? 1 : 0;
}

//Counts number of bits
exports.popCount = function(v) {
  v = v - ((v >>> 1) & 0x55555555);
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return ((v + (v >>> 4) & 0xF0F0F0F) * 0x1010101) >>> 24;
}

//Counts number of trailing zeros
function countTrailingZeros(v) {
  var c = 32;
  v &= -v;
  if (v) c--;
  if (v & 0x0000FFFF) c -= 16;
  if (v & 0x00FF00FF) c -= 8;
  if (v & 0x0F0F0F0F) c -= 4;
  if (v & 0x33333333) c -= 2;
  if (v & 0x55555555) c -= 1;
  return c;
}
exports.countTrailingZeros = countTrailingZeros;

//Rounds to next power of 2
exports.nextPow2 = function(v) {
  v += v === 0;
  --v;
  v |= v >>> 1;
  v |= v >>> 2;
  v |= v >>> 4;
  v |= v >>> 8;
  v |= v >>> 16;
  return v + 1;
}

//Rounds down to previous power of 2
exports.prevPow2 = function(v) {
  v |= v >>> 1;
  v |= v >>> 2;
  v |= v >>> 4;
  v |= v >>> 8;
  v |= v >>> 16;
  return v - (v>>>1);
}

//Computes parity of word
exports.parity = function(v) {
  v ^= v >>> 16;
  v ^= v >>> 8;
  v ^= v >>> 4;
  v &= 0xf;
  return (0x6996 >>> v) & 1;
}

var REVERSE_TABLE = new Array(256);

(function(tab) {
  for(var i=0; i<256; ++i) {
    var v = i, r = i, s = 7;
    for (v >>>= 1; v; v >>>= 1) {
      r <<= 1;
      r |= v & 1;
      --s;
    }
    tab[i] = (r << s) & 0xff;
  }
})(REVERSE_TABLE);

//Reverse bits in a 32 bit word
exports.reverse = function(v) {
  return  (REVERSE_TABLE[ v         & 0xff] << 24) |
          (REVERSE_TABLE[(v >>> 8)  & 0xff] << 16) |
          (REVERSE_TABLE[(v >>> 16) & 0xff] << 8)  |
           REVERSE_TABLE[(v >>> 24) & 0xff];
}

//Interleave bits of 2 coordinates with 16 bits.  Useful for fast quadtree codes
exports.interleave2 = function(x, y) {
  x &= 0xFFFF;
  x = (x | (x << 8)) & 0x00FF00FF;
  x = (x | (x << 4)) & 0x0F0F0F0F;
  x = (x | (x << 2)) & 0x33333333;
  x = (x | (x << 1)) & 0x55555555;

  y &= 0xFFFF;
  y = (y | (y << 8)) & 0x00FF00FF;
  y = (y | (y << 4)) & 0x0F0F0F0F;
  y = (y | (y << 2)) & 0x33333333;
  y = (y | (y << 1)) & 0x55555555;

  return x | (y << 1);
}

//Extracts the nth interleaved component
exports.deinterleave2 = function(v, n) {
  v = (v >>> n) & 0x55555555;
  v = (v | (v >>> 1))  & 0x33333333;
  v = (v | (v >>> 2))  & 0x0F0F0F0F;
  v = (v | (v >>> 4))  & 0x00FF00FF;
  v = (v | (v >>> 16)) & 0x000FFFF;
  return (v << 16) >> 16;
}


//Interleave bits of 3 coordinates, each with 10 bits.  Useful for fast octree codes
exports.interleave3 = function(x, y, z) {
  x &= 0x3FF;
  x  = (x | (x<<16)) & 4278190335;
  x  = (x | (x<<8))  & 251719695;
  x  = (x | (x<<4))  & 3272356035;
  x  = (x | (x<<2))  & 1227133513;

  y &= 0x3FF;
  y  = (y | (y<<16)) & 4278190335;
  y  = (y | (y<<8))  & 251719695;
  y  = (y | (y<<4))  & 3272356035;
  y  = (y | (y<<2))  & 1227133513;
  x |= (y << 1);
  
  z &= 0x3FF;
  z  = (z | (z<<16)) & 4278190335;
  z  = (z | (z<<8))  & 251719695;
  z  = (z | (z<<4))  & 3272356035;
  z  = (z | (z<<2))  & 1227133513;
  
  return x | (z << 2);
}

//Extracts nth interleaved component of a 3-tuple
exports.deinterleave3 = function(v, n) {
  v = (v >>> n)       & 1227133513;
  v = (v | (v>>>2))   & 3272356035;
  v = (v | (v>>>4))   & 251719695;
  v = (v | (v>>>8))   & 4278190335;
  v = (v | (v>>>16))  & 0x3FF;
  return (v<<22)>>22;
}

//Computes next combination in colexicographic order (this is mistakenly called nextPermutation on the bit twiddling hacks page)
exports.nextCombination = function(v) {
  var t = v | (v - 1);
  return (t + 1) | (((~t & -~t) - 1) >>> (countTrailingZeros(v) + 1));
}


},{}],16:[function(require,module,exports){
(function(){/*jshint expr:true */
/*global window:false, console:false, define:false, module:false */

/**
 * @license IDBWrapper - A cross-browser wrapper for IndexedDB
 * Copyright (c) 2011 - 2013 Jens Arps
 * http://jensarps.de/
 *
 * Licensed under the MIT (X11) license
 */

(function (name, definition, global) {
  if (typeof define === 'function') {
    define(definition);
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = definition();
  } else {
    global[name] = definition();
  }
})('IDBStore', function () {

  "use strict";

  var defaults = {
    storeName: 'Store',
    storePrefix: 'IDBWrapper-',
    dbVersion: 1,
    keyPath: 'id',
    autoIncrement: true,
    onStoreReady: function () {
    },
    onError: function(error){
      throw error;
    },
    indexes: []
  };

  /**
   *
   * The IDBStore constructor
   *
   * @constructor
   * @name IDBStore
   * @version 1.1.0
   *
   * @param {Object} [kwArgs] An options object used to configure the store and
   *  set callbacks
   * @param {String} [kwArgs.storeName='Store'] The name of the store
   * @param {String} [kwArgs.storePrefix='IDBWrapper-'] A prefix that is
   *  internally used to construct the name of the database, which will be
   *  kwArgs.storePrefix + kwArgs.storeName
   * @param {Number} [kwArgs.dbVersion=1] The version of the store
   * @param {String} [kwArgs.keyPath='id'] The key path to use. If you want to
   *  setup IDBWrapper to work with out-of-line keys, you need to set this to
   *  `null`
   * @param {Boolean} [kwArgs.autoIncrement=true] If set to true, IDBStore will
   *  automatically make sure a unique keyPath value is present on each object
   *  that is stored.
   * @param {Function} [kwArgs.onStoreReady] A callback to be called when the
   *  store is ready to be used.
   * @param {Function} [kwArgs.onError=throw] A callback to be called when an
   *  error occurred during instantiation of the store.
   * @param {Array} [kwArgs.indexes=[]] An array of indexData objects
   *  defining the indexes to use with the store. For every index to be used
   *  one indexData object needs to be passed in the array.
   *  An indexData object is defined as follows:
   * @param {Object} [kwArgs.indexes.indexData] An object defining the index to
   *  use
   * @param {String} kwArgs.indexes.indexData.name The name of the index
   * @param {String} [kwArgs.indexes.indexData.keyPath] The key path of the index
   * @param {Boolean} [kwArgs.indexes.indexData.unique] Whether the index is unique
   * @param {Boolean} [kwArgs.indexes.indexData.multiEntry] Whether the index is multi entry
   * @param {Function} [onStoreReady] A callback to be called when the store
   * is ready to be used.
   * @example
      // create a store for customers with an additional index over the
      // `lastname` property.
      var myCustomerStore = new IDBStore({
        dbVersion: 1,
        storeName: 'customer-index',
        keyPath: 'customerid',
        autoIncrement: true,
        onStoreReady: populateTable,
        indexes: [
          { name: 'lastname', keyPath: 'lastname', unique: false, multiEntry: false }
        ]
      });
   * @example
      // create a generic store
      var myCustomerStore = new IDBStore({
        storeName: 'my-data-store',
        onStoreReady: function(){
          // start working with the store.
        }
      });
   */
  var IDBStore = function (kwArgs, onStoreReady) {

    for(var key in defaults){
      this[key] = typeof kwArgs[key] != 'undefined' ? kwArgs[key] : defaults[key];
    }

    this.dbName = this.storePrefix + this.storeName;
    this.dbVersion = parseInt(this.dbVersion, 10);

    onStoreReady && (this.onStoreReady = onStoreReady);

    this.idb = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB;
    this.keyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.mozIDBKeyRange;

    this.consts = {
      'READ_ONLY':         'readonly',
      'READ_WRITE':        'readwrite',
      'VERSION_CHANGE':    'versionchange',
      'NEXT':              'next',
      'NEXT_NO_DUPLICATE': 'nextunique',
      'PREV':              'prev',
      'PREV_NO_DUPLICATE': 'prevunique'
    };

    this.openDB();
  };

  IDBStore.prototype = /** @lends IDBStore */ {

    /**
     * The version of IDBStore
     *
     * @type String
     */
    version: '1.2.0',

    /**
     * A reference to the IndexedDB object
     *
     * @type Object
     */
    db: null,

    /**
     * The full name of the IndexedDB used by IDBStore, composed of
     * this.storePrefix + this.storeName
     *
     * @type String
     */
    dbName: null,

    /**
     * The version of the IndexedDB used by IDBStore
     *
     * @type Number
     */
    dbVersion: null,

    /**
     * A reference to the objectStore used by IDBStore
     *
     * @type Object
     */
    store: null,

    /**
     * The store name
     *
     * @type String
     */
    storeName: null,

    /**
     * The key path
     *
     * @type String
     */
    keyPath: null,

    /**
     * Whether IDBStore uses autoIncrement
     *
     * @type Boolean
     */
    autoIncrement: null,

    /**
     * The indexes used by IDBStore
     *
     * @type Array
     */
    indexes: null,

    /**
     * A hashmap of features of the used IDB implementation
     *
     * @type Object
     * @proprty {Boolean} autoIncrement If the implementation supports
     *  native auto increment
     */
    features: null,

    /**
     * The callback to be called when the store is ready to be used
     *
     * @type Function
     */
    onStoreReady: null,

    /**
     * The callback to be called if an error occurred during instantiation
     * of the store
     *
     * @type Function
     */
    onError: null,

    /**
     * The internal insertID counter
     *
     * @type Number
     * @private
     */
    _insertIdCount: 0,

    /**
     * Opens an IndexedDB; called by the constructor.
     *
     * Will check if versions match and compare provided index configuration
     * with existing ones, and update indexes if necessary.
     *
     * Will call this.onStoreReady() if everything went well and the store
     * is ready to use, and this.onError() is something went wrong.
     *
     * @private
     *
     */
    openDB: function () {

      var features = this.features = {};
      features.hasAutoIncrement = !window.mozIndexedDB;

      var openRequest = this.idb.open(this.dbName, this.dbVersion);
      var preventSuccessCallback = false;

      openRequest.onerror = function (error) {

        var gotVersionErr = false;
        if ('error' in error.target) {
          gotVersionErr = error.target.error.name == "VersionError";
        } else if ('errorCode' in error.target) {
          gotVersionErr = error.target.errorCode == 12;
        }

        if (gotVersionErr) {
          this.onError(new Error('The version number provided is lower than the existing one.'));
        } else {
          this.onError(error);
        }
      }.bind(this);

      openRequest.onsuccess = function (event) {

        if (preventSuccessCallback) {
          return;
        }

        if(this.db){
          this.onStoreReady();
          return;
        }

        this.db = event.target.result;

        if(typeof this.db.version == 'string'){
          this.onError(new Error('The IndexedDB implementation in this browser is outdated. Please upgrade your browser.'));
          return;
        }

        if(!this.db.objectStoreNames.contains(this.storeName)){
          // We should never ever get here.
          // Lets notify the user anyway.
          this.onError(new Error('Something is wrong with the IndexedDB implementation in this browser. Please upgrade your browser.'));
          return;
        }

        var emptyTransaction = this.db.transaction([this.storeName], this.consts.READ_ONLY);
        this.store = emptyTransaction.objectStore(this.storeName);

        // check indexes
        this.indexes.forEach(function(indexData){
          var indexName = indexData.name;

          if(!indexName){
            preventSuccessCallback = true;
            this.onError(new Error('Cannot create index: No index name given.'));
            return;
          }

          this.normalizeIndexData(indexData);

          if(this.hasIndex(indexName)){
            // check if it complies
            var actualIndex = this.store.index(indexName);
            var complies = this.indexComplies(actualIndex, indexData);
            if(!complies){
              preventSuccessCallback = true;
              this.onError(new Error('Cannot modify index "' + indexName + '" for current version. Please bump version number to ' + ( this.dbVersion + 1 ) + '.'));
            }
          } else {
            preventSuccessCallback = true;
            this.onError(new Error('Cannot create new index "' + indexName + '" for current version. Please bump version number to ' + ( this.dbVersion + 1 ) + '.'));
          }

        }, this);

        preventSuccessCallback || this.onStoreReady();
      }.bind(this);

      openRequest.onupgradeneeded = function(/* IDBVersionChangeEvent */ event){

        this.db = event.target.result;

        if(this.db.objectStoreNames.contains(this.storeName)){
          this.store = event.target.transaction.objectStore(this.storeName);
        } else {
          this.store = this.db.createObjectStore(this.storeName, { keyPath: this.keyPath, autoIncrement: this.autoIncrement});
        }

        this.indexes.forEach(function(indexData){
          var indexName = indexData.name;

          if(!indexName){
            preventSuccessCallback = true;
            this.onError(new Error('Cannot create index: No index name given.'));
          }

          this.normalizeIndexData(indexData);

          if(this.hasIndex(indexName)){
            // check if it complies
            var actualIndex = this.store.index(indexName);
            var complies = this.indexComplies(actualIndex, indexData);
            if(!complies){
              // index differs, need to delete and re-create
              this.store.deleteIndex(indexName);
              this.store.createIndex(indexName, indexData.keyPath, { unique: indexData.unique, multiEntry: indexData.multiEntry });
            }
          } else {
            this.store.createIndex(indexName, indexData.keyPath, { unique: indexData.unique, multiEntry: indexData.multiEntry });
          }

        }, this);

      }.bind(this);
    },

    /**
     * Deletes the database used for this store if the IDB implementations
     * provides that functionality.
     */
    deleteDatabase: function () {
      if (this.idb.deleteDatabase) {
        this.idb.deleteDatabase(this.dbName);
      }
    },

    /*********************
     * data manipulation *
     *********************/

    /**
     * Puts an object into the store. If an entry with the given id exists,
     * it will be overwritten. This method has a different signature for inline
     * keys and out-of-line keys; please see the examples below.
     *
     * @param {*} [key] The key to store. This is only needed if IDBWrapper
     *  is set to use out-of-line keys. For inline keys - the default scenario -
     *  this can be omitted.
     * @param {Object} value The data object to store.
     * @param {Function} [onSuccess] A callback that is called if insertion
     *  was successful.
     * @param {Function} [onError] A callback that is called if insertion
     *  failed.
     * @example
        // Storing an object, using inline keys (the default scenario):
        var myCustomer = {
          customerid: 2346223,
          lastname: 'Doe',
          firstname: 'John'
        };
        myCustomerStore.put(myCustomer, mySuccessHandler, myErrorHandler);
        // Note that passing success- and error-handlers is optional.
     * @example
        // Storing an object, using out-of-line keys:
       var myCustomer = {
         lastname: 'Doe',
         firstname: 'John'
       };
       myCustomerStore.put(2346223, myCustomer, mySuccessHandler, myErrorHandler);
      // Note that passing success- and error-handlers is optional.
     */
    put: function (key, value, onSuccess, onError) {
      if (this.keyPath !== null) {
        onError = onSuccess;
        onSuccess = value;
        value = key;
      }
      onError || (onError = function (error) {
        console.error('Could not write data.', error);
      });
      onSuccess || (onSuccess = noop);

      var hasSuccess = false,
          result = null,
          putRequest;

      var putTransaction = this.db.transaction([this.storeName], this.consts.READ_WRITE);
      putTransaction.oncomplete = function () {
        var callback = hasSuccess ? onSuccess : onError;
        callback(result);
      };
      putTransaction.onabort = onError;
      putTransaction.onerror = onError;

      if (this.keyPath !== null) { // in-line keys
        this._addIdPropertyIfNeeded(value);
        putRequest = putTransaction.objectStore(this.storeName).put(value);
      } else { // out-of-line keys
        putRequest = putTransaction.objectStore(this.storeName).put(value, key);
      }
      putRequest.onsuccess = function (event) {
        hasSuccess = true;
        result = event.target.result;
      };
      putRequest.onerror = onError;
    },

    /**
     * Retrieves an object from the store. If no entry exists with the given id,
     * the success handler will be called with null as first and only argument.
     *
     * @param {*} key The id of the object to fetch.
     * @param {Function} [onSuccess] A callback that is called if fetching
     *  was successful. Will receive the object as only argument.
     * @param {Function} [onError] A callback that will be called if an error
     *  occurred during the operation.
     */
    get: function (key, onSuccess, onError) {
      onError || (onError = function (error) {
        console.error('Could not read data.', error);
      });
      onSuccess || (onSuccess = noop);

      var hasSuccess = false,
          result = null;
      
      var getTransaction = this.db.transaction([this.storeName], this.consts.READ_ONLY);
      getTransaction.oncomplete = function () {
        var callback = hasSuccess ? onSuccess : onError;
        callback(result);
      };
      getTransaction.onabort = onError;
      getTransaction.onerror = onError;
      var getRequest = getTransaction.objectStore(this.storeName).get(key);
      getRequest.onsuccess = function (event) {
        hasSuccess = true;
        result = event.target.result;
      };
      getRequest.onerror = onError;
    },

    /**
     * Removes an object from the store.
     *
     * @param {*} key The id of the object to remove.
     * @param {Function} [onSuccess] A callback that is called if the removal
     *  was successful.
     * @param {Function} [onError] A callback that will be called if an error
     *  occurred during the operation.
     */
    remove: function (key, onSuccess, onError) {
      onError || (onError = function (error) {
        console.error('Could not remove data.', error);
      });
      onSuccess || (onSuccess = noop);

      var hasSuccess = false,
          result = null;

      var removeTransaction = this.db.transaction([this.storeName], this.consts.READ_WRITE);
      removeTransaction.oncomplete = function () {
        var callback = hasSuccess ? onSuccess : onError;
        callback(result);
      };
      removeTransaction.onabort = onError;
      removeTransaction.onerror = onError;

      var deleteRequest = removeTransaction.objectStore(this.storeName)['delete'](key);
      deleteRequest.onsuccess = function (event) {
        hasSuccess = true;
        result = event.target.result;
      };
      deleteRequest.onerror = onError;
    },

    /**
     * Runs a batch of put and/or remove operations on the store.
     *
     * @param {Array} dataArray An array of objects containing the operation to run
     *  and the data object (for put operations).
     * @param {Function} [onSuccess] A callback that is called if all operations
     *  were successful.
     * @param {Function} [onError] A callback that is called if an error
     *  occurred during one of the operations.
     */
    batch: function (dataArray, onSuccess, onError) {
      onError || (onError = function (error) {
        console.error('Could not apply batch.', error);
      });
      onSuccess || (onSuccess = noop);

      if(Object.prototype.toString.call(dataArray) != '[object Array]'){
        onError(new Error('dataArray argument must be of type Array.'));
      }
      var batchTransaction = this.db.transaction([this.storeName] , this.consts.READ_WRITE);
      batchTransaction.oncomplete = function () {
        var callback = hasSuccess ? onSuccess : onError;
        callback(hasSuccess);
      };
      batchTransaction.onabort = onError;
      batchTransaction.onerror = onError;
      
      var count = dataArray.length;
      var called = false;
      var hasSuccess = false;

      var onItemSuccess = function () {
        count--;
        if (count === 0 && !called) {
          called = true;
          hasSuccess = true;
        }
      };

      dataArray.forEach(function (operation) {
        var type = operation.type;
        var key = operation.key;
        var value = operation.value;

        var onItemError = function (err) {
          batchTransaction.abort();
          if (!called) {
            called = true;
            onError(err, type, key);
          }
        };

        if (type == "remove") {
          var deleteRequest = batchTransaction.objectStore(this.storeName)['delete'](key);
          deleteRequest.onsuccess = onItemSuccess;
          deleteRequest.onerror = onItemError;
        } else if (type == "put") {
          var putRequest;
          if (this.keyPath !== null) { // in-line keys
            this._addIdPropertyIfNeeded(value);
            putRequest = batchTransaction.objectStore(this.storeName).put(value);
          } else { // out-of-line keys
            putRequest = batchTransaction.objectStore(this.storeName).put(value, key);
          }
          putRequest.onsuccess = onItemSuccess;
          putRequest.onerror = onItemError;
        }
      }, this);
    },

    /**
     * Fetches all entries in the store.
     *
     * @param {Function} [onSuccess] A callback that is called if the operation
     *  was successful. Will receive an array of objects.
     * @param {Function} [onError] A callback that will be called if an error
     *  occurred during the operation.
     */
    getAll: function (onSuccess, onError) {
      onError || (onError = function (error) {
        console.error('Could not read data.', error);
      });
      onSuccess || (onSuccess = noop);
      var getAllTransaction = this.db.transaction([this.storeName], this.consts.READ_ONLY);
      var store = getAllTransaction.objectStore(this.storeName);
      if (store.getAll) {
        this._getAllNative(getAllTransaction, store, onSuccess, onError);
      } else {
        this._getAllCursor(getAllTransaction, store, onSuccess, onError);
      }
    },

    /**
     * Implements getAll for IDB implementations that have a non-standard
     * getAll() method.
     *
     * @param {Object} getAllTransaction An open READ transaction.
     * @param {Object} store A reference to the store.
     * @param {Function} onSuccess A callback that will be called if the
     *  operation was successful.
     * @param {Function} onError A callback that will be called if an
     *  error occurred during the operation.
     * @private
     */
    _getAllNative: function (getAllTransaction, store, onSuccess, onError) {
      var hasSuccess = false,
          result = null;

      getAllTransaction.oncomplete = function () {
        var callback = hasSuccess ? onSuccess : onError;
        callback(result);
      };
      getAllTransaction.onabort = onError;
      getAllTransaction.onerror = onError;

      var getAllRequest = store.getAll();
      getAllRequest.onsuccess = function (event) {
        hasSuccess = true;
        result = event.target.result;
      };
      getAllRequest.onerror = onError;
    },

    /**
     * Implements getAll for IDB implementations that do not have a getAll()
     * method.
     *
     * @param {Object} getAllTransaction An open READ transaction.
     * @param {Object} store A reference to the store.
     * @param {Function} onSuccess A callback that will be called if the
     *  operation was successful.
     * @param {Function} onError A callback that will be called if an
     *  error occurred during the operation.
     * @private
     */
    _getAllCursor: function (getAllTransaction, store, onSuccess, onError) {
      var all = [],
          hasSuccess = false,
          result = null;

      getAllTransaction.oncomplete = function () {
        var callback = hasSuccess ? onSuccess : onError;
        callback(result);
      };
      getAllTransaction.onabort = onError;
      getAllTransaction.onerror = onError;

      var cursorRequest = store.openCursor();
      cursorRequest.onsuccess = function (event) {
        var cursor = event.target.result;
        if (cursor) {
          all.push(cursor.value);
          cursor['continue']();
        }
        else {
          hasSuccess = true;
          result = all;
        }
      };
      cursorRequest.onError = onError;
    },

    /**
     * Clears the store, i.e. deletes all entries in the store.
     *
     * @param {Function} [onSuccess] A callback that will be called if the
     *  operation was successful.
     * @param {Function} [onError] A callback that will be called if an
     *  error occurred during the operation.
     */
    clear: function (onSuccess, onError) {
      onError || (onError = function (error) {
        console.error('Could not clear store.', error);
      });
      onSuccess || (onSuccess = noop);

      var hasSuccess = false,
          result = null;

      var clearTransaction = this.db.transaction([this.storeName], this.consts.READ_WRITE);
      clearTransaction.oncomplete = function () {
        var callback = hasSuccess ? onSuccess : onError;
        callback(result);
      };
      clearTransaction.onabort = onError;
      clearTransaction.onerror = onError;

      var clearRequest = clearTransaction.objectStore(this.storeName).clear();
      clearRequest.onsuccess = function (event) {
        hasSuccess = true;
        result = event.target.result;
      };
      clearRequest.onerror = onError;
    },

    /**
     * Checks if an id property needs to present on a object and adds one if
     * necessary.
     *
     * @param {Object} dataObj The data object that is about to be stored
     * @private
     */
    _addIdPropertyIfNeeded: function (dataObj) {
      if (!this.features.hasAutoIncrement && typeof dataObj[this.keyPath] == 'undefined') {
        dataObj[this.keyPath] = this._insertIdCount++ + Date.now();
      }
    },

    /************
     * indexing *
     ************/

    /**
     * Returns a DOMStringList of index names of the store.
     *
     * @return {DOMStringList} The list of index names
     */
    getIndexList: function () {
      return this.store.indexNames;
    },

    /**
     * Checks if an index with the given name exists in the store.
     *
     * @param {String} indexName The name of the index to look for
     * @return {Boolean} Whether the store contains an index with the given name
     */
    hasIndex: function (indexName) {
      return this.store.indexNames.contains(indexName);
    },

    /**
     * Normalizes an object containing index data and assures that all
     * properties are set.
     *
     * @param {Object} indexData The index data object to normalize
     * @param {String} indexData.name The name of the index
     * @param {String} [indexData.keyPath] The key path of the index
     * @param {Boolean} [indexData.unique] Whether the index is unique
     * @param {Boolean} [indexData.multiEntry] Whether the index is multi entry
     */
    normalizeIndexData: function (indexData) {
      indexData.keyPath = indexData.keyPath || indexData.name;
      indexData.unique = !!indexData.unique;
      indexData.multiEntry = !!indexData.multiEntry;
    },

    /**
     * Checks if an actual index complies with an expected index.
     *
     * @param {Object} actual The actual index found in the store
     * @param {Object} expected An Object describing an expected index
     * @return {Boolean} Whether both index definitions are identical
     */
    indexComplies: function (actual, expected) {
      var complies = ['keyPath', 'unique', 'multiEntry'].every(function (key) {
        // IE10 returns undefined for no multiEntry
        if (key == 'multiEntry' && actual[key] === undefined && expected[key] === false) {
          return true;
        }
        return expected[key] == actual[key];
      });
      return complies;
    },

    /**********
     * cursor *
     **********/

    /**
     * Iterates over the store using the given options and calling onItem
     * for each entry matching the options.
     *
     * @param {Function} onItem A callback to be called for each match
     * @param {Object} [options] An object defining specific options
     * @param {Object} [options.index=null] An IDBIndex to operate on
     * @param {String} [options.order=ASC] The order in which to provide the
     *  results, can be 'DESC' or 'ASC'
     * @param {Boolean} [options.autoContinue=true] Whether to automatically
     *  iterate the cursor to the next result
     * @param {Boolean} [options.filterDuplicates=false] Whether to exclude
     *  duplicate matches
     * @param {Object} [options.keyRange=null] An IDBKeyRange to use
     * @param {Boolean} [options.writeAccess=false] Whether grant write access
     *  to the store in the onItem callback
     * @param {Function} [options.onEnd=null] A callback to be called after
     *  iteration has ended
     * @param {Function} [options.onError=console.error] A callback to be called
     *  if an error occurred during the operation.
     */
    iterate: function (onItem, options) {
      options = mixin({
        index: null,
        order: 'ASC',
        autoContinue: true,
        filterDuplicates: false,
        keyRange: null,
        writeAccess: false,
        onEnd: null,
        onError: function (error) {
          console.error('Could not open cursor.', error);
        }
      }, options || {});

      var directionType = options.order.toLowerCase() == 'desc' ? 'PREV' : 'NEXT';
      if (options.filterDuplicates) {
        directionType += '_NO_DUPLICATE';
      }

      var hasSuccess = false;
      var cursorTransaction = this.db.transaction([this.storeName], this.consts[options.writeAccess ? 'READ_WRITE' : 'READ_ONLY']);
      var cursorTarget = cursorTransaction.objectStore(this.storeName);
      if (options.index) {
        cursorTarget = cursorTarget.index(options.index);
      }

      cursorTransaction.oncomplete = function () {
        if (!hasSuccess) {
          options.onError(null);
          return;
        }
        if (options.onEnd) {
          options.onEnd();
        } else {
          onItem(null);
        }
      };
      cursorTransaction.onabort = options.onError;
      cursorTransaction.onerror = options.onError;

      var cursorRequest = cursorTarget.openCursor(options.keyRange, this.consts[directionType]);
      cursorRequest.onerror = options.onError;
      cursorRequest.onsuccess = function (event) {
        var cursor = event.target.result;
        if (cursor) {
          onItem(cursor.value, cursor, cursorTransaction);
          if (options.autoContinue) {
            cursor['continue']();
          }
        } else {
          hasSuccess = true;
        }
      };
    },

    /**
     * Runs a query against the store and passes an array containing matched
     * objects to the success handler.
     *
     * @param {Function} onSuccess A callback to be called when the operation
     *  was successful.
     * @param {Object} [options] An object defining specific query options
     * @param {Object} [options.index=null] An IDBIndex to operate on
     * @param {String} [options.order=ASC] The order in which to provide the
     *  results, can be 'DESC' or 'ASC'
     * @param {Boolean} [options.filterDuplicates=false] Whether to exclude
     *  duplicate matches
     * @param {Object} [options.keyRange=null] An IDBKeyRange to use
     * @param {Function} [options.onError=console.error] A callback to be called if an error
     *  occurred during the operation.
     */
    query: function (onSuccess, options) {
      var result = [];
      options = options || {};
      options.onEnd = function () {
        onSuccess(result);
      };
      this.iterate(function (item) {
        result.push(item);
      }, options);
    },

    /**
     *
     * Runs a query against the store, but only returns the number of matches
     * instead of the matches itself.
     *
     * @param {Function} onSuccess A callback to be called if the opration
     *  was successful.
     * @param {Object} [options] An object defining specific options
     * @param {Object} [options.index=null] An IDBIndex to operate on
     * @param {Object} [options.keyRange=null] An IDBKeyRange to use
     * @param {Function} [options.onError=console.error] A callback to be called if an error
     *  occurred during the operation.
     */
    count: function (onSuccess, options) {

      options = mixin({
        index: null,
        keyRange: null
      }, options || {});

      var onError = options.onError || function (error) {
        console.error('Could not open cursor.', error);
      };

      var hasSuccess = false,
          result = null;

      var cursorTransaction = this.db.transaction([this.storeName], this.consts.READ_ONLY);
      cursorTransaction.oncomplete = function () {
        var callback = hasSuccess ? onSuccess : onError;
        callback(result);
      };
      cursorTransaction.onabort = onError;
      cursorTransaction.onerror = onError;

      var cursorTarget = cursorTransaction.objectStore(this.storeName);
      if (options.index) {
        cursorTarget = cursorTarget.index(options.index);
      }
      var countRequest = cursorTarget.count(options.keyRange);
      countRequest.onsuccess = function (evt) {
        hasSuccess = true;
        result = evt.target.result;
      };
      countRequest.onError = onError;
    },

    /**************/
    /* key ranges */
    /**************/

    /**
     * Creates a key range using specified options. This key range can be
     * handed over to the count() and iterate() methods.
     *
     * Note: You must provide at least one or both of "lower" or "upper" value.
     *
     * @param {Object} options The options for the key range to create
     * @param {*} [options.lower] The lower bound
     * @param {Boolean} [options.excludeLower] Whether to exclude the lower
     *  bound passed in options.lower from the key range
     * @param {*} [options.upper] The upper bound
     * @param {Boolean} [options.excludeUpper] Whether to exclude the upper
     *  bound passed in options.upper from the key range
     * @return {Object} The IDBKeyRange representing the specified options
     */
    makeKeyRange: function(options){
      /*jshint onecase:true */
      var keyRange,
          hasLower = typeof options.lower != 'undefined',
          hasUpper = typeof options.upper != 'undefined';

      switch(true){
        case hasLower && hasUpper:
          keyRange = this.keyRange.bound(options.lower, options.upper, options.excludeLower, options.excludeUpper);
          break;
        case hasLower:
          keyRange = this.keyRange.lowerBound(options.lower, options.excludeLower);
          break;
        case hasUpper:
          keyRange = this.keyRange.upperBound(options.upper, options.excludeUpper);
          break;
        default:
          throw new Error('Cannot create KeyRange. Provide one or both of "lower" or "upper" value.');
      }

      return keyRange;

    }

  };

  /** helpers **/

  var noop = function () {
  };
  var empty = {};
  var mixin = function (target, source) {
    var name, s;
    for (name in source) {
      s = source[name];
      if (s !== empty[name] && s !== target[name]) {
        target[name] = s;
      }
    }
    return target;
  };

  IDBStore.version = IDBStore.prototype.version;

  return IDBStore;

}, this);

})()
},{}],13:[function(require,module,exports){
var util = require('util')
var AbstractIterator  = require('abstract-leveldown').AbstractIterator
module.exports = Iterator

function Iterator (db, options) {
  if (!options) options = {}
  this.options = options
  AbstractIterator.call(this, db)
  this._order = !!options.reverse ? 'DESC': 'ASC'
  this._start = options.start
  this._limit = options.limit
  if (this._limit) this._count = 0
  this._end   = options.end
  this._done = false
}

util.inherits(Iterator, AbstractIterator)

Iterator.prototype.createIterator = function() {
  var lower, upper
  var onlyStart = typeof this._start !== 'undefined' && typeof this._end === 'undefined'
  var onlyEnd = typeof this._start === 'undefined' && typeof this._end !== 'undefined'
  var startAndEnd = typeof this._start !== 'undefined' && typeof this._end !== 'undefined'
  if (onlyStart) {
    var index = this._start
    if (this._order === 'ASC') {
      lower = index
    } else {
      upper = index
    }
  } else if (onlyEnd) {
    var index = this._end
    if (this._order === 'DESC') {
      lower = index
    } else {
      upper = index
    }
  } else if (startAndEnd) {
    lower = this._start
    upper = this._end
    if (this._start > this._end) {
      lower = this._end
      upper = this._start
    }
  }
  if (lower || upper) {
    this._keyRange = this.options.keyRange || this.db.makeKeyRange({
      lower: lower,
      upper: upper
      // TODO expose excludeUpper/excludeLower
    })
  }
  this.iterator = this.db.iterate(this.onItem.bind(this), {
    keyRange: this._keyRange,
    autoContinue: false,
    order: this._order,
    onError: function(err) { console.log('horrible error', err) },
  })
}

// TODO the limit implementation here just ignores all reads after limit has been reached
// it should cancel the iterator instead but I don't know how
Iterator.prototype.onItem = function (value, cursor, cursorTransaction) {
  if (!cursor && this.callback) {
    this.callback()
    this.callback = false
    return
  }
  if (this._limit && this._limit > 0) {
    if (this._limit > this._count) this.callback(false, cursor.key, cursor.value)
  } else {
    this.callback(false, cursor.key, cursor.value)
  }
  if (this._limit) this._count++
  if (cursor) cursor.continue()
}

Iterator.prototype._next = function (callback) {
  if (!callback) return new Error('next() requires a callback argument')
  if (!this._started) {
    this.createIterator()
    this._started = true
  }
  this.callback = callback
}
},{"util":6,"abstract-leveldown":14}],18:[function(require,module,exports){
require=(function(e,t,n,r){function i(r){if(!n[r]){if(!t[r]){if(e)return e(r);throw new Error("Cannot find module '"+r+"'")}var s=n[r]={exports:{}};t[r][0](function(e){var n=t[r][1][e];return i(n?n:e)},s,s.exports)}return n[r].exports}for(var s=0;s<r.length;s++)i(r[s]);return i})(typeof require!=="undefined"&&require,{1:[function(require,module,exports){
exports.readIEEE754 = function(buffer, offset, isBE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isBE ? 0 : (nBytes - 1),
      d = isBE ? 1 : -1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.writeIEEE754 = function(buffer, value, offset, isBE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isBE ? (nBytes - 1) : 0,
      d = isBE ? -1 : 1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],2:[function(require,module,exports){
(function(){// UTILITY
var util = require('util');
var Buffer = require("buffer").Buffer;
var pSlice = Array.prototype.slice;

function objectKeys(object) {
  if (Object.keys) return Object.keys(object);
  var result = [];
  for (var name in object) {
    if (Object.prototype.hasOwnProperty.call(object, name)) {
      result.push(name);
    }
  }
  return result;
}

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.message = options.message;
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
};
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (value === undefined) {
    return '' + value;
  }
  if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (typeof value === 'function' || value instanceof RegExp) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (typeof s == 'string') {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

assert.AssertionError.prototype.toString = function() {
  if (this.message) {
    return [this.name + ':', this.message].join(' ');
  } else {
    return [
      this.name + ':',
      truncate(JSON.stringify(this.actual, replacer), 128),
      this.operator,
      truncate(JSON.stringify(this.expected, replacer), 128)
    ].join(' ');
  }
};

// assert.AssertionError instanceof Error

assert.AssertionError.__proto__ = Error.prototype;

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!!!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (Buffer.isBuffer(actual) && Buffer.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();

  // 7.3. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (typeof actual != 'object' && typeof expected != 'object') {
    return actual == expected;

  // 7.4. For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isUndefinedOrNull(value) {
  return value === null || value === undefined;
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (expected instanceof RegExp) {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (typeof expected === 'string') {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail('Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail('Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

})()
},{"util":3,"buffer":4}],"buffer-browserify":[function(require,module,exports){
module.exports=require('q9TxCC');
},{}],"q9TxCC":[function(require,module,exports){
(function(){function SlowBuffer (size) {
    this.length = size;
};

var assert = require('assert');

exports.INSPECT_MAX_BYTES = 50;


function toHex(n) {
  if (n < 16) return '0' + n.toString(16);
  return n.toString(16);
}

function utf8ToBytes(str) {
  var byteArray = [];
  for (var i = 0; i < str.length; i++)
    if (str.charCodeAt(i) <= 0x7F)
      byteArray.push(str.charCodeAt(i));
    else {
      var h = encodeURIComponent(str.charAt(i)).substr(1).split('%');
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16));
    }

  return byteArray;
}

function asciiToBytes(str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++ )
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push( str.charCodeAt(i) & 0xFF );

  return byteArray;
}

function base64ToBytes(str) {
  return require("base64-js").toByteArray(str);
}

SlowBuffer.byteLength = function (str, encoding) {
  switch (encoding || "utf8") {
    case 'hex':
      return str.length / 2;

    case 'utf8':
    case 'utf-8':
      return utf8ToBytes(str).length;

    case 'ascii':
    case 'binary':
      return str.length;

    case 'base64':
      return base64ToBytes(str).length;

    default:
      throw new Error('Unknown encoding');
  }
};

function blitBuffer(src, dst, offset, length) {
  var pos, i = 0;
  while (i < length) {
    if ((i+offset >= dst.length) || (i >= src.length))
      break;

    dst[i + offset] = src[i];
    i++;
  }
  return i;
}

SlowBuffer.prototype.utf8Write = function (string, offset, length) {
  var bytes, pos;
  return SlowBuffer._charsWritten =  blitBuffer(utf8ToBytes(string), this, offset, length);
};

SlowBuffer.prototype.asciiWrite = function (string, offset, length) {
  var bytes, pos;
  return SlowBuffer._charsWritten =  blitBuffer(asciiToBytes(string), this, offset, length);
};

SlowBuffer.prototype.binaryWrite = SlowBuffer.prototype.asciiWrite;

SlowBuffer.prototype.base64Write = function (string, offset, length) {
  var bytes, pos;
  return SlowBuffer._charsWritten = blitBuffer(base64ToBytes(string), this, offset, length);
};

SlowBuffer.prototype.base64Slice = function (start, end) {
  var bytes = Array.prototype.slice.apply(this, arguments)
  return require("base64-js").fromByteArray(bytes);
}

function decodeUtf8Char(str) {
  try {
    return decodeURIComponent(str);
  } catch (err) {
    return String.fromCharCode(0xFFFD); // UTF 8 invalid char
  }
}

SlowBuffer.prototype.utf8Slice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var res = "";
  var tmp = "";
  var i = 0;
  while (i < bytes.length) {
    if (bytes[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(bytes[i]);
      tmp = "";
    } else
      tmp += "%" + bytes[i].toString(16);

    i++;
  }

  return res + decodeUtf8Char(tmp);
}

SlowBuffer.prototype.asciiSlice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var ret = "";
  for (var i = 0; i < bytes.length; i++)
    ret += String.fromCharCode(bytes[i]);
  return ret;
}

SlowBuffer.prototype.binarySlice = SlowBuffer.prototype.asciiSlice;

SlowBuffer.prototype.inspect = function() {
  var out = [],
      len = this.length;
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i]);
    if (i == exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }
  return '<SlowBuffer ' + out.join(' ') + '>';
};


SlowBuffer.prototype.hexSlice = function(start, end) {
  var len = this.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var out = '';
  for (var i = start; i < end; i++) {
    out += toHex(this[i]);
  }
  return out;
};


SlowBuffer.prototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf8').toLowerCase();
  start = +start || 0;
  if (typeof end == 'undefined') end = this.length;

  // Fastpath empty strings
  if (+end == start) {
    return '';
  }

  switch (encoding) {
    case 'hex':
      return this.hexSlice(start, end);

    case 'utf8':
    case 'utf-8':
      return this.utf8Slice(start, end);

    case 'ascii':
      return this.asciiSlice(start, end);

    case 'binary':
      return this.binarySlice(start, end);

    case 'base64':
      return this.base64Slice(start, end);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Slice(start, end);

    default:
      throw new Error('Unknown encoding');
  }
};


SlowBuffer.prototype.hexWrite = function(string, offset, length) {
  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }

  // must be an even number of digits
  var strLen = string.length;
  if (strLen % 2) {
    throw new Error('Invalid hex string');
  }
  if (length > strLen / 2) {
    length = strLen / 2;
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16);
    if (isNaN(byte)) throw new Error('Invalid hex string');
    this[offset + i] = byte;
  }
  SlowBuffer._charsWritten = i * 2;
  return i;
};


SlowBuffer.prototype.write = function(string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length;
      length = undefined;
    }
  } else {  // legacy
    var swap = encoding;
    encoding = offset;
    offset = length;
    length = swap;
  }

  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase();

  switch (encoding) {
    case 'hex':
      return this.hexWrite(string, offset, length);

    case 'utf8':
    case 'utf-8':
      return this.utf8Write(string, offset, length);

    case 'ascii':
      return this.asciiWrite(string, offset, length);

    case 'binary':
      return this.binaryWrite(string, offset, length);

    case 'base64':
      return this.base64Write(string, offset, length);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Write(string, offset, length);

    default:
      throw new Error('Unknown encoding');
  }
};


// slice(start, end)
SlowBuffer.prototype.slice = function(start, end) {
  if (end === undefined) end = this.length;

  if (end > this.length) {
    throw new Error('oob');
  }
  if (start > end) {
    throw new Error('oob');
  }

  return new Buffer(this, end - start, +start);
};

SlowBuffer.prototype.copy = function(target, targetstart, sourcestart, sourceend) {
  var temp = [];
  for (var i=sourcestart; i<sourceend; i++) {
    assert.ok(typeof this[i] !== 'undefined', "copying undefined buffer bytes!");
    temp.push(this[i]);
  }

  for (var i=targetstart; i<targetstart+temp.length; i++) {
    target[i] = temp[i-targetstart];
  }
};

SlowBuffer.prototype.fill = function(value, start, end) {
  if (end > this.length) {
    throw new Error('oob');
  }
  if (start > end) {
    throw new Error('oob');
  }

  for (var i = start; i < end; i++) {
    this[i] = value;
  }
}

function coerce(length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length);
  return length < 0 ? 0 : length;
}


// Buffer

function Buffer(subject, encoding, offset) {
  if (!(this instanceof Buffer)) {
    return new Buffer(subject, encoding, offset);
  }

  var type;

  // Are we slicing?
  if (typeof offset === 'number') {
    this.length = coerce(encoding);
    this.parent = subject;
    this.offset = offset;
  } else {
    // Find the length
    switch (type = typeof subject) {
      case 'number':
        this.length = coerce(subject);
        break;

      case 'string':
        this.length = Buffer.byteLength(subject, encoding);
        break;

      case 'object': // Assume object is an array
        this.length = coerce(subject.length);
        break;

      default:
        throw new Error('First argument needs to be a number, ' +
                        'array or string.');
    }

    if (this.length > Buffer.poolSize) {
      // Big buffer, just alloc one.
      this.parent = new SlowBuffer(this.length);
      this.offset = 0;

    } else {
      // Small buffer.
      if (!pool || pool.length - pool.used < this.length) allocPool();
      this.parent = pool;
      this.offset = pool.used;
      pool.used += this.length;
    }

    // Treat array-ish objects as a byte array.
    if (isArrayIsh(subject)) {
      for (var i = 0; i < this.length; i++) {
        if (subject instanceof Buffer) {
          this.parent[i + this.offset] = subject.readUInt8(i);
        }
        else {
          this.parent[i + this.offset] = subject[i];
        }
      }
    } else if (type == 'string') {
      // We are a string
      this.length = this.write(subject, 0, encoding);
    }
  }

}

function isArrayIsh(subject) {
  return Array.isArray(subject) || Buffer.isBuffer(subject) ||
         subject && typeof subject === 'object' &&
         typeof subject.length === 'number';
}

exports.SlowBuffer = SlowBuffer;
exports.Buffer = Buffer;

Buffer.poolSize = 8 * 1024;
var pool;

function allocPool() {
  pool = new SlowBuffer(Buffer.poolSize);
  pool.used = 0;
}


// Static methods
Buffer.isBuffer = function isBuffer(b) {
  return b instanceof Buffer || b instanceof SlowBuffer;
};

Buffer.concat = function (list, totalLength) {
  if (!Array.isArray(list)) {
    throw new Error("Usage: Buffer.concat(list, [totalLength])\n \
      list should be an Array.");
  }

  if (list.length === 0) {
    return new Buffer(0);
  } else if (list.length === 1) {
    return list[0];
  }

  if (typeof totalLength !== 'number') {
    totalLength = 0;
    for (var i = 0; i < list.length; i++) {
      var buf = list[i];
      totalLength += buf.length;
    }
  }

  var buffer = new Buffer(totalLength);
  var pos = 0;
  for (var i = 0; i < list.length; i++) {
    var buf = list[i];
    buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer;
};

// Inspect
Buffer.prototype.inspect = function inspect() {
  var out = [],
      len = this.length;

  for (var i = 0; i < len; i++) {
    out[i] = toHex(this.parent[i + this.offset]);
    if (i == exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }

  return '<Buffer ' + out.join(' ') + '>';
};


Buffer.prototype.get = function get(i) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this.parent[this.offset + i];
};


Buffer.prototype.set = function set(i, v) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this.parent[this.offset + i] = v;
};


// write(string, offset = 0, length = buffer.length-offset, encoding = 'utf8')
Buffer.prototype.write = function(string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length;
      length = undefined;
    }
  } else {  // legacy
    var swap = encoding;
    encoding = offset;
    offset = length;
    length = swap;
  }

  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase();

  var ret;
  switch (encoding) {
    case 'hex':
      ret = this.parent.hexWrite(string, this.offset + offset, length);
      break;

    case 'utf8':
    case 'utf-8':
      ret = this.parent.utf8Write(string, this.offset + offset, length);
      break;

    case 'ascii':
      ret = this.parent.asciiWrite(string, this.offset + offset, length);
      break;

    case 'binary':
      ret = this.parent.binaryWrite(string, this.offset + offset, length);
      break;

    case 'base64':
      // Warning: maxLength not taken into account in base64Write
      ret = this.parent.base64Write(string, this.offset + offset, length);
      break;

    case 'ucs2':
    case 'ucs-2':
      ret = this.parent.ucs2Write(string, this.offset + offset, length);
      break;

    default:
      throw new Error('Unknown encoding');
  }

  Buffer._charsWritten = SlowBuffer._charsWritten;

  return ret;
};


// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf8').toLowerCase();

  if (typeof start == 'undefined' || start < 0) {
    start = 0;
  } else if (start > this.length) {
    start = this.length;
  }

  if (typeof end == 'undefined' || end > this.length) {
    end = this.length;
  } else if (end < 0) {
    end = 0;
  }

  start = start + this.offset;
  end = end + this.offset;

  switch (encoding) {
    case 'hex':
      return this.parent.hexSlice(start, end);

    case 'utf8':
    case 'utf-8':
      return this.parent.utf8Slice(start, end);

    case 'ascii':
      return this.parent.asciiSlice(start, end);

    case 'binary':
      return this.parent.binarySlice(start, end);

    case 'base64':
      return this.parent.base64Slice(start, end);

    case 'ucs2':
    case 'ucs-2':
      return this.parent.ucs2Slice(start, end);

    default:
      throw new Error('Unknown encoding');
  }
};


// byteLength
Buffer.byteLength = SlowBuffer.byteLength;


// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill(value, start, end) {
  value || (value = 0);
  start || (start = 0);
  end || (end = this.length);

  if (typeof value === 'string') {
    value = value.charCodeAt(0);
  }
  if (!(typeof value === 'number') || isNaN(value)) {
    throw new Error('value is not a number');
  }

  if (end < start) throw new Error('end < start');

  // Fill 0 bytes; we're done
  if (end === start) return 0;
  if (this.length == 0) return 0;

  if (start < 0 || start >= this.length) {
    throw new Error('start out of bounds');
  }

  if (end < 0 || end > this.length) {
    throw new Error('end out of bounds');
  }

  return this.parent.fill(value,
                          start + this.offset,
                          end + this.offset);
};


// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function(target, target_start, start, end) {
  var source = this;
  start || (start = 0);
  end || (end = this.length);
  target_start || (target_start = 0);

  if (end < start) throw new Error('sourceEnd < sourceStart');

  // Copy 0 bytes; we're done
  if (end === start) return 0;
  if (target.length == 0 || source.length == 0) return 0;

  if (target_start < 0 || target_start >= target.length) {
    throw new Error('targetStart out of bounds');
  }

  if (start < 0 || start >= source.length) {
    throw new Error('sourceStart out of bounds');
  }

  if (end < 0 || end > source.length) {
    throw new Error('sourceEnd out of bounds');
  }

  // Are we oob?
  if (end > this.length) {
    end = this.length;
  }

  if (target.length - target_start < end - start) {
    end = target.length - target_start + start;
  }

  return this.parent.copy(target.parent,
                          target_start + target.offset,
                          start + this.offset,
                          end + this.offset);
};


// slice(start, end)
Buffer.prototype.slice = function(start, end) {
  if (end === undefined) end = this.length;
  if (end > this.length) throw new Error('oob');
  if (start > end) throw new Error('oob');

  return new Buffer(this.parent, end - start, +start + this.offset);
};


// Legacy methods for backwards compatibility.

Buffer.prototype.utf8Slice = function(start, end) {
  return this.toString('utf8', start, end);
};

Buffer.prototype.binarySlice = function(start, end) {
  return this.toString('binary', start, end);
};

Buffer.prototype.asciiSlice = function(start, end) {
  return this.toString('ascii', start, end);
};

Buffer.prototype.utf8Write = function(string, offset) {
  return this.write(string, offset, 'utf8');
};

Buffer.prototype.binaryWrite = function(string, offset) {
  return this.write(string, offset, 'binary');
};

Buffer.prototype.asciiWrite = function(string, offset) {
  return this.write(string, offset, 'ascii');
};

Buffer.prototype.readUInt8 = function(offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return;

  return buffer.parent[buffer.offset + offset];
};

function readUInt16(buffer, offset, isBigEndian, noAssert) {
  var val = 0;


  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return 0;

  if (isBigEndian) {
    val = buffer.parent[buffer.offset + offset] << 8;
    if (offset + 1 < buffer.length) {
      val |= buffer.parent[buffer.offset + offset + 1];
    }
  } else {
    val = buffer.parent[buffer.offset + offset];
    if (offset + 1 < buffer.length) {
      val |= buffer.parent[buffer.offset + offset + 1] << 8;
    }
  }

  return val;
}

Buffer.prototype.readUInt16LE = function(offset, noAssert) {
  return readUInt16(this, offset, false, noAssert);
};

Buffer.prototype.readUInt16BE = function(offset, noAssert) {
  return readUInt16(this, offset, true, noAssert);
};

function readUInt32(buffer, offset, isBigEndian, noAssert) {
  var val = 0;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return 0;

  if (isBigEndian) {
    if (offset + 1 < buffer.length)
      val = buffer.parent[buffer.offset + offset + 1] << 16;
    if (offset + 2 < buffer.length)
      val |= buffer.parent[buffer.offset + offset + 2] << 8;
    if (offset + 3 < buffer.length)
      val |= buffer.parent[buffer.offset + offset + 3];
    val = val + (buffer.parent[buffer.offset + offset] << 24 >>> 0);
  } else {
    if (offset + 2 < buffer.length)
      val = buffer.parent[buffer.offset + offset + 2] << 16;
    if (offset + 1 < buffer.length)
      val |= buffer.parent[buffer.offset + offset + 1] << 8;
    val |= buffer.parent[buffer.offset + offset];
    if (offset + 3 < buffer.length)
      val = val + (buffer.parent[buffer.offset + offset + 3] << 24 >>> 0);
  }

  return val;
}

Buffer.prototype.readUInt32LE = function(offset, noAssert) {
  return readUInt32(this, offset, false, noAssert);
};

Buffer.prototype.readUInt32BE = function(offset, noAssert) {
  return readUInt32(this, offset, true, noAssert);
};


/*
 * Signed integer types, yay team! A reminder on how two's complement actually
 * works. The first bit is the signed bit, i.e. tells us whether or not the
 * number should be positive or negative. If the two's complement value is
 * positive, then we're done, as it's equivalent to the unsigned representation.
 *
 * Now if the number is positive, you're pretty much done, you can just leverage
 * the unsigned translations and return those. Unfortunately, negative numbers
 * aren't quite that straightforward.
 *
 * At first glance, one might be inclined to use the traditional formula to
 * translate binary numbers between the positive and negative values in two's
 * complement. (Though it doesn't quite work for the most negative value)
 * Mainly:
 *  - invert all the bits
 *  - add one to the result
 *
 * Of course, this doesn't quite work in Javascript. Take for example the value
 * of -128. This could be represented in 16 bits (big-endian) as 0xff80. But of
 * course, Javascript will do the following:
 *
 * > ~0xff80
 * -65409
 *
 * Whoh there, Javascript, that's not quite right. But wait, according to
 * Javascript that's perfectly correct. When Javascript ends up seeing the
 * constant 0xff80, it has no notion that it is actually a signed number. It
 * assumes that we've input the unsigned value 0xff80. Thus, when it does the
 * binary negation, it casts it into a signed value, (positive 0xff80). Then
 * when you perform binary negation on that, it turns it into a negative number.
 *
 * Instead, we're going to have to use the following general formula, that works
 * in a rather Javascript friendly way. I'm glad we don't support this kind of
 * weird numbering scheme in the kernel.
 *
 * (BIT-MAX - (unsigned)val + 1) * -1
 *
 * The astute observer, may think that this doesn't make sense for 8-bit numbers
 * (really it isn't necessary for them). However, when you get 16-bit numbers,
 * you do. Let's go back to our prior example and see how this will look:
 *
 * (0xffff - 0xff80 + 1) * -1
 * (0x007f + 1) * -1
 * (0x0080) * -1
 */
Buffer.prototype.readInt8 = function(offset, noAssert) {
  var buffer = this;
  var neg;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return;

  neg = buffer.parent[buffer.offset + offset] & 0x80;
  if (!neg) {
    return (buffer.parent[buffer.offset + offset]);
  }

  return ((0xff - buffer.parent[buffer.offset + offset] + 1) * -1);
};

function readInt16(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt16(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x8000;
  if (!neg) {
    return val;
  }

  return (0xffff - val + 1) * -1;
}

Buffer.prototype.readInt16LE = function(offset, noAssert) {
  return readInt16(this, offset, false, noAssert);
};

Buffer.prototype.readInt16BE = function(offset, noAssert) {
  return readInt16(this, offset, true, noAssert);
};

function readInt32(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt32(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x80000000;
  if (!neg) {
    return (val);
  }

  return (0xffffffff - val + 1) * -1;
}

Buffer.prototype.readInt32LE = function(offset, noAssert) {
  return readInt32(this, offset, false, noAssert);
};

Buffer.prototype.readInt32BE = function(offset, noAssert) {
  return readInt32(this, offset, true, noAssert);
};

function readFloat(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.readFloatLE = function(offset, noAssert) {
  return readFloat(this, offset, false, noAssert);
};

Buffer.prototype.readFloatBE = function(offset, noAssert) {
  return readFloat(this, offset, true, noAssert);
};

function readDouble(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 7 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.readDoubleLE = function(offset, noAssert) {
  return readDouble(this, offset, false, noAssert);
};

Buffer.prototype.readDoubleBE = function(offset, noAssert) {
  return readDouble(this, offset, true, noAssert);
};


/*
 * We have to make sure that the value is a valid integer. This means that it is
 * non-negative. It has no fractional component and that it does not exceed the
 * maximum allowed value.
 *
 *      value           The number to check for validity
 *
 *      max             The maximum value
 */
function verifuint(value, max) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value >= 0,
      'specified a negative value for writing an unsigned value');

  assert.ok(value <= max, 'value is larger than maximum value for type');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

Buffer.prototype.writeUInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xff);
  }

  if (offset < buffer.length) {
    buffer.parent[buffer.offset + offset] = value;
  }
};

function writeUInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffff);
  }

  for (var i = 0; i < Math.min(buffer.length - offset, 2); i++) {
    buffer.parent[buffer.offset + offset + i] =
        (value & (0xff << (8 * (isBigEndian ? 1 - i : i)))) >>>
            (isBigEndian ? 1 - i : i) * 8;
  }

}

Buffer.prototype.writeUInt16LE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt16BE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, true, noAssert);
};

function writeUInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffffffff);
  }

  for (var i = 0; i < Math.min(buffer.length - offset, 4); i++) {
    buffer.parent[buffer.offset + offset + i] =
        (value >>> (isBigEndian ? 3 - i : i) * 8) & 0xff;
  }
}

Buffer.prototype.writeUInt32LE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt32BE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, true, noAssert);
};


/*
 * We now move onto our friends in the signed number category. Unlike unsigned
 * numbers, we're going to have to worry a bit more about how we put values into
 * arrays. Since we are only worrying about signed 32-bit values, we're in
 * slightly better shape. Unfortunately, we really can't do our favorite binary
 * & in this system. It really seems to do the wrong thing. For example:
 *
 * > -32 & 0xff
 * 224
 *
 * What's happening above is really: 0xe0 & 0xff = 0xe0. However, the results of
 * this aren't treated as a signed number. Ultimately a bad thing.
 *
 * What we're going to want to do is basically create the unsigned equivalent of
 * our representation and pass that off to the wuint* functions. To do that
 * we're going to do the following:
 *
 *  - if the value is positive
 *      we can pass it directly off to the equivalent wuint
 *  - if the value is negative
 *      we do the following computation:
 *         mb + val + 1, where
 *         mb   is the maximum unsigned value in that byte size
 *         val  is the Javascript negative integer
 *
 *
 * As a concrete value, take -128. In signed 16 bits this would be 0xff80. If
 * you do out the computations:
 *
 * 0xffff - 128 + 1
 * 0xffff - 127
 * 0xff80
 *
 * You can then encode this value as the signed version. This is really rather
 * hacky, but it should work and get the job done which is our goal here.
 */

/*
 * A series of checks to make sure we actually have a signed 32-bit number
 */
function verifsint(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

function verifIEEE754(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');
}

Buffer.prototype.writeInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7f, -0x80);
  }

  if (value >= 0) {
    buffer.writeUInt8(value, offset, noAssert);
  } else {
    buffer.writeUInt8(0xff + value + 1, offset, noAssert);
  }
};

function writeInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fff, -0x8000);
  }

  if (value >= 0) {
    writeUInt16(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt16(buffer, 0xffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt16LE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt16BE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, true, noAssert);
};

function writeInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fffffff, -0x80000000);
  }

  if (value >= 0) {
    writeUInt32(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt32(buffer, 0xffffffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt32LE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt32BE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, true, noAssert);
};

function writeFloat(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.writeFloatLE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, false, noAssert);
};

Buffer.prototype.writeFloatBE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, true, noAssert);
};

function writeDouble(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 7 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.writeDoubleLE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, false, noAssert);
};

Buffer.prototype.writeDoubleBE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, true, noAssert);
};

SlowBuffer.prototype.readUInt8 = Buffer.prototype.readUInt8;
SlowBuffer.prototype.readUInt16LE = Buffer.prototype.readUInt16LE;
SlowBuffer.prototype.readUInt16BE = Buffer.prototype.readUInt16BE;
SlowBuffer.prototype.readUInt32LE = Buffer.prototype.readUInt32LE;
SlowBuffer.prototype.readUInt32BE = Buffer.prototype.readUInt32BE;
SlowBuffer.prototype.readInt8 = Buffer.prototype.readInt8;
SlowBuffer.prototype.readInt16LE = Buffer.prototype.readInt16LE;
SlowBuffer.prototype.readInt16BE = Buffer.prototype.readInt16BE;
SlowBuffer.prototype.readInt32LE = Buffer.prototype.readInt32LE;
SlowBuffer.prototype.readInt32BE = Buffer.prototype.readInt32BE;
SlowBuffer.prototype.readFloatLE = Buffer.prototype.readFloatLE;
SlowBuffer.prototype.readFloatBE = Buffer.prototype.readFloatBE;
SlowBuffer.prototype.readDoubleLE = Buffer.prototype.readDoubleLE;
SlowBuffer.prototype.readDoubleBE = Buffer.prototype.readDoubleBE;
SlowBuffer.prototype.writeUInt8 = Buffer.prototype.writeUInt8;
SlowBuffer.prototype.writeUInt16LE = Buffer.prototype.writeUInt16LE;
SlowBuffer.prototype.writeUInt16BE = Buffer.prototype.writeUInt16BE;
SlowBuffer.prototype.writeUInt32LE = Buffer.prototype.writeUInt32LE;
SlowBuffer.prototype.writeUInt32BE = Buffer.prototype.writeUInt32BE;
SlowBuffer.prototype.writeInt8 = Buffer.prototype.writeInt8;
SlowBuffer.prototype.writeInt16LE = Buffer.prototype.writeInt16LE;
SlowBuffer.prototype.writeInt16BE = Buffer.prototype.writeInt16BE;
SlowBuffer.prototype.writeInt32LE = Buffer.prototype.writeInt32LE;
SlowBuffer.prototype.writeInt32BE = Buffer.prototype.writeInt32BE;
SlowBuffer.prototype.writeFloatLE = Buffer.prototype.writeFloatLE;
SlowBuffer.prototype.writeFloatBE = Buffer.prototype.writeFloatBE;
SlowBuffer.prototype.writeDoubleLE = Buffer.prototype.writeDoubleLE;
SlowBuffer.prototype.writeDoubleBE = Buffer.prototype.writeDoubleBE;

})()
},{"assert":2,"./buffer_ieee754":1,"base64-js":5}],3:[function(require,module,exports){
var events = require('events');

exports.isArray = isArray;
exports.isDate = function(obj){return Object.prototype.toString.call(obj) === '[object Date]'};
exports.isRegExp = function(obj){return Object.prototype.toString.call(obj) === '[object RegExp]'};


exports.print = function () {};
exports.puts = function () {};
exports.debug = function() {};

exports.inspect = function(obj, showHidden, depth, colors) {
  var seen = [];

  var stylize = function(str, styleType) {
    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    var styles =
        { 'bold' : [1, 22],
          'italic' : [3, 23],
          'underline' : [4, 24],
          'inverse' : [7, 27],
          'white' : [37, 39],
          'grey' : [90, 39],
          'black' : [30, 39],
          'blue' : [34, 39],
          'cyan' : [36, 39],
          'green' : [32, 39],
          'magenta' : [35, 39],
          'red' : [31, 39],
          'yellow' : [33, 39] };

    var style =
        { 'special': 'cyan',
          'number': 'blue',
          'boolean': 'yellow',
          'undefined': 'grey',
          'null': 'bold',
          'string': 'green',
          'date': 'magenta',
          // "name": intentionally not styling
          'regexp': 'red' }[styleType];

    if (style) {
      return '\033[' + styles[style][0] + 'm' + str +
             '\033[' + styles[style][1] + 'm';
    } else {
      return str;
    }
  };
  if (! colors) {
    stylize = function(str, styleType) { return str; };
  }

  function format(value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (value && typeof value.inspect === 'function' &&
        // Filter out the util module, it's inspect function is special
        value !== exports &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      return value.inspect(recurseTimes);
    }

    // Primitive types cannot have properties
    switch (typeof value) {
      case 'undefined':
        return stylize('undefined', 'undefined');

      case 'string':
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                 .replace(/'/g, "\\'")
                                                 .replace(/\\"/g, '"') + '\'';
        return stylize(simple, 'string');

      case 'number':
        return stylize('' + value, 'number');

      case 'boolean':
        return stylize('' + value, 'boolean');
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
      return stylize('null', 'null');
    }

    // Look up the keys of the object.
    var visible_keys = Object_keys(value);
    var keys = showHidden ? Object_getOwnPropertyNames(value) : visible_keys;

    // Functions without properties can be shortcutted.
    if (typeof value === 'function' && keys.length === 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        var name = value.name ? ': ' + value.name : '';
        return stylize('[Function' + name + ']', 'special');
      }
    }

    // Dates without properties can be shortcutted
    if (isDate(value) && keys.length === 0) {
      return stylize(value.toUTCString(), 'date');
    }

    var base, type, braces;
    // Determine the object type
    if (isArray(value)) {
      type = 'Array';
      braces = ['[', ']'];
    } else {
      type = 'Object';
      braces = ['{', '}'];
    }

    // Make functions say that they are functions
    if (typeof value === 'function') {
      var n = value.name ? ': ' + value.name : '';
      base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
    } else {
      base = '';
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + value.toUTCString();
    }

    if (keys.length === 0) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        return stylize('[Object]', 'special');
      }
    }

    seen.push(value);

    var output = keys.map(function(key) {
      var name, str;
      if (value.__lookupGetter__) {
        if (value.__lookupGetter__(key)) {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Getter/Setter]', 'special');
          } else {
            str = stylize('[Getter]', 'special');
          }
        } else {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Setter]', 'special');
          }
        }
      }
      if (visible_keys.indexOf(key) < 0) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (seen.indexOf(value[key]) < 0) {
          if (recurseTimes === null) {
            str = format(value[key]);
          } else {
            str = format(value[key], recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (isArray(value)) {
              str = str.split('\n').map(function(line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function(line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = stylize('[Circular]', 'special');
        }
      }
      if (typeof name === 'undefined') {
        if (type === 'Array' && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    });

    seen.pop();

    var numLinesEst = 0;
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf('\n') >= 0) numLinesEst++;
      return prev + cur.length + 1;
    }, 0);

    if (length > 50) {
      output = braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];

    } else {
      output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }

    return output;
  }
  return format(obj, (typeof depth === 'undefined' ? 2 : depth));
};


function isArray(ar) {
  return ar instanceof Array ||
         Array.isArray(ar) ||
         (ar && ar !== Object.prototype && isArray(ar.__proto__));
}


function isRegExp(re) {
  return re instanceof RegExp ||
    (typeof re === 'object' && Object.prototype.toString.call(re) === '[object RegExp]');
}


function isDate(d) {
  if (d instanceof Date) return true;
  if (typeof d !== 'object') return false;
  var properties = Date.prototype && Object_getOwnPropertyNames(Date.prototype);
  var proto = d.__proto__ && Object_getOwnPropertyNames(d.__proto__);
  return JSON.stringify(proto) === JSON.stringify(properties);
}

function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}

exports.log = function (msg) {};

exports.pump = null;

var Object_keys = Object.keys || function (obj) {
    var res = [];
    for (var key in obj) res.push(key);
    return res;
};

var Object_getOwnPropertyNames = Object.getOwnPropertyNames || function (obj) {
    var res = [];
    for (var key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) res.push(key);
    }
    return res;
};

var Object_create = Object.create || function (prototype, properties) {
    // from es5-shim
    var object;
    if (prototype === null) {
        object = { '__proto__' : null };
    }
    else {
        if (typeof prototype !== 'object') {
            throw new TypeError(
                'typeof prototype[' + (typeof prototype) + '] != \'object\''
            );
        }
        var Type = function () {};
        Type.prototype = prototype;
        object = new Type();
        object.__proto__ = prototype;
    }
    if (typeof properties !== 'undefined' && Object.defineProperties) {
        Object.defineProperties(object, properties);
    }
    return object;
};

exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object_create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (typeof f !== 'string') {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(exports.inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j': return JSON.stringify(args[i++]);
      default:
        return x;
    }
  });
  for(var x = args[i]; i < len; x = args[++i]){
    if (x === null || typeof x !== 'object') {
      str += ' ' + x;
    } else {
      str += ' ' + exports.inspect(x);
    }
  }
  return str;
};

},{"events":6}],5:[function(require,module,exports){
(function (exports) {
	'use strict';

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	function b64ToByteArray(b64) {
		var i, j, l, tmp, placeHolders, arr;
	
		if (b64.length % 4 > 0) {
			throw 'Invalid string. Length must be a multiple of 4';
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		placeHolders = b64.indexOf('=');
		placeHolders = placeHolders > 0 ? b64.length - placeHolders : 0;

		// base64 is 4/3 + up to two characters of the original data
		arr = [];//new Uint8Array(b64.length * 3 / 4 - placeHolders);

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length;

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (lookup.indexOf(b64[i]) << 18) | (lookup.indexOf(b64[i + 1]) << 12) | (lookup.indexOf(b64[i + 2]) << 6) | lookup.indexOf(b64[i + 3]);
			arr.push((tmp & 0xFF0000) >> 16);
			arr.push((tmp & 0xFF00) >> 8);
			arr.push(tmp & 0xFF);
		}

		if (placeHolders === 2) {
			tmp = (lookup.indexOf(b64[i]) << 2) | (lookup.indexOf(b64[i + 1]) >> 4);
			arr.push(tmp & 0xFF);
		} else if (placeHolders === 1) {
			tmp = (lookup.indexOf(b64[i]) << 10) | (lookup.indexOf(b64[i + 1]) << 4) | (lookup.indexOf(b64[i + 2]) >> 2);
			arr.push((tmp >> 8) & 0xFF);
			arr.push(tmp & 0xFF);
		}

		return arr;
	}

	function uint8ToBase64(uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length;

		function tripletToBase64 (num) {
			return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
		};

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
			output += tripletToBase64(temp);
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1];
				output += lookup[temp >> 2];
				output += lookup[(temp << 4) & 0x3F];
				output += '==';
				break;
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
				output += lookup[temp >> 10];
				output += lookup[(temp >> 4) & 0x3F];
				output += lookup[(temp << 2) & 0x3F];
				output += '=';
				break;
		}

		return output;
	}

	module.exports.toByteArray = b64ToByteArray;
	module.exports.fromByteArray = uint8ToBase64;
}());

},{}],7:[function(require,module,exports){
exports.readIEEE754 = function(buffer, offset, isBE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isBE ? 0 : (nBytes - 1),
      d = isBE ? 1 : -1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.writeIEEE754 = function(buffer, value, offset, isBE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isBE ? (nBytes - 1) : 0,
      d = isBE ? -1 : 1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],8:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],6:[function(require,module,exports){
(function(process){if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    }
;
function indexOf (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0; i < xs.length; i++) {
        if (x === xs[i]) return i;
    }
    return -1;
}

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = indexOf(list, listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  if (arguments.length === 0) {
    this._events = {};
    return this;
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

})(require("__browserify_process"))
},{"__browserify_process":8}],4:[function(require,module,exports){
(function(){function SlowBuffer (size) {
    this.length = size;
};

var assert = require('assert');

exports.INSPECT_MAX_BYTES = 50;


function toHex(n) {
  if (n < 16) return '0' + n.toString(16);
  return n.toString(16);
}

function utf8ToBytes(str) {
  var byteArray = [];
  for (var i = 0; i < str.length; i++)
    if (str.charCodeAt(i) <= 0x7F)
      byteArray.push(str.charCodeAt(i));
    else {
      var h = encodeURIComponent(str.charAt(i)).substr(1).split('%');
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16));
    }

  return byteArray;
}

function asciiToBytes(str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++ )
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push( str.charCodeAt(i) & 0xFF );

  return byteArray;
}

function base64ToBytes(str) {
  return require("base64-js").toByteArray(str);
}

SlowBuffer.byteLength = function (str, encoding) {
  switch (encoding || "utf8") {
    case 'hex':
      return str.length / 2;

    case 'utf8':
    case 'utf-8':
      return utf8ToBytes(str).length;

    case 'ascii':
      return str.length;

    case 'base64':
      return base64ToBytes(str).length;

    default:
      throw new Error('Unknown encoding');
  }
};

function blitBuffer(src, dst, offset, length) {
  var pos, i = 0;
  while (i < length) {
    if ((i+offset >= dst.length) || (i >= src.length))
      break;

    dst[i + offset] = src[i];
    i++;
  }
  return i;
}

SlowBuffer.prototype.utf8Write = function (string, offset, length) {
  var bytes, pos;
  return SlowBuffer._charsWritten =  blitBuffer(utf8ToBytes(string), this, offset, length);
};

SlowBuffer.prototype.asciiWrite = function (string, offset, length) {
  var bytes, pos;
  return SlowBuffer._charsWritten =  blitBuffer(asciiToBytes(string), this, offset, length);
};

SlowBuffer.prototype.base64Write = function (string, offset, length) {
  var bytes, pos;
  return SlowBuffer._charsWritten = blitBuffer(base64ToBytes(string), this, offset, length);
};

SlowBuffer.prototype.base64Slice = function (start, end) {
  var bytes = Array.prototype.slice.apply(this, arguments)
  return require("base64-js").fromByteArray(bytes);
}

function decodeUtf8Char(str) {
  try {
    return decodeURIComponent(str);
  } catch (err) {
    return String.fromCharCode(0xFFFD); // UTF 8 invalid char
  }
}

SlowBuffer.prototype.utf8Slice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var res = "";
  var tmp = "";
  var i = 0;
  while (i < bytes.length) {
    if (bytes[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(bytes[i]);
      tmp = "";
    } else
      tmp += "%" + bytes[i].toString(16);

    i++;
  }

  return res + decodeUtf8Char(tmp);
}

SlowBuffer.prototype.asciiSlice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var ret = "";
  for (var i = 0; i < bytes.length; i++)
    ret += String.fromCharCode(bytes[i]);
  return ret;
}

SlowBuffer.prototype.inspect = function() {
  var out = [],
      len = this.length;
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i]);
    if (i == exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }
  return '<SlowBuffer ' + out.join(' ') + '>';
};


SlowBuffer.prototype.hexSlice = function(start, end) {
  var len = this.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var out = '';
  for (var i = start; i < end; i++) {
    out += toHex(this[i]);
  }
  return out;
};


SlowBuffer.prototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf8').toLowerCase();
  start = +start || 0;
  if (typeof end == 'undefined') end = this.length;

  // Fastpath empty strings
  if (+end == start) {
    return '';
  }

  switch (encoding) {
    case 'hex':
      return this.hexSlice(start, end);

    case 'utf8':
    case 'utf-8':
      return this.utf8Slice(start, end);

    case 'ascii':
      return this.asciiSlice(start, end);

    case 'binary':
      return this.binarySlice(start, end);

    case 'base64':
      return this.base64Slice(start, end);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Slice(start, end);

    default:
      throw new Error('Unknown encoding');
  }
};


SlowBuffer.prototype.hexWrite = function(string, offset, length) {
  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }

  // must be an even number of digits
  var strLen = string.length;
  if (strLen % 2) {
    throw new Error('Invalid hex string');
  }
  if (length > strLen / 2) {
    length = strLen / 2;
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16);
    if (isNaN(byte)) throw new Error('Invalid hex string');
    this[offset + i] = byte;
  }
  SlowBuffer._charsWritten = i * 2;
  return i;
};


SlowBuffer.prototype.write = function(string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length;
      length = undefined;
    }
  } else {  // legacy
    var swap = encoding;
    encoding = offset;
    offset = length;
    length = swap;
  }

  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase();

  switch (encoding) {
    case 'hex':
      return this.hexWrite(string, offset, length);

    case 'utf8':
    case 'utf-8':
      return this.utf8Write(string, offset, length);

    case 'ascii':
      return this.asciiWrite(string, offset, length);

    case 'binary':
      return this.binaryWrite(string, offset, length);

    case 'base64':
      return this.base64Write(string, offset, length);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Write(string, offset, length);

    default:
      throw new Error('Unknown encoding');
  }
};


// slice(start, end)
SlowBuffer.prototype.slice = function(start, end) {
  if (end === undefined) end = this.length;

  if (end > this.length) {
    throw new Error('oob');
  }
  if (start > end) {
    throw new Error('oob');
  }

  return new Buffer(this, end - start, +start);
};

SlowBuffer.prototype.copy = function(target, targetstart, sourcestart, sourceend) {
  var temp = [];
  for (var i=sourcestart; i<sourceend; i++) {
    assert.ok(typeof this[i] !== 'undefined', "copying undefined buffer bytes!");
    temp.push(this[i]);
  }

  for (var i=targetstart; i<targetstart+temp.length; i++) {
    target[i] = temp[i-targetstart];
  }
};

function coerce(length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length);
  return length < 0 ? 0 : length;
}


// Buffer

function Buffer(subject, encoding, offset) {
  if (!(this instanceof Buffer)) {
    return new Buffer(subject, encoding, offset);
  }

  var type;

  // Are we slicing?
  if (typeof offset === 'number') {
    this.length = coerce(encoding);
    this.parent = subject;
    this.offset = offset;
  } else {
    // Find the length
    switch (type = typeof subject) {
      case 'number':
        this.length = coerce(subject);
        break;

      case 'string':
        this.length = Buffer.byteLength(subject, encoding);
        break;

      case 'object': // Assume object is an array
        this.length = coerce(subject.length);
        break;

      default:
        throw new Error('First argument needs to be a number, ' +
                        'array or string.');
    }

    if (this.length > Buffer.poolSize) {
      // Big buffer, just alloc one.
      this.parent = new SlowBuffer(this.length);
      this.offset = 0;

    } else {
      // Small buffer.
      if (!pool || pool.length - pool.used < this.length) allocPool();
      this.parent = pool;
      this.offset = pool.used;
      pool.used += this.length;
    }

    // Treat array-ish objects as a byte array.
    if (isArrayIsh(subject)) {
      for (var i = 0; i < this.length; i++) {
        this.parent[i + this.offset] = subject[i];
      }
    } else if (type == 'string') {
      // We are a string
      this.length = this.write(subject, 0, encoding);
    }
  }

}

function isArrayIsh(subject) {
  return Array.isArray(subject) || Buffer.isBuffer(subject) ||
         subject && typeof subject === 'object' &&
         typeof subject.length === 'number';
}

exports.SlowBuffer = SlowBuffer;
exports.Buffer = Buffer;

Buffer.poolSize = 8 * 1024;
var pool;

function allocPool() {
  pool = new SlowBuffer(Buffer.poolSize);
  pool.used = 0;
}


// Static methods
Buffer.isBuffer = function isBuffer(b) {
  return b instanceof Buffer || b instanceof SlowBuffer;
};

Buffer.concat = function (list, totalLength) {
  if (!Array.isArray(list)) {
    throw new Error("Usage: Buffer.concat(list, [totalLength])\n \
      list should be an Array.");
  }

  if (list.length === 0) {
    return new Buffer(0);
  } else if (list.length === 1) {
    return list[0];
  }

  if (typeof totalLength !== 'number') {
    totalLength = 0;
    for (var i = 0; i < list.length; i++) {
      var buf = list[i];
      totalLength += buf.length;
    }
  }

  var buffer = new Buffer(totalLength);
  var pos = 0;
  for (var i = 0; i < list.length; i++) {
    var buf = list[i];
    buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer;
};

// Inspect
Buffer.prototype.inspect = function inspect() {
  var out = [],
      len = this.length;

  for (var i = 0; i < len; i++) {
    out[i] = toHex(this.parent[i + this.offset]);
    if (i == exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }

  return '<Buffer ' + out.join(' ') + '>';
};


Buffer.prototype.get = function get(i) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this.parent[this.offset + i];
};


Buffer.prototype.set = function set(i, v) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this.parent[this.offset + i] = v;
};


// write(string, offset = 0, length = buffer.length-offset, encoding = 'utf8')
Buffer.prototype.write = function(string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length;
      length = undefined;
    }
  } else {  // legacy
    var swap = encoding;
    encoding = offset;
    offset = length;
    length = swap;
  }

  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase();

  var ret;
  switch (encoding) {
    case 'hex':
      ret = this.parent.hexWrite(string, this.offset + offset, length);
      break;

    case 'utf8':
    case 'utf-8':
      ret = this.parent.utf8Write(string, this.offset + offset, length);
      break;

    case 'ascii':
      ret = this.parent.asciiWrite(string, this.offset + offset, length);
      break;

    case 'binary':
      ret = this.parent.binaryWrite(string, this.offset + offset, length);
      break;

    case 'base64':
      // Warning: maxLength not taken into account in base64Write
      ret = this.parent.base64Write(string, this.offset + offset, length);
      break;

    case 'ucs2':
    case 'ucs-2':
      ret = this.parent.ucs2Write(string, this.offset + offset, length);
      break;

    default:
      throw new Error('Unknown encoding');
  }

  Buffer._charsWritten = SlowBuffer._charsWritten;

  return ret;
};


// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf8').toLowerCase();

  if (typeof start == 'undefined' || start < 0) {
    start = 0;
  } else if (start > this.length) {
    start = this.length;
  }

  if (typeof end == 'undefined' || end > this.length) {
    end = this.length;
  } else if (end < 0) {
    end = 0;
  }

  start = start + this.offset;
  end = end + this.offset;

  switch (encoding) {
    case 'hex':
      return this.parent.hexSlice(start, end);

    case 'utf8':
    case 'utf-8':
      return this.parent.utf8Slice(start, end);

    case 'ascii':
      return this.parent.asciiSlice(start, end);

    case 'binary':
      return this.parent.binarySlice(start, end);

    case 'base64':
      return this.parent.base64Slice(start, end);

    case 'ucs2':
    case 'ucs-2':
      return this.parent.ucs2Slice(start, end);

    default:
      throw new Error('Unknown encoding');
  }
};


// byteLength
Buffer.byteLength = SlowBuffer.byteLength;


// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill(value, start, end) {
  value || (value = 0);
  start || (start = 0);
  end || (end = this.length);

  if (typeof value === 'string') {
    value = value.charCodeAt(0);
  }
  if (!(typeof value === 'number') || isNaN(value)) {
    throw new Error('value is not a number');
  }

  if (end < start) throw new Error('end < start');

  // Fill 0 bytes; we're done
  if (end === start) return 0;
  if (this.length == 0) return 0;

  if (start < 0 || start >= this.length) {
    throw new Error('start out of bounds');
  }

  if (end < 0 || end > this.length) {
    throw new Error('end out of bounds');
  }

  return this.parent.fill(value,
                          start + this.offset,
                          end + this.offset);
};


// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function(target, target_start, start, end) {
  var source = this;
  start || (start = 0);
  end || (end = this.length);
  target_start || (target_start = 0);

  if (end < start) throw new Error('sourceEnd < sourceStart');

  // Copy 0 bytes; we're done
  if (end === start) return 0;
  if (target.length == 0 || source.length == 0) return 0;

  if (target_start < 0 || target_start >= target.length) {
    throw new Error('targetStart out of bounds');
  }

  if (start < 0 || start >= source.length) {
    throw new Error('sourceStart out of bounds');
  }

  if (end < 0 || end > source.length) {
    throw new Error('sourceEnd out of bounds');
  }

  // Are we oob?
  if (end > this.length) {
    end = this.length;
  }

  if (target.length - target_start < end - start) {
    end = target.length - target_start + start;
  }

  return this.parent.copy(target.parent,
                          target_start + target.offset,
                          start + this.offset,
                          end + this.offset);
};


// slice(start, end)
Buffer.prototype.slice = function(start, end) {
  if (end === undefined) end = this.length;
  if (end > this.length) throw new Error('oob');
  if (start > end) throw new Error('oob');

  return new Buffer(this.parent, end - start, +start + this.offset);
};


// Legacy methods for backwards compatibility.

Buffer.prototype.utf8Slice = function(start, end) {
  return this.toString('utf8', start, end);
};

Buffer.prototype.binarySlice = function(start, end) {
  return this.toString('binary', start, end);
};

Buffer.prototype.asciiSlice = function(start, end) {
  return this.toString('ascii', start, end);
};

Buffer.prototype.utf8Write = function(string, offset) {
  return this.write(string, offset, 'utf8');
};

Buffer.prototype.binaryWrite = function(string, offset) {
  return this.write(string, offset, 'binary');
};

Buffer.prototype.asciiWrite = function(string, offset) {
  return this.write(string, offset, 'ascii');
};

Buffer.prototype.readUInt8 = function(offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  return buffer.parent[buffer.offset + offset];
};

function readUInt16(buffer, offset, isBigEndian, noAssert) {
  var val = 0;


  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (isBigEndian) {
    val = buffer.parent[buffer.offset + offset] << 8;
    val |= buffer.parent[buffer.offset + offset + 1];
  } else {
    val = buffer.parent[buffer.offset + offset];
    val |= buffer.parent[buffer.offset + offset + 1] << 8;
  }

  return val;
}

Buffer.prototype.readUInt16LE = function(offset, noAssert) {
  return readUInt16(this, offset, false, noAssert);
};

Buffer.prototype.readUInt16BE = function(offset, noAssert) {
  return readUInt16(this, offset, true, noAssert);
};

function readUInt32(buffer, offset, isBigEndian, noAssert) {
  var val = 0;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (isBigEndian) {
    val = buffer.parent[buffer.offset + offset + 1] << 16;
    val |= buffer.parent[buffer.offset + offset + 2] << 8;
    val |= buffer.parent[buffer.offset + offset + 3];
    val = val + (buffer.parent[buffer.offset + offset] << 24 >>> 0);
  } else {
    val = buffer.parent[buffer.offset + offset + 2] << 16;
    val |= buffer.parent[buffer.offset + offset + 1] << 8;
    val |= buffer.parent[buffer.offset + offset];
    val = val + (buffer.parent[buffer.offset + offset + 3] << 24 >>> 0);
  }

  return val;
}

Buffer.prototype.readUInt32LE = function(offset, noAssert) {
  return readUInt32(this, offset, false, noAssert);
};

Buffer.prototype.readUInt32BE = function(offset, noAssert) {
  return readUInt32(this, offset, true, noAssert);
};


/*
 * Signed integer types, yay team! A reminder on how two's complement actually
 * works. The first bit is the signed bit, i.e. tells us whether or not the
 * number should be positive or negative. If the two's complement value is
 * positive, then we're done, as it's equivalent to the unsigned representation.
 *
 * Now if the number is positive, you're pretty much done, you can just leverage
 * the unsigned translations and return those. Unfortunately, negative numbers
 * aren't quite that straightforward.
 *
 * At first glance, one might be inclined to use the traditional formula to
 * translate binary numbers between the positive and negative values in two's
 * complement. (Though it doesn't quite work for the most negative value)
 * Mainly:
 *  - invert all the bits
 *  - add one to the result
 *
 * Of course, this doesn't quite work in Javascript. Take for example the value
 * of -128. This could be represented in 16 bits (big-endian) as 0xff80. But of
 * course, Javascript will do the following:
 *
 * > ~0xff80
 * -65409
 *
 * Whoh there, Javascript, that's not quite right. But wait, according to
 * Javascript that's perfectly correct. When Javascript ends up seeing the
 * constant 0xff80, it has no notion that it is actually a signed number. It
 * assumes that we've input the unsigned value 0xff80. Thus, when it does the
 * binary negation, it casts it into a signed value, (positive 0xff80). Then
 * when you perform binary negation on that, it turns it into a negative number.
 *
 * Instead, we're going to have to use the following general formula, that works
 * in a rather Javascript friendly way. I'm glad we don't support this kind of
 * weird numbering scheme in the kernel.
 *
 * (BIT-MAX - (unsigned)val + 1) * -1
 *
 * The astute observer, may think that this doesn't make sense for 8-bit numbers
 * (really it isn't necessary for them). However, when you get 16-bit numbers,
 * you do. Let's go back to our prior example and see how this will look:
 *
 * (0xffff - 0xff80 + 1) * -1
 * (0x007f + 1) * -1
 * (0x0080) * -1
 */
Buffer.prototype.readInt8 = function(offset, noAssert) {
  var buffer = this;
  var neg;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  neg = buffer.parent[buffer.offset + offset] & 0x80;
  if (!neg) {
    return (buffer.parent[buffer.offset + offset]);
  }

  return ((0xff - buffer.parent[buffer.offset + offset] + 1) * -1);
};

function readInt16(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt16(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x8000;
  if (!neg) {
    return val;
  }

  return (0xffff - val + 1) * -1;
}

Buffer.prototype.readInt16LE = function(offset, noAssert) {
  return readInt16(this, offset, false, noAssert);
};

Buffer.prototype.readInt16BE = function(offset, noAssert) {
  return readInt16(this, offset, true, noAssert);
};

function readInt32(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt32(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x80000000;
  if (!neg) {
    return (val);
  }

  return (0xffffffff - val + 1) * -1;
}

Buffer.prototype.readInt32LE = function(offset, noAssert) {
  return readInt32(this, offset, false, noAssert);
};

Buffer.prototype.readInt32BE = function(offset, noAssert) {
  return readInt32(this, offset, true, noAssert);
};

function readFloat(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.readFloatLE = function(offset, noAssert) {
  return readFloat(this, offset, false, noAssert);
};

Buffer.prototype.readFloatBE = function(offset, noAssert) {
  return readFloat(this, offset, true, noAssert);
};

function readDouble(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 7 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.readDoubleLE = function(offset, noAssert) {
  return readDouble(this, offset, false, noAssert);
};

Buffer.prototype.readDoubleBE = function(offset, noAssert) {
  return readDouble(this, offset, true, noAssert);
};


/*
 * We have to make sure that the value is a valid integer. This means that it is
 * non-negative. It has no fractional component and that it does not exceed the
 * maximum allowed value.
 *
 *      value           The number to check for validity
 *
 *      max             The maximum value
 */
function verifuint(value, max) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value >= 0,
      'specified a negative value for writing an unsigned value');

  assert.ok(value <= max, 'value is larger than maximum value for type');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

Buffer.prototype.writeUInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xff);
  }

  buffer.parent[buffer.offset + offset] = value;
};

function writeUInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffff);
  }

  if (isBigEndian) {
    buffer.parent[buffer.offset + offset] = (value & 0xff00) >>> 8;
    buffer.parent[buffer.offset + offset + 1] = value & 0x00ff;
  } else {
    buffer.parent[buffer.offset + offset + 1] = (value & 0xff00) >>> 8;
    buffer.parent[buffer.offset + offset] = value & 0x00ff;
  }
}

Buffer.prototype.writeUInt16LE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt16BE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, true, noAssert);
};

function writeUInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffffffff);
  }

  if (isBigEndian) {
    buffer.parent[buffer.offset + offset] = (value >>> 24) & 0xff;
    buffer.parent[buffer.offset + offset + 1] = (value >>> 16) & 0xff;
    buffer.parent[buffer.offset + offset + 2] = (value >>> 8) & 0xff;
    buffer.parent[buffer.offset + offset + 3] = value & 0xff;
  } else {
    buffer.parent[buffer.offset + offset + 3] = (value >>> 24) & 0xff;
    buffer.parent[buffer.offset + offset + 2] = (value >>> 16) & 0xff;
    buffer.parent[buffer.offset + offset + 1] = (value >>> 8) & 0xff;
    buffer.parent[buffer.offset + offset] = value & 0xff;
  }
}

Buffer.prototype.writeUInt32LE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt32BE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, true, noAssert);
};


/*
 * We now move onto our friends in the signed number category. Unlike unsigned
 * numbers, we're going to have to worry a bit more about how we put values into
 * arrays. Since we are only worrying about signed 32-bit values, we're in
 * slightly better shape. Unfortunately, we really can't do our favorite binary
 * & in this system. It really seems to do the wrong thing. For example:
 *
 * > -32 & 0xff
 * 224
 *
 * What's happening above is really: 0xe0 & 0xff = 0xe0. However, the results of
 * this aren't treated as a signed number. Ultimately a bad thing.
 *
 * What we're going to want to do is basically create the unsigned equivalent of
 * our representation and pass that off to the wuint* functions. To do that
 * we're going to do the following:
 *
 *  - if the value is positive
 *      we can pass it directly off to the equivalent wuint
 *  - if the value is negative
 *      we do the following computation:
 *         mb + val + 1, where
 *         mb   is the maximum unsigned value in that byte size
 *         val  is the Javascript negative integer
 *
 *
 * As a concrete value, take -128. In signed 16 bits this would be 0xff80. If
 * you do out the computations:
 *
 * 0xffff - 128 + 1
 * 0xffff - 127
 * 0xff80
 *
 * You can then encode this value as the signed version. This is really rather
 * hacky, but it should work and get the job done which is our goal here.
 */

/*
 * A series of checks to make sure we actually have a signed 32-bit number
 */
function verifsint(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

function verifIEEE754(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');
}

Buffer.prototype.writeInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7f, -0x80);
  }

  if (value >= 0) {
    buffer.writeUInt8(value, offset, noAssert);
  } else {
    buffer.writeUInt8(0xff + value + 1, offset, noAssert);
  }
};

function writeInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fff, -0x8000);
  }

  if (value >= 0) {
    writeUInt16(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt16(buffer, 0xffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt16LE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt16BE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, true, noAssert);
};

function writeInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fffffff, -0x80000000);
  }

  if (value >= 0) {
    writeUInt32(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt32(buffer, 0xffffffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt32LE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt32BE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, true, noAssert);
};

function writeFloat(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.writeFloatLE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, false, noAssert);
};

Buffer.prototype.writeFloatBE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, true, noAssert);
};

function writeDouble(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 7 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.writeDoubleLE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, false, noAssert);
};

Buffer.prototype.writeDoubleBE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, true, noAssert);
};

SlowBuffer.prototype.readUInt8 = Buffer.prototype.readUInt8;
SlowBuffer.prototype.readUInt16LE = Buffer.prototype.readUInt16LE;
SlowBuffer.prototype.readUInt16BE = Buffer.prototype.readUInt16BE;
SlowBuffer.prototype.readUInt32LE = Buffer.prototype.readUInt32LE;
SlowBuffer.prototype.readUInt32BE = Buffer.prototype.readUInt32BE;
SlowBuffer.prototype.readInt8 = Buffer.prototype.readInt8;
SlowBuffer.prototype.readInt16LE = Buffer.prototype.readInt16LE;
SlowBuffer.prototype.readInt16BE = Buffer.prototype.readInt16BE;
SlowBuffer.prototype.readInt32LE = Buffer.prototype.readInt32LE;
SlowBuffer.prototype.readInt32BE = Buffer.prototype.readInt32BE;
SlowBuffer.prototype.readFloatLE = Buffer.prototype.readFloatLE;
SlowBuffer.prototype.readFloatBE = Buffer.prototype.readFloatBE;
SlowBuffer.prototype.readDoubleLE = Buffer.prototype.readDoubleLE;
SlowBuffer.prototype.readDoubleBE = Buffer.prototype.readDoubleBE;
SlowBuffer.prototype.writeUInt8 = Buffer.prototype.writeUInt8;
SlowBuffer.prototype.writeUInt16LE = Buffer.prototype.writeUInt16LE;
SlowBuffer.prototype.writeUInt16BE = Buffer.prototype.writeUInt16BE;
SlowBuffer.prototype.writeUInt32LE = Buffer.prototype.writeUInt32LE;
SlowBuffer.prototype.writeUInt32BE = Buffer.prototype.writeUInt32BE;
SlowBuffer.prototype.writeInt8 = Buffer.prototype.writeInt8;
SlowBuffer.prototype.writeInt16LE = Buffer.prototype.writeInt16LE;
SlowBuffer.prototype.writeInt16BE = Buffer.prototype.writeInt16BE;
SlowBuffer.prototype.writeInt32LE = Buffer.prototype.writeInt32LE;
SlowBuffer.prototype.writeInt32BE = Buffer.prototype.writeInt32BE;
SlowBuffer.prototype.writeFloatLE = Buffer.prototype.writeFloatLE;
SlowBuffer.prototype.writeFloatBE = Buffer.prototype.writeFloatBE;
SlowBuffer.prototype.writeDoubleLE = Buffer.prototype.writeDoubleLE;
SlowBuffer.prototype.writeDoubleBE = Buffer.prototype.writeDoubleBE;

})()
},{"assert":2,"./buffer_ieee754":7,"base64-js":9}],9:[function(require,module,exports){
(function (exports) {
	'use strict';

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	function b64ToByteArray(b64) {
		var i, j, l, tmp, placeHolders, arr;
	
		if (b64.length % 4 > 0) {
			throw 'Invalid string. Length must be a multiple of 4';
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		placeHolders = b64.indexOf('=');
		placeHolders = placeHolders > 0 ? b64.length - placeHolders : 0;

		// base64 is 4/3 + up to two characters of the original data
		arr = [];//new Uint8Array(b64.length * 3 / 4 - placeHolders);

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length;

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (lookup.indexOf(b64[i]) << 18) | (lookup.indexOf(b64[i + 1]) << 12) | (lookup.indexOf(b64[i + 2]) << 6) | lookup.indexOf(b64[i + 3]);
			arr.push((tmp & 0xFF0000) >> 16);
			arr.push((tmp & 0xFF00) >> 8);
			arr.push(tmp & 0xFF);
		}

		if (placeHolders === 2) {
			tmp = (lookup.indexOf(b64[i]) << 2) | (lookup.indexOf(b64[i + 1]) >> 4);
			arr.push(tmp & 0xFF);
		} else if (placeHolders === 1) {
			tmp = (lookup.indexOf(b64[i]) << 10) | (lookup.indexOf(b64[i + 1]) << 4) | (lookup.indexOf(b64[i + 2]) >> 2);
			arr.push((tmp >> 8) & 0xFF);
			arr.push(tmp & 0xFF);
		}

		return arr;
	}

	function uint8ToBase64(uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length;

		function tripletToBase64 (num) {
			return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
		};

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
			output += tripletToBase64(temp);
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1];
				output += lookup[temp >> 2];
				output += lookup[(temp << 4) & 0x3F];
				output += '==';
				break;
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
				output += lookup[temp >> 10];
				output += lookup[(temp >> 4) & 0x3F];
				output += lookup[(temp << 2) & 0x3F];
				output += '=';
				break;
		}

		return output;
	}

	module.exports.toByteArray = b64ToByteArray;
	module.exports.fromByteArray = uint8ToBase64;
}());

},{}]},{},[])
;;module.exports=require("buffer-browserify")

},{}],14:[function(require,module,exports){
(function(process,Buffer){/* Copyright (c) 2013 Rod Vagg, MIT License */

var AbstractIterator     = require('./abstract-iterator')
  , AbstractChainedBatch = require('./abstract-chained-batch')

function AbstractLevelDOWN (location) {
  if (!arguments.length || location === undefined)
    throw new Error('constructor requires at least a location argument')

  if (typeof location != 'string')
    throw new Error('constructor requires a location string argument')

  this.location = location
}

AbstractLevelDOWN.prototype.open = function (options, callback) {
  if (typeof options == 'function')
    callback = options
  if (typeof callback != 'function')
    throw new Error('open() requires a callback argument')
  if (typeof options != 'object')
    options = {}

  if (typeof this._open == 'function')
    return this._open(options, callback)

  process.nextTick(callback)
}

AbstractLevelDOWN.prototype.close = function (callback) {
  if (typeof callback != 'function')
    throw new Error('close() requires a callback argument')

  if (typeof this._close == 'function')
    return this._close(callback)

  process.nextTick(callback)
}

AbstractLevelDOWN.prototype.get = function (key, options, callback) {
  if (typeof options == 'function')
    callback = options
  if (typeof callback != 'function')
    throw new Error('get() requires a callback argument')
  var err = this._checkKeyValue(key, 'key', this._isBuffer)
  if (err) return callback(err)
  if (!this._isBuffer(key)) key = String(key)
  if (typeof options != 'object')
    options = {}

  if (typeof this._get == 'function')
    return this._get(key, options, callback)

  process.nextTick(callback.bind(null, new Error('NotFound')))
}

AbstractLevelDOWN.prototype.put = function (key, value, options, callback) {
  if (typeof options == 'function')
    callback = options
  if (typeof callback != 'function')
    throw new Error('put() requires a callback argument')
  var err = this._checkKeyValue(key, 'key', this._isBuffer)
  if (err) return callback(err)
  err = this._checkKeyValue(value, 'value', this._isBuffer)
  if (err) return callback(err)
  if (!this._isBuffer(key)) key = String(key)
  // coerce value to string in node, dont touch it in browser
  // (indexeddb can store any JS type)
  if (!this._isBuffer(value) && !process.browser) value = String(value)
  if (typeof options != 'object')
    options = {}
  if (typeof this._put == 'function')
    return this._put(key, value, options, callback)

  process.nextTick(callback)
}

AbstractLevelDOWN.prototype.del = function (key, options, callback) {
  if (typeof options == 'function')
    callback = options
  if (typeof callback != 'function')
    throw new Error('del() requires a callback argument')
  var err = this._checkKeyValue(key, 'key', this._isBuffer)
  if (err) return callback(err)
  if (!this._isBuffer(key)) key = String(key)
  if (typeof options != 'object')
    options = {}


  if (typeof this._del == 'function')
    return this._del(key, options, callback)

  process.nextTick(callback)
}

AbstractLevelDOWN.prototype.batch = function (array, options, callback) {
  if (!arguments.length)
    return this._chainedBatch()

  if (typeof options == 'function')
    callback = options
  if (typeof callback != 'function')
    throw new Error('batch(array) requires a callback argument')
  if (!Array.isArray(array))
    return callback(new Error('batch(array) requires an array argument'))
  if (typeof options != 'object')
    options = {}

  var i = 0
    , l = array.length
    , e
    , err

  for (; i < l; i++) {
    e = array[i]
    if (typeof e != 'object') continue;

    err = this._checkKeyValue(e.type, 'type', this._isBuffer)
    if (err) return callback(err)

    err = this._checkKeyValue(e.key, 'key', this._isBuffer)
    if (err) return callback(err)

    if (e.type == 'put') {
      err = this._checkKeyValue(e.value, 'value', this._isBuffer)
      if (err) return callback(err)
    }
  }

  if (typeof this._batch == 'function')
    return this._batch(array, options, callback)

  process.nextTick(callback)
}

AbstractLevelDOWN.prototype.approximateSize = function (start, end, callback) {
  if (start == null || end == null || typeof start == 'function' || typeof end == 'function')
    throw new Error('approximateSize() requires valid `start`, `end` and `callback` arguments')
  if (typeof callback != 'function')
    throw new Error('approximateSize() requires a callback argument')

  if (!this._isBuffer(start)) start = String(start)
  if (!this._isBuffer(end)) end = String(end)
  if (typeof this._approximateSize == 'function')
    return this._approximateSize(start, end, callback)

  process.nextTick(callback.bind(null, null, 0))
}

AbstractLevelDOWN.prototype.iterator = function (options) {
  if (typeof options != 'object')
    options = {}

  if (typeof this._iterator == 'function')
    return this._iterator(options)

  return new AbstractIterator(this)
}

AbstractLevelDOWN.prototype._chainedBatch = function () {
  return new AbstractChainedBatch(this)
}

AbstractLevelDOWN.prototype._isBuffer = function (obj) {
  return Buffer.isBuffer(obj)
}

AbstractLevelDOWN.prototype._checkKeyValue = function (obj, type) {
  if (obj === null || obj === undefined)
    return new Error(type + ' cannot be `null` or `undefined`')
  if (obj === null || obj === undefined)
    return new Error(type + ' cannot be `null` or `undefined`')
  if (this._isBuffer(obj)) {
    if (obj.length === 0)
      return new Error(type + ' cannot be an empty Buffer')
  } else if (String(obj) === '')
    return new Error(type + ' cannot be an empty String')
}

module.exports.AbstractLevelDOWN = AbstractLevelDOWN
module.exports.AbstractIterator  = AbstractIterator
})(require("__browserify_process"),require("__browserify_buffer").Buffer)
},{"./abstract-chained-batch":19,"./abstract-iterator":20,"__browserify_process":9,"__browserify_buffer":18}],21:[function(require,module,exports){
/** @license zlib.js 2012 - imaya [ https://github.com/imaya/zlib.js ] The MIT License */
(function() {'use strict';var aa=this;function g(a,b,d){a=a.split(".");d=d||aa;!(a[0]in d)&&d.execScript&&d.execScript("var "+a[0]);for(var c;a.length&&(c=a.shift());)!a.length&&void 0!==b?d[c]=b:d=d[c]?d[c]:d[c]={}}Math.floor(2147483648*Math.random()).toString(36);var j="undefined"!==typeof Uint8Array&&"undefined"!==typeof Uint16Array&&"undefined"!==typeof Uint32Array;var ba=new (j?Uint8Array:Array)(256),l;for(l=0;256>l;++l){for(var ca=ba,da=l,n=l,o=n,q=7,n=n>>>1;n;n>>>=1)o<<=1,o|=n&1,--q;ca[da]=(o<<q&255)>>>0};var ea=[0,1996959894,3993919788,2567524794,124634137,1886057615,3915621685,2657392035,249268274,2044508324,3772115230,2547177864,162941995,2125561021,3887607047,2428444049,498536548,1789927666,4089016648,2227061214,450548861,1843258603,4107580753,2211677639,325883990,1684777152,4251122042,2321926636,335633487,1661365465,4195302755,2366115317,997073096,1281953886,3579855332,2724688242,1006888145,1258607687,3524101629,2768942443,901097722,1119000684,3686517206,2898065728,853044451,1172266101,3705015759,
2882616665,651767980,1373503546,3369554304,3218104598,565507253,1454621731,3485111705,3099436303,671266974,1594198024,3322730930,2970347812,795835527,1483230225,3244367275,3060149565,1994146192,31158534,2563907772,4023717930,1907459465,112637215,2680153253,3904427059,2013776290,251722036,2517215374,3775830040,2137656763,141376813,2439277719,3865271297,1802195444,476864866,2238001368,4066508878,1812370925,453092731,2181625025,4111451223,1706088902,314042704,2344532202,4240017532,1658658271,366619977,
2362670323,4224994405,1303535960,984961486,2747007092,3569037538,1256170817,1037604311,2765210733,3554079995,1131014506,879679996,2909243462,3663771856,1141124467,855842277,2852801631,3708648649,1342533948,654459306,3188396048,3373015174,1466479909,544179635,3110523913,3462522015,1591671054,702138776,2966460450,3352799412,1504918807,783551873,3082640443,3233442989,3988292384,2596254646,62317068,1957810842,3939845945,2647816111,81470997,1943803523,3814918930,2489596804,225274430,2053790376,3826175755,
2466906013,167816743,2097651377,4027552580,2265490386,503444072,1762050814,4150417245,2154129355,426522225,1852507879,4275313526,2312317920,282753626,1742555852,4189708143,2394877945,397917763,1622183637,3604390888,2714866558,953729732,1340076626,3518719985,2797360999,1068828381,1219638859,3624741850,2936675148,906185462,1090812512,3747672003,2825379669,829329135,1181335161,3412177804,3160834842,628085408,1382605366,3423369109,3138078467,570562233,1426400815,3317316542,2998733608,733239954,1555261956,
3268935591,3050360625,752459403,1541320221,2607071920,3965973030,1969922972,40735498,2617837225,3943577151,1913087877,83908371,2512341634,3803740692,2075208622,213261112,2463272603,3855990285,2094854071,198958881,2262029012,4057260610,1759359992,534414190,2176718541,4139329115,1873836001,414664567,2282248934,4279200368,1711684554,285281116,2405801727,4167216745,1634467795,376229701,2685067896,3608007406,1308918612,956543938,2808555105,3495958263,1231636301,1047427035,2932959818,3654703836,1088359270,
936918E3,2847714899,3736837829,1202900863,817233897,3183342108,3401237130,1404277552,615818150,3134207493,3453421203,1423857449,601450431,3009837614,3294710456,1567103746,711928724,3020668471,3272380065,1510334235,755167117];j&&new Uint32Array(ea);function r(a){var b=a.length,d=0,c=Number.POSITIVE_INFINITY,f,e,h,i,p,w,x,k,m;for(k=0;k<b;++k)a[k]>d&&(d=a[k]),a[k]<c&&(c=a[k]);f=1<<d;e=new (j?Uint32Array:Array)(f);h=1;i=0;for(p=2;h<=d;){for(k=0;k<b;++k)if(a[k]===h){w=0;x=i;for(m=0;m<h;++m)w=w<<1|x&1,x>>=1;for(m=w;m<f;m+=p)e[m]=h<<16|k;++i}++h;i<<=1;p<<=1}return[e,d,c]};var s=[],t;for(t=0;288>t;t++)switch(!0){case 143>=t:s.push([t+48,8]);break;case 255>=t:s.push([t-144+400,9]);break;case 279>=t:s.push([t-256+0,7]);break;case 287>=t:s.push([t-280+192,8]);break;default:throw"invalid literal: "+t;}function u(a,b){this.length=a;this.z=b}
function fa(a){switch(!0){case 3===a:return[257,a-3,0];case 4===a:return[258,a-4,0];case 5===a:return[259,a-5,0];case 6===a:return[260,a-6,0];case 7===a:return[261,a-7,0];case 8===a:return[262,a-8,0];case 9===a:return[263,a-9,0];case 10===a:return[264,a-10,0];case 12>=a:return[265,a-11,1];case 14>=a:return[266,a-13,1];case 16>=a:return[267,a-15,1];case 18>=a:return[268,a-17,1];case 22>=a:return[269,a-19,2];case 26>=a:return[270,a-23,2];case 30>=a:return[271,a-27,2];case 34>=a:return[272,a-31,2];case 42>=
a:return[273,a-35,3];case 50>=a:return[274,a-43,3];case 58>=a:return[275,a-51,3];case 66>=a:return[276,a-59,3];case 82>=a:return[277,a-67,4];case 98>=a:return[278,a-83,4];case 114>=a:return[279,a-99,4];case 130>=a:return[280,a-115,4];case 162>=a:return[281,a-131,5];case 194>=a:return[282,a-163,5];case 226>=a:return[283,a-195,5];case 257>=a:return[284,a-227,5];case 258===a:return[285,a-258,0];default:throw"invalid length: "+a;}}var v=[],y,z;for(y=3;258>=y;y++)z=fa(y),v[y]=z[2]<<24|z[1]<<16|z[0];
var ga=j?new Uint32Array(v):v;
u.prototype.D=function(a){switch(!0){case 1===a:a=[0,a-1,0];break;case 2===a:a=[1,a-2,0];break;case 3===a:a=[2,a-3,0];break;case 4===a:a=[3,a-4,0];break;case 6>=a:a=[4,a-5,1];break;case 8>=a:a=[5,a-7,1];break;case 12>=a:a=[6,a-9,2];break;case 16>=a:a=[7,a-13,2];break;case 24>=a:a=[8,a-17,3];break;case 32>=a:a=[9,a-25,3];break;case 48>=a:a=[10,a-33,4];break;case 64>=a:a=[11,a-49,4];break;case 96>=a:a=[12,a-65,5];break;case 128>=a:a=[13,a-97,5];break;case 192>=a:a=[14,a-129,6];break;case 256>=a:a=[15,
a-193,6];break;case 384>=a:a=[16,a-257,7];break;case 512>=a:a=[17,a-385,7];break;case 768>=a:a=[18,a-513,8];break;case 1024>=a:a=[19,a-769,8];break;case 1536>=a:a=[20,a-1025,9];break;case 2048>=a:a=[21,a-1537,9];break;case 3072>=a:a=[22,a-2049,10];break;case 4096>=a:a=[23,a-3073,10];break;case 6144>=a:a=[24,a-4097,11];break;case 8192>=a:a=[25,a-6145,11];break;case 12288>=a:a=[26,a-8193,12];break;case 16384>=a:a=[27,a-12289,12];break;case 24576>=a:a=[28,a-16385,13];break;case 32768>=a:a=[29,a-24577,
13];break;default:throw"invalid distance";}return a};u.prototype.K=function(){var a=this.z,b=[],d=0,c;c=ga[this.length];b[d++]=c&65535;b[d++]=c>>16&255;b[d++]=c>>24;c=this.D(a);b[d++]=c[0];b[d++]=c[1];b[d++]=c[2];return b};function A(a,b){this.i=[];this.j=32768;this.e=this.g=this.a=this.n=0;this.input=j?new Uint8Array(a):a;this.o=!1;this.k=B;this.t=!1;if(b||!(b={}))if(b.index&&(this.a=b.index),b.bufferSize&&(this.j=b.bufferSize),b.bufferType&&(this.k=b.bufferType),b.resize)this.t=b.resize;switch(this.k){case C:this.b=32768;this.c=new (j?Uint8Array:Array)(32768+this.j+258);break;case B:this.b=0;this.c=new (j?Uint8Array:Array)(this.j);this.f=this.C;this.p=this.A;this.l=this.B;break;default:throw Error("invalid inflate mode");
}}var C=0,B=1,D={v:C,u:B};A.prototype.m=function(){for(;!this.o;)this.F();return this.p()};
var E=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],F=j?new Uint16Array(E):E,G=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,258,258],H=j?new Uint16Array(G):G,I=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0],J=j?new Uint8Array(I):I,K=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],L=j?new Uint16Array(K):K,M=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,
13],N=j?new Uint8Array(M):M,O=new (j?Uint8Array:Array)(288),P,Q;P=0;for(Q=O.length;P<Q;++P)O[P]=143>=P?8:255>=P?9:279>=P?7:8;var ha=r(O),R=new (j?Uint8Array:Array)(30),S,T;S=0;for(T=R.length;S<T;++S)R[S]=5;var ia=r(R);A.prototype.F=function(){var a=this.d(3);a&1&&(this.o=!0);a>>>=1;switch(a){case 0:this.I();break;case 1:this.H();break;case 2:this.G();break;default:throw Error("unknown BTYPE: "+a);}};
A.prototype.d=function(a){for(var b=this.g,d=this.e,c=this.input,f=this.a,e;d<a;){e=c[f++];if(void 0===e)throw Error("input buffer is broken");b|=e<<d;d+=8}e=b&(1<<a)-1;this.g=b>>>a;this.e=d-a;this.a=f;return e};A.prototype.h=function(a){for(var b=this.g,d=this.e,c=this.input,f=this.a,e=a[0],a=a[1],h;d<a;){h=c[f++];if(void 0===h)throw Error("input buffer is broken");b|=h<<d;d+=8}c=e[b&(1<<a)-1];e=c>>>16;this.g=b>>e;this.e=d-e;this.a=f;return c&65535};
A.prototype.I=function(){var a=this.input,b=this.a,d=this.c,c=this.b,f,e,h,i=d.length;this.e=this.g=0;f=a[b++];if(void 0===f)throw Error("invalid uncompressed block header: LEN (first byte)");e=f;f=a[b++];if(void 0===f)throw Error("invalid uncompressed block header: LEN (second byte)");e|=f<<8;f=a[b++];if(void 0===f)throw Error("invalid uncompressed block header: NLEN (first byte)");h=f;f=a[b++];if(void 0===f)throw Error("invalid uncompressed block header: NLEN (second byte)");if(e===~(h|f<<8))throw Error("invalid uncompressed block header: length verify");
if(b+e>a.length)throw Error("input buffer is broken");switch(this.k){case C:for(;c+e>d.length;){f=i-c;e-=f;if(j)d.set(a.subarray(b,b+f),c),c+=f,b+=f;else for(;f--;)d[c++]=a[b++];this.b=c;d=this.f();c=this.b}break;case B:for(;c+e>d.length;)d=this.f({r:2});break;default:throw Error("invalid inflate mode");}if(j)d.set(a.subarray(b,b+e),c),c+=e,b+=e;else for(;e--;)d[c++]=a[b++];this.a=b;this.b=c;this.c=d};A.prototype.H=function(){this.l(ha,ia)};
A.prototype.G=function(){function a(a,d,c){var b,e,f;for(f=0;f<a;)switch(b=this.h(d),b){case 16:for(b=3+this.d(2);b--;)c[f++]=e;break;case 17:for(b=3+this.d(3);b--;)c[f++]=0;e=0;break;case 18:for(b=11+this.d(7);b--;)c[f++]=0;e=0;break;default:e=c[f++]=b}return c}var b=this.d(5)+257,d=this.d(5)+1,c=this.d(4)+4,f=new (j?Uint8Array:Array)(F.length),e;for(e=0;e<c;++e)f[F[e]]=this.d(3);c=r(f);f=new (j?Uint8Array:Array)(b);e=new (j?Uint8Array:Array)(d);this.l(r(a.call(this,b,c,f)),r(a.call(this,d,c,e)))};
A.prototype.l=function(a,b){var d=this.c,c=this.b;this.q=a;for(var f=d.length-258,e,h,i;256!==(e=this.h(a));)if(256>e)c>=f&&(this.b=c,d=this.f(),c=this.b),d[c++]=e;else{e-=257;i=H[e];0<J[e]&&(i+=this.d(J[e]));e=this.h(b);h=L[e];0<N[e]&&(h+=this.d(N[e]));c>=f&&(this.b=c,d=this.f(),c=this.b);for(;i--;)d[c]=d[c++-h]}for(;8<=this.e;)this.e-=8,this.a--;this.b=c};
A.prototype.B=function(a,b){var d=this.c,c=this.b;this.q=a;for(var f=d.length,e,h,i;256!==(e=this.h(a));)if(256>e)c>=f&&(d=this.f(),f=d.length),d[c++]=e;else{e-=257;i=H[e];0<J[e]&&(i+=this.d(J[e]));e=this.h(b);h=L[e];0<N[e]&&(h+=this.d(N[e]));c+i>f&&(d=this.f(),f=d.length);for(;i--;)d[c]=d[c++-h]}for(;8<=this.e;)this.e-=8,this.a--;this.b=c};
A.prototype.f=function(){var a=new (j?Uint8Array:Array)(this.b-32768),b=this.b-32768,d,c,f=this.c;if(j)a.set(f.subarray(32768,a.length));else{d=0;for(c=a.length;d<c;++d)a[d]=f[d+32768]}this.i.push(a);this.n+=a.length;if(j)f.set(f.subarray(b,b+32768));else for(d=0;32768>d;++d)f[d]=f[b+d];this.b=32768;return f};
A.prototype.C=function(a){var b=this.input.length/this.a+1|0,d=this.input,c=this.c;a&&("number"===typeof a.r&&(b=a.r),"number"===typeof a.w&&(b+=a.w));2>b?(a=(d.length-this.a)/this.q[2],a=258*(a/2)|0,a=a<c.length?c.length+a:c.length<<1):a=c.length*b;j?(a=new Uint8Array(a),a.set(c)):a=c;return this.c=a};
A.prototype.p=function(){var a=0,b=this.c,d=this.i,c,f=new (j?Uint8Array:Array)(this.n+(this.b-32768)),e,h,i,p;if(0===d.length)return j?this.c.subarray(32768,this.b):this.c.slice(32768,this.b);e=0;for(h=d.length;e<h;++e){c=d[e];i=0;for(p=c.length;i<p;++i)f[a++]=c[i]}e=32768;for(h=this.b;e<h;++e)f[a++]=b[e];this.i=[];return this.buffer=f};
A.prototype.A=function(){var a,b=this.b;j?this.t?(a=new Uint8Array(b),a.set(this.c.subarray(0,b))):a=this.c.subarray(0,b):(this.c.length>b&&(this.c.length=b),a=this.c);return this.buffer=a};function U(a,b){var d,c;this.input=a;this.a=0;if(b||!(b={}))if(b.index&&(this.a=b.index),b.verify)this.J=b.verify;d=a[this.a++];c=a[this.a++];switch(d&15){case V:this.method=V;break;default:throw Error("unsupported compression method");}if(0!==((d<<8)+c)%31)throw Error("invalid fcheck flag:"+((d<<8)+c)%31);if(c&32)throw Error("fdict flag is not supported");this.s=new A(a,{index:this.a,bufferSize:b.bufferSize,bufferType:b.bufferType,resize:b.resize})}
U.prototype.m=function(){var a=this.input,b;b=this.s.m();this.a=this.s.a;if(this.J){var a=a[this.a++]<<24|a[this.a++]<<16|a[this.a++]<<8|a[this.a++],d=b;if("string"===typeof d){var d=d.split(""),c,f;c=0;for(f=d.length;c<f;c++)d[c]=(d[c].charCodeAt(0)&255)>>>0}c=1;f=0;for(var e=d.length,h,i=0;0<e;){h=1024<e?1024:e;e-=h;do c+=d[i++],f+=c;while(--h);c%=65521;f%=65521}if(a!==(f<<16|c)>>>0)throw Error("invalid adler-32 checksum");}return b};g("Zlib.Inflate",U,void 0);g("Zlib.Inflate.BufferType",D,void 0);
D.ADAPTIVE=D.u;D.BLOCK=D.v;g("Zlib.Inflate.prototype.decompress",U.prototype.m,void 0);var ja=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];j&&new Uint16Array(ja);var ka=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,258,258];j&&new Uint16Array(ka);var la=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0];j&&new Uint8Array(la);var ma=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];j&&new Uint16Array(ma);
var na=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];j&&new Uint8Array(na);var W=new (j?Uint8Array:Array)(288),X,Y;X=0;for(Y=W.length;X<Y;++X)W[X]=143>=X?8:255>=X?9:279>=X?7:8;r(W);var Z=new (j?Uint8Array:Array)(30),$,oa;$=0;for(oa=Z.length;$<oa;++$)Z[$]=5;r(Z);var V=8;}).call(module.exports);

},{}],22:[function(require,module,exports){
(function(process,Buffer){/** @license zlib.js 2012 - imaya [ https://github.com/imaya/zlib.js ] The MIT License */
(function() {'use strict';function m(a){throw a;}var p=void 0,u=!0;var A="undefined"!==typeof Uint8Array&&"undefined"!==typeof Uint16Array&&"undefined"!==typeof Uint32Array;function I(a,c){this.index="number"===typeof c?c:0;this.bitindex=0;this.buffer=a instanceof(A?Uint8Array:Array)?a:new (A?Uint8Array:Array)(32768);2*this.buffer.length<=this.index&&m(Error("invalid index"));this.buffer.length<=this.index&&this.expandBuffer()}I.prototype.expandBuffer=function(){var a=this.buffer,c,b=a.length,d=new (A?Uint8Array:Array)(b<<1);if(A)d.set(a);else for(c=0;c<b;++c)d[c]=a[c];return this.buffer=d};
I.prototype.writeBits=function(a,c,b){var d=this.buffer,f=this.index,e=this.bitindex,g=d[f],h;b&&1<c&&(a=8<c?(K[a&255]<<24|K[a>>>8&255]<<16|K[a>>>16&255]<<8|K[a>>>24&255])>>32-c:K[a]>>8-c);if(8>c+e)g=g<<c|a,e+=c;else for(h=0;h<c;++h)g=g<<1|a>>c-h-1&1,8===++e&&(e=0,d[f++]=K[g],g=0,f===d.length&&(d=this.expandBuffer()));d[f]=g;this.buffer=d;this.bitindex=e;this.index=f};
I.prototype.finish=function(){var a=this.buffer,c=this.index,b;0<this.bitindex&&(a[c]<<=8-this.bitindex,a[c]=K[a[c]],c++);A?b=a.subarray(0,c):(a.length=c,b=a);return b};var aa=new (A?Uint8Array:Array)(256),M;for(M=0;256>M;++M){for(var R=M,ba=R,ca=7,R=R>>>1;R;R>>>=1)ba<<=1,ba|=R&1,--ca;aa[M]=(ba<<ca&255)>>>0}var K=aa;function ha(a,c,b){var d,f="number"===typeof c?c:c=0,e="number"===typeof b?b:a.length;d=-1;for(f=e&7;f--;++c)d=d>>>8^S[(d^a[c])&255];for(f=e>>3;f--;c+=8)d=d>>>8^S[(d^a[c])&255],d=d>>>8^S[(d^a[c+1])&255],d=d>>>8^S[(d^a[c+2])&255],d=d>>>8^S[(d^a[c+3])&255],d=d>>>8^S[(d^a[c+4])&255],d=d>>>8^S[(d^a[c+5])&255],d=d>>>8^S[(d^a[c+6])&255],d=d>>>8^S[(d^a[c+7])&255];return(d^4294967295)>>>0}
var S,ia=[0,1996959894,3993919788,2567524794,124634137,1886057615,3915621685,2657392035,249268274,2044508324,3772115230,2547177864,162941995,2125561021,3887607047,2428444049,498536548,1789927666,4089016648,2227061214,450548861,1843258603,4107580753,2211677639,325883990,1684777152,4251122042,2321926636,335633487,1661365465,4195302755,2366115317,997073096,1281953886,3579855332,2724688242,1006888145,1258607687,3524101629,2768942443,901097722,1119000684,3686517206,2898065728,853044451,1172266101,3705015759,
2882616665,651767980,1373503546,3369554304,3218104598,565507253,1454621731,3485111705,3099436303,671266974,1594198024,3322730930,2970347812,795835527,1483230225,3244367275,3060149565,1994146192,31158534,2563907772,4023717930,1907459465,112637215,2680153253,3904427059,2013776290,251722036,2517215374,3775830040,2137656763,141376813,2439277719,3865271297,1802195444,476864866,2238001368,4066508878,1812370925,453092731,2181625025,4111451223,1706088902,314042704,2344532202,4240017532,1658658271,366619977,
2362670323,4224994405,1303535960,984961486,2747007092,3569037538,1256170817,1037604311,2765210733,3554079995,1131014506,879679996,2909243462,3663771856,1141124467,855842277,2852801631,3708648649,1342533948,654459306,3188396048,3373015174,1466479909,544179635,3110523913,3462522015,1591671054,702138776,2966460450,3352799412,1504918807,783551873,3082640443,3233442989,3988292384,2596254646,62317068,1957810842,3939845945,2647816111,81470997,1943803523,3814918930,2489596804,225274430,2053790376,3826175755,
2466906013,167816743,2097651377,4027552580,2265490386,503444072,1762050814,4150417245,2154129355,426522225,1852507879,4275313526,2312317920,282753626,1742555852,4189708143,2394877945,397917763,1622183637,3604390888,2714866558,953729732,1340076626,3518719985,2797360999,1068828381,1219638859,3624741850,2936675148,906185462,1090812512,3747672003,2825379669,829329135,1181335161,3412177804,3160834842,628085408,1382605366,3423369109,3138078467,570562233,1426400815,3317316542,2998733608,733239954,1555261956,
3268935591,3050360625,752459403,1541320221,2607071920,3965973030,1969922972,40735498,2617837225,3943577151,1913087877,83908371,2512341634,3803740692,2075208622,213261112,2463272603,3855990285,2094854071,198958881,2262029012,4057260610,1759359992,534414190,2176718541,4139329115,1873836001,414664567,2282248934,4279200368,1711684554,285281116,2405801727,4167216745,1634467795,376229701,2685067896,3608007406,1308918612,956543938,2808555105,3495958263,1231636301,1047427035,2932959818,3654703836,1088359270,
936918E3,2847714899,3736837829,1202900863,817233897,3183342108,3401237130,1404277552,615818150,3134207493,3453421203,1423857449,601450431,3009837614,3294710456,1567103746,711928724,3020668471,3272380065,1510334235,755167117];S=A?new Uint32Array(ia):ia;function ja(){}ja.prototype.getName=function(){return this.name};ja.prototype.getData=function(){return this.data};ja.prototype.getMtime=function(){return this.mtime};function ka(a){this.buffer=new (A?Uint16Array:Array)(2*a);this.length=0}ka.prototype.getParent=function(a){return 2*((a-2)/4|0)};ka.prototype.push=function(a,c){var b,d,f=this.buffer,e;b=this.length;f[this.length++]=c;for(f[this.length++]=a;0<b;)if(d=this.getParent(b),f[b]>f[d])e=f[b],f[b]=f[d],f[d]=e,e=f[b+1],f[b+1]=f[d+1],f[d+1]=e,b=d;else break;return this.length};
ka.prototype.pop=function(){var a,c,b=this.buffer,d,f,e;c=b[0];a=b[1];this.length-=2;b[0]=b[this.length];b[1]=b[this.length+1];for(e=0;;){f=2*e+2;if(f>=this.length)break;f+2<this.length&&b[f+2]>b[f]&&(f+=2);if(b[f]>b[e])d=b[e],b[e]=b[f],b[f]=d,d=b[e+1],b[e+1]=b[f+1],b[f+1]=d;else break;e=f}return{index:a,value:c,length:this.length}};function T(a){var c=a.length,b=0,d=Number.POSITIVE_INFINITY,f,e,g,h,j,i,r,l,k;for(l=0;l<c;++l)a[l]>b&&(b=a[l]),a[l]<d&&(d=a[l]);f=1<<b;e=new (A?Uint32Array:Array)(f);g=1;h=0;for(j=2;g<=b;){for(l=0;l<c;++l)if(a[l]===g){i=0;r=h;for(k=0;k<g;++k)i=i<<1|r&1,r>>=1;for(k=i;k<f;k+=j)e[k]=g<<16|l;++h}++g;h<<=1;j<<=1}return[e,b,d]};function la(a,c){this.compressionType=ma;this.lazy=0;this.input=a;this.op=0;c&&(c.lazy&&(this.lazy=c.lazy),"number"===typeof c.compressionType&&(this.compressionType=c.compressionType),c.outputBuffer&&(this.output=A&&c.outputBuffer instanceof Array?new Uint8Array(c.outputBuffer):c.outputBuffer),"number"===typeof c.outputIndex&&(this.op=c.outputIndex));this.output||(this.output=new (A?Uint8Array:Array)(32768))}var ma=2,pa={NONE:0,FIXED:1,DYNAMIC:ma,RESERVED:3},qa=[],U;
for(U=0;288>U;U++)switch(u){case 143>=U:qa.push([U+48,8]);break;case 255>=U:qa.push([U-144+400,9]);break;case 279>=U:qa.push([U-256+0,7]);break;case 287>=U:qa.push([U-280+192,8]);break;default:m("invalid literal: "+U)}
la.prototype.compress=function(){var a,c,b,d,f=this.input;switch(this.compressionType){case 0:b=0;for(d=f.length;b<d;){c=A?f.subarray(b,b+65535):f.slice(b,b+65535);b+=c.length;var e=c,g=b===d,h=p,j=p,i=p,r=p,l=p,k=this.output,q=this.op;if(A){for(k=new Uint8Array(this.output.buffer);k.length<=q+e.length+5;)k=new Uint8Array(k.length<<1);k.set(this.output)}h=g?1:0;k[q++]=h|0;j=e.length;i=~j+65536&65535;k[q++]=j&255;k[q++]=j>>>8&255;k[q++]=i&255;k[q++]=i>>>8&255;if(A)k.set(e,q),q+=e.length,k=k.subarray(0,
q);else{r=0;for(l=e.length;r<l;++r)k[q++]=e[r];k.length=q}this.op=q;this.output=k}break;case 1:var t=new I(new Uint8Array(this.output.buffer),this.op);t.writeBits(1,1,u);t.writeBits(1,2,u);var v=ra(this,f),x,F,w;x=0;for(F=v.length;x<F;x++)if(w=v[x],I.prototype.writeBits.apply(t,qa[w]),256<w)t.writeBits(v[++x],v[++x],u),t.writeBits(v[++x],5),t.writeBits(v[++x],v[++x],u);else if(256===w)break;this.output=t.finish();this.op=this.output.length;break;case ma:var B=new I(new Uint8Array(this.output),this.op),
C,n,s,E,D,da=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],V,Ma,ea,Na,na,xa=Array(19),Oa,Z,oa,G,Pa;C=ma;B.writeBits(1,1,u);B.writeBits(C,2,u);n=ra(this,f);V=sa(this.freqsLitLen,15);Ma=ta(V);ea=sa(this.freqsDist,7);Na=ta(ea);for(s=286;257<s&&0===V[s-1];s--);for(E=30;1<E&&0===ea[E-1];E--);var Qa=s,Ra=E,N=new (A?Uint32Array:Array)(Qa+Ra),y,O,z,fa,L=new (A?Uint32Array:Array)(316),J,H,P=new (A?Uint8Array:Array)(19);for(y=O=0;y<Qa;y++)N[O++]=V[y];for(y=0;y<Ra;y++)N[O++]=ea[y];if(!A){y=0;for(fa=P.length;y<
fa;++y)P[y]=0}y=J=0;for(fa=N.length;y<fa;y+=O){for(O=1;y+O<fa&&N[y+O]===N[y];++O);z=O;if(0===N[y])if(3>z)for(;0<z--;)L[J++]=0,P[0]++;else for(;0<z;)H=138>z?z:138,H>z-3&&H<z&&(H=z-3),10>=H?(L[J++]=17,L[J++]=H-3,P[17]++):(L[J++]=18,L[J++]=H-11,P[18]++),z-=H;else if(L[J++]=N[y],P[N[y]]++,z--,3>z)for(;0<z--;)L[J++]=N[y],P[N[y]]++;else for(;0<z;)H=6>z?z:6,H>z-3&&H<z&&(H=z-3),L[J++]=16,L[J++]=H-3,P[16]++,z-=H}a=A?L.subarray(0,J):L.slice(0,J);na=sa(P,7);for(G=0;19>G;G++)xa[G]=na[da[G]];for(D=19;4<D&&0===
xa[D-1];D--);Oa=ta(na);B.writeBits(s-257,5,u);B.writeBits(E-1,5,u);B.writeBits(D-4,4,u);for(G=0;G<D;G++)B.writeBits(xa[G],3,u);G=0;for(Pa=a.length;G<Pa;G++)if(Z=a[G],B.writeBits(Oa[Z],na[Z],u),16<=Z){G++;switch(Z){case 16:oa=2;break;case 17:oa=3;break;case 18:oa=7;break;default:m("invalid code: "+Z)}B.writeBits(a[G],oa,u)}var Sa=[Ma,V],Ta=[Na,ea],Q,Ua,ga,Aa,Va,Wa,Xa,Ya;Va=Sa[0];Wa=Sa[1];Xa=Ta[0];Ya=Ta[1];Q=0;for(Ua=n.length;Q<Ua;++Q)if(ga=n[Q],B.writeBits(Va[ga],Wa[ga],u),256<ga)B.writeBits(n[++Q],
n[++Q],u),Aa=n[++Q],B.writeBits(Xa[Aa],Ya[Aa],u),B.writeBits(n[++Q],n[++Q],u);else if(256===ga)break;this.output=B.finish();this.op=this.output.length;break;default:m("invalid compression type")}return this.output};function ua(a,c){this.length=a;this.backwardDistance=c}
function va(){var a=wa;switch(u){case 3===a:return[257,a-3,0];case 4===a:return[258,a-4,0];case 5===a:return[259,a-5,0];case 6===a:return[260,a-6,0];case 7===a:return[261,a-7,0];case 8===a:return[262,a-8,0];case 9===a:return[263,a-9,0];case 10===a:return[264,a-10,0];case 12>=a:return[265,a-11,1];case 14>=a:return[266,a-13,1];case 16>=a:return[267,a-15,1];case 18>=a:return[268,a-17,1];case 22>=a:return[269,a-19,2];case 26>=a:return[270,a-23,2];case 30>=a:return[271,a-27,2];case 34>=a:return[272,a-
31,2];case 42>=a:return[273,a-35,3];case 50>=a:return[274,a-43,3];case 58>=a:return[275,a-51,3];case 66>=a:return[276,a-59,3];case 82>=a:return[277,a-67,4];case 98>=a:return[278,a-83,4];case 114>=a:return[279,a-99,4];case 130>=a:return[280,a-115,4];case 162>=a:return[281,a-131,5];case 194>=a:return[282,a-163,5];case 226>=a:return[283,a-195,5];case 257>=a:return[284,a-227,5];case 258===a:return[285,a-258,0];default:m("invalid length: "+a)}}var ya=[],wa,za;
for(wa=3;258>=wa;wa++)za=va(),ya[wa]=za[2]<<24|za[1]<<16|za[0];var Ba=A?new Uint32Array(ya):ya;
function ra(a,c){function b(a,c){var b=a.backwardDistance,d=[],e=0,f;f=Ba[a.length];d[e++]=f&65535;d[e++]=f>>16&255;d[e++]=f>>24;var g;switch(u){case 1===b:g=[0,b-1,0];break;case 2===b:g=[1,b-2,0];break;case 3===b:g=[2,b-3,0];break;case 4===b:g=[3,b-4,0];break;case 6>=b:g=[4,b-5,1];break;case 8>=b:g=[5,b-7,1];break;case 12>=b:g=[6,b-9,2];break;case 16>=b:g=[7,b-13,2];break;case 24>=b:g=[8,b-17,3];break;case 32>=b:g=[9,b-25,3];break;case 48>=b:g=[10,b-33,4];break;case 64>=b:g=[11,b-49,4];break;case 96>=
b:g=[12,b-65,5];break;case 128>=b:g=[13,b-97,5];break;case 192>=b:g=[14,b-129,6];break;case 256>=b:g=[15,b-193,6];break;case 384>=b:g=[16,b-257,7];break;case 512>=b:g=[17,b-385,7];break;case 768>=b:g=[18,b-513,8];break;case 1024>=b:g=[19,b-769,8];break;case 1536>=b:g=[20,b-1025,9];break;case 2048>=b:g=[21,b-1537,9];break;case 3072>=b:g=[22,b-2049,10];break;case 4096>=b:g=[23,b-3073,10];break;case 6144>=b:g=[24,b-4097,11];break;case 8192>=b:g=[25,b-6145,11];break;case 12288>=b:g=[26,b-8193,12];break;
case 16384>=b:g=[27,b-12289,12];break;case 24576>=b:g=[28,b-16385,13];break;case 32768>=b:g=[29,b-24577,13];break;default:m("invalid distance")}f=g;d[e++]=f[0];d[e++]=f[1];d[e++]=f[2];var h,i;h=0;for(i=d.length;h<i;++h)k[q++]=d[h];v[d[0]]++;x[d[3]]++;t=a.length+c-1;l=null}var d,f,e,g,h,j={},i,r,l,k=A?new Uint16Array(2*c.length):[],q=0,t=0,v=new (A?Uint32Array:Array)(286),x=new (A?Uint32Array:Array)(30),F=a.lazy,w;if(!A){for(e=0;285>=e;)v[e++]=0;for(e=0;29>=e;)x[e++]=0}v[256]=1;d=0;for(f=c.length;d<
f;++d){e=h=0;for(g=3;e<g&&d+e!==f;++e)h=h<<8|c[d+e];j[h]===p&&(j[h]=[]);i=j[h];if(!(0<t--)){for(;0<i.length&&32768<d-i[0];)i.shift();if(d+3>=f){l&&b(l,-1);e=0;for(g=f-d;e<g;++e)w=c[d+e],k[q++]=w,++v[w];break}if(0<i.length){var B=p,C=p,n=0,s=p,E=p,D=p,da=p,V=c.length,E=0,da=i.length;a:for(;E<da;E++){B=i[da-E-1];s=3;if(3<n){for(D=n;3<D;D--)if(c[B+D-1]!==c[d+D-1])continue a;s=n}for(;258>s&&d+s<V&&c[B+s]===c[d+s];)++s;s>n&&(C=B,n=s);if(258===s)break}r=new ua(n,d-C);l?l.length<r.length?(w=c[d-1],k[q++]=
w,++v[w],b(r,0)):b(l,-1):r.length<F?l=r:b(r,0)}else l?b(l,-1):(w=c[d],k[q++]=w,++v[w])}i.push(d)}k[q++]=256;v[256]++;a.freqsLitLen=v;a.freqsDist=x;return A?k.subarray(0,q):k}
function sa(a,c){function b(a){var c=x[a][F[a]];c===l?(b(a+1),b(a+1)):--t[c];++F[a]}var d=a.length,f=new ka(572),e=new (A?Uint8Array:Array)(d),g,h,j,i,r;if(!A)for(i=0;i<d;i++)e[i]=0;for(i=0;i<d;++i)0<a[i]&&f.push(i,a[i]);g=Array(f.length/2);h=new (A?Uint32Array:Array)(f.length/2);if(1===g.length)return e[f.pop().index]=1,e;i=0;for(r=f.length/2;i<r;++i)g[i]=f.pop(),h[i]=g[i].value;var l=h.length,k=new (A?Uint16Array:Array)(c),q=new (A?Uint8Array:Array)(c),t=new (A?Uint8Array:Array)(l),v=Array(c),x=
Array(c),F=Array(c),w=(1<<c)-l,B=1<<c-1,C,n,s,E,D;k[c-1]=l;for(n=0;n<c;++n)w<B?q[n]=0:(q[n]=1,w-=B),w<<=1,k[c-2-n]=(k[c-1-n]/2|0)+l;k[0]=q[0];v[0]=Array(k[0]);x[0]=Array(k[0]);for(n=1;n<c;++n)k[n]>2*k[n-1]+q[n]&&(k[n]=2*k[n-1]+q[n]),v[n]=Array(k[n]),x[n]=Array(k[n]);for(C=0;C<l;++C)t[C]=c;for(s=0;s<k[c-1];++s)v[c-1][s]=h[s],x[c-1][s]=s;for(C=0;C<c;++C)F[C]=0;1===q[c-1]&&(--t[0],++F[c-1]);for(n=c-2;0<=n;--n){E=C=0;D=F[n+1];for(s=0;s<k[n];s++)E=v[n+1][D]+v[n+1][D+1],E>h[C]?(v[n][s]=E,x[n][s]=l,D+=2):
(v[n][s]=h[C],x[n][s]=C,++C);F[n]=0;1===q[n]&&b(n)}j=t;i=0;for(r=g.length;i<r;++i)e[g[i].index]=j[i];return e}function ta(a){var c=new (A?Uint16Array:Array)(a.length),b=[],d=[],f=0,e,g,h,j;e=0;for(g=a.length;e<g;e++)b[a[e]]=(b[a[e]]|0)+1;e=1;for(g=16;e<=g;e++)d[e]=f,f+=b[e]|0,f<<=1;e=0;for(g=a.length;e<g;e++){f=d[a[e]];d[a[e]]+=1;h=c[e]=0;for(j=a[e];h<j;h++)c[e]=c[e]<<1|f&1,f>>>=1}return c};function Ca(a,c){this.input=a;this.op=this.ip=0;this.flags={};c&&(c.flags&&(this.flags=c.flags),"string"===typeof c.filename&&(this.filename=c.filename),"string"===typeof c.comment&&(this.comment=c.comment),c.deflateOptions&&(this.deflateOptions=c.deflateOptions));this.deflateOptions||(this.deflateOptions={})}
Ca.prototype.compress=function(){var a,c,b,d,f,e,g,h,j=new (A?Uint8Array:Array)(32768),i=0,r=this.input,l=this.ip,k=this.filename,q=this.comment;j[i++]=31;j[i++]=139;j[i++]=8;a=0;this.flags.fname&&(a|=Da);this.flags.fcomment&&(a|=Ea);this.flags.fhcrc&&(a|=Fa);j[i++]=a;c=(Date.now?Date.now():+new Date)/1E3|0;j[i++]=c&255;j[i++]=c>>>8&255;j[i++]=c>>>16&255;j[i++]=c>>>24&255;j[i++]=0;j[i++]=Ga;if(this.flags.fname!==p){g=0;for(h=k.length;g<h;++g)e=k.charCodeAt(g),255<e&&(j[i++]=e>>>8&255),j[i++]=e&255;
j[i++]=0}if(this.flags.comment){g=0;for(h=q.length;g<h;++g)e=q.charCodeAt(g),255<e&&(j[i++]=e>>>8&255),j[i++]=e&255;j[i++]=0}this.flags.fhcrc&&(b=ha(j,0,i)&65535,j[i++]=b&255,j[i++]=b>>>8&255);this.deflateOptions.outputBuffer=j;this.deflateOptions.outputIndex=i;f=new la(r,this.deflateOptions);j=f.compress();i=f.op;A&&(i+8>j.buffer.byteLength?(this.output=new Uint8Array(i+8),this.output.set(new Uint8Array(j.buffer)),j=this.output):j=new Uint8Array(j.buffer));d=ha(r,p,p);j[i++]=d&255;j[i++]=d>>>8&255;
j[i++]=d>>>16&255;j[i++]=d>>>24&255;h=r.length;j[i++]=h&255;j[i++]=h>>>8&255;j[i++]=h>>>16&255;j[i++]=h>>>24&255;this.ip=l;A&&i<j.length&&(this.output=j=j.subarray(0,i));return j};var Ga=255,Fa=2,Da=8,Ea=16;function W(a,c){this.blocks=[];this.bufferSize=32768;this.bitsbuflen=this.bitsbuf=this.ip=this.totalpos=0;this.input=A?new Uint8Array(a):a;this.bfinal=!1;this.bufferType=Ha;this.resize=!1;if(c||!(c={}))c.index&&(this.ip=c.index),c.bufferSize&&(this.bufferSize=c.bufferSize),c.bufferType&&(this.bufferType=c.bufferType),c.resize&&(this.resize=c.resize);switch(this.bufferType){case Ia:this.op=32768;this.output=new (A?Uint8Array:Array)(32768+this.bufferSize+258);break;case Ha:this.op=0;this.output=new (A?
Uint8Array:Array)(this.bufferSize);this.expandBuffer=this.expandBufferAdaptive;this.concatBuffer=this.concatBufferDynamic;this.decodeHuffman=this.decodeHuffmanAdaptive;break;default:m(Error("invalid inflate mode"))}}var Ia=0,Ha=1;
W.prototype.decompress=function(){for(;!this.bfinal;){var a=X(this,3);a&1&&(this.bfinal=u);a>>>=1;switch(a){case 0:var c=this.input,b=this.ip,d=this.output,f=this.op,e=p,g=p,h=p,j=d.length,i=p;this.bitsbuflen=this.bitsbuf=0;e=c[b++];e===p&&m(Error("invalid uncompressed block header: LEN (first byte)"));g=e;e=c[b++];e===p&&m(Error("invalid uncompressed block header: LEN (second byte)"));g|=e<<8;e=c[b++];e===p&&m(Error("invalid uncompressed block header: NLEN (first byte)"));h=e;e=c[b++];e===p&&m(Error("invalid uncompressed block header: NLEN (second byte)"));
h|=e<<8;g===~h&&m(Error("invalid uncompressed block header: length verify"));b+g>c.length&&m(Error("input buffer is broken"));switch(this.bufferType){case Ia:for(;f+g>d.length;){i=j-f;g-=i;if(A)d.set(c.subarray(b,b+i),f),f+=i,b+=i;else for(;i--;)d[f++]=c[b++];this.op=f;d=this.expandBuffer();f=this.op}break;case Ha:for(;f+g>d.length;)d=this.expandBuffer({fixRatio:2});break;default:m(Error("invalid inflate mode"))}if(A)d.set(c.subarray(b,b+g),f),f+=g,b+=g;else for(;g--;)d[f++]=c[b++];this.ip=b;this.op=
f;this.output=d;break;case 1:this.decodeHuffman(Ja,Ka);break;case 2:La(this);break;default:m(Error("unknown BTYPE: "+a))}}return this.concatBuffer()};
var Za=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],$a=A?new Uint16Array(Za):Za,ab=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,258,258],bb=A?new Uint16Array(ab):ab,cb=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0],db=A?new Uint8Array(cb):cb,eb=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],fb=A?new Uint16Array(eb):eb,gb=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,
10,11,11,12,12,13,13],hb=A?new Uint8Array(gb):gb,ib=new (A?Uint8Array:Array)(288),Y,jb;Y=0;for(jb=ib.length;Y<jb;++Y)ib[Y]=143>=Y?8:255>=Y?9:279>=Y?7:8;var Ja=T(ib),kb=new (A?Uint8Array:Array)(30),lb,mb;lb=0;for(mb=kb.length;lb<mb;++lb)kb[lb]=5;var Ka=T(kb);function X(a,c){for(var b=a.bitsbuf,d=a.bitsbuflen,f=a.input,e=a.ip,g;d<c;)g=f[e++],g===p&&m(Error("input buffer is broken")),b|=g<<d,d+=8;g=b&(1<<c)-1;a.bitsbuf=b>>>c;a.bitsbuflen=d-c;a.ip=e;return g}
function nb(a,c){for(var b=a.bitsbuf,d=a.bitsbuflen,f=a.input,e=a.ip,g=c[0],h=c[1],j,i,r;d<h;)j=f[e++],j===p&&m(Error("input buffer is broken")),b|=j<<d,d+=8;i=g[b&(1<<h)-1];r=i>>>16;a.bitsbuf=b>>r;a.bitsbuflen=d-r;a.ip=e;return i&65535}
function La(a){function c(a,c,b){var d,e,f,g;for(g=0;g<a;)switch(d=nb(this,c),d){case 16:for(f=3+X(this,2);f--;)b[g++]=e;break;case 17:for(f=3+X(this,3);f--;)b[g++]=0;e=0;break;case 18:for(f=11+X(this,7);f--;)b[g++]=0;e=0;break;default:e=b[g++]=d}return b}var b=X(a,5)+257,d=X(a,5)+1,f=X(a,4)+4,e=new (A?Uint8Array:Array)($a.length),g,h,j,i;for(i=0;i<f;++i)e[$a[i]]=X(a,3);g=T(e);h=new (A?Uint8Array:Array)(b);j=new (A?Uint8Array:Array)(d);a.decodeHuffman(T(c.call(a,b,g,h)),T(c.call(a,d,g,j)))}
W.prototype.decodeHuffman=function(a,c){var b=this.output,d=this.op;this.currentLitlenTable=a;for(var f=b.length-258,e,g,h,j;256!==(e=nb(this,a));)if(256>e)d>=f&&(this.op=d,b=this.expandBuffer(),d=this.op),b[d++]=e;else{g=e-257;j=bb[g];0<db[g]&&(j+=X(this,db[g]));e=nb(this,c);h=fb[e];0<hb[e]&&(h+=X(this,hb[e]));d>=f&&(this.op=d,b=this.expandBuffer(),d=this.op);for(;j--;)b[d]=b[d++-h]}for(;8<=this.bitsbuflen;)this.bitsbuflen-=8,this.ip--;this.op=d};
W.prototype.decodeHuffmanAdaptive=function(a,c){var b=this.output,d=this.op;this.currentLitlenTable=a;for(var f=b.length,e,g,h,j;256!==(e=nb(this,a));)if(256>e)d>=f&&(b=this.expandBuffer(),f=b.length),b[d++]=e;else{g=e-257;j=bb[g];0<db[g]&&(j+=X(this,db[g]));e=nb(this,c);h=fb[e];0<hb[e]&&(h+=X(this,hb[e]));d+j>f&&(b=this.expandBuffer(),f=b.length);for(;j--;)b[d]=b[d++-h]}for(;8<=this.bitsbuflen;)this.bitsbuflen-=8,this.ip--;this.op=d};
W.prototype.expandBuffer=function(){var a=new (A?Uint8Array:Array)(this.op-32768),c=this.op-32768,b,d,f=this.output;if(A)a.set(f.subarray(32768,a.length));else{b=0;for(d=a.length;b<d;++b)a[b]=f[b+32768]}this.blocks.push(a);this.totalpos+=a.length;if(A)f.set(f.subarray(c,c+32768));else for(b=0;32768>b;++b)f[b]=f[c+b];this.op=32768;return f};
W.prototype.expandBufferAdaptive=function(a){var c,b=this.input.length/this.ip+1|0,d,f,e,g=this.input,h=this.output;a&&("number"===typeof a.fixRatio&&(b=a.fixRatio),"number"===typeof a.addRatio&&(b+=a.addRatio));2>b?(d=(g.length-this.ip)/this.currentLitlenTable[2],e=258*(d/2)|0,f=e<h.length?h.length+e:h.length<<1):f=h.length*b;A?(c=new Uint8Array(f),c.set(h)):c=h;return this.output=c};
W.prototype.concatBuffer=function(){var a=0,c=this.output,b=this.blocks,d,f=new (A?Uint8Array:Array)(this.totalpos+(this.op-32768)),e,g,h,j;if(0===b.length)return A?this.output.subarray(32768,this.op):this.output.slice(32768,this.op);e=0;for(g=b.length;e<g;++e){d=b[e];h=0;for(j=d.length;h<j;++h)f[a++]=d[h]}e=32768;for(g=this.op;e<g;++e)f[a++]=c[e];this.blocks=[];return this.buffer=f};
W.prototype.concatBufferDynamic=function(){var a,c=this.op;A?this.resize?(a=new Uint8Array(c),a.set(this.output.subarray(0,c))):a=this.output.subarray(0,c):(this.output.length>c&&(this.output.length=c),a=this.output);return this.buffer=a};function ob(a){this.input=a;this.ip=0;this.member=[];this.decompressed=!1}ob.prototype.getMembers=function(){this.decompressed||this.decompress();return this.member.slice()};
ob.prototype.decompress=function(){for(var a=this.input.length;this.ip<a;){var c=new ja,b=p,d=p,f=p,e=p,g=p,h=p,j=p,i=p,r=p,l=this.input,k=this.ip;c.id1=l[k++];c.id2=l[k++];(31!==c.id1||139!==c.id2)&&m(Error("invalid file signature:"+c.id1+","+c.id2));c.cm=l[k++];switch(c.cm){case 8:break;default:m(Error("unknown compression method: "+c.cm))}c.flg=l[k++];i=l[k++]|l[k++]<<8|l[k++]<<16|l[k++]<<24;c.mtime=new Date(1E3*i);c.xfl=l[k++];c.os=l[k++];0<(c.flg&4)&&(c.xlen=l[k++]|l[k++]<<8,k+=c.xlen);if(0<
(c.flg&Da)){j=[];for(h=0;0<(g=l[k++]);)j[h++]=String.fromCharCode(g);c.name=j.join("")}if(0<(c.flg&Ea)){j=[];for(h=0;0<(g=l[k++]);)j[h++]=String.fromCharCode(g);c.comment=j.join("")}0<(c.flg&Fa)&&(c.crc16=ha(l,0,k)&65535,c.crc16!==(l[k++]|l[k++]<<8)&&m(Error("invalid header crc16")));b=l[l.length-4]|l[l.length-3]<<8|l[l.length-2]<<16|l[l.length-1]<<24;l.length-k-4-4<512*b&&(e=b);d=new W(l,{index:k,bufferSize:e});c.data=f=d.decompress();k=d.ip;c.crc32=r=(l[k++]|l[k++]<<8|l[k++]<<16|l[k++]<<24)>>>0;
ha(f,p,p)!==r&&m(Error("invalid CRC-32 checksum: 0x"+ha(f,p,p).toString(16)+" / 0x"+r.toString(16)));c.isize=b=(l[k++]|l[k++]<<8|l[k++]<<16|l[k++]<<24)>>>0;(f.length&4294967295)!==b&&m(Error("invalid input size: "+(f.length&4294967295)+" / "+b));this.member.push(c);this.ip=k}this.decompressed=u;var q=this.member,t,v,x=0,F=0,w;t=0;for(v=q.length;t<v;++t)F+=q[t].data.length;if(A){w=new Uint8Array(F);for(t=0;t<v;++t)w.set(q[t].data,x),x+=q[t].data.length}else{w=[];for(t=0;t<v;++t)w[t]=q[t].data;w=Array.prototype.concat.apply([],
w)}return w};var pb=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];A&&new Uint16Array(pb);var qb=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,258,258];A&&new Uint16Array(qb);var rb=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0];A&&new Uint8Array(rb);var sb=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];A&&new Uint16Array(sb);
var tb=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];A&&new Uint8Array(tb);var ub=new (A?Uint8Array:Array)(288),$,vb;$=0;for(vb=ub.length;$<vb;++$)ub[$]=143>=$?8:255>=$?9:279>=$?7:8;T(ub);var wb=new (A?Uint8Array:Array)(30),xb,yb;xb=0;for(yb=wb.length;xb<yb;++xb)wb[xb]=5;T(wb);function zb(a){if("string"===typeof a){var c=a.split(""),b,d;b=0;for(d=c.length;b<d;b++)c[b]=(c[b].charCodeAt(0)&255)>>>0;a=c}for(var f=1,e=0,g=a.length,h,j=0;0<g;){h=1024<g?1024:g;g-=h;do f+=a[j++],e+=f;while(--h);f%=65521;e%=65521}return(e<<16|f)>>>0};function Ab(a,c){this.input=a;this.output=new (A?Uint8Array:Array)(32768);this.compressionType=Bb.DYNAMIC;var b={},d;if((c||!(c={}))&&"number"===typeof c.compressionType)this.compressionType=c.compressionType;for(d in c)b[d]=c[d];b.outputBuffer=this.output;this.rawDeflate=new la(this.input,b)}var Bb=pa;
Ab.prototype.compress=function(){var a,c,b,d,f,e,g,h=0;g=this.output;a=Cb;switch(a){case Cb:c=Math.LOG2E*Math.log(32768)-8;break;default:m(Error("invalid compression method"))}b=c<<4|a;g[h++]=b;switch(a){case Cb:switch(this.compressionType){case Bb.NONE:f=0;break;case Bb.FIXED:f=1;break;case Bb.DYNAMIC:f=2;break;default:m(Error("unsupported compression type"))}break;default:m(Error("invalid compression method"))}d=f<<6|0;g[h++]=d|31-(256*b+d)%31;e=zb(this.input);this.rawDeflate.op=h;g=this.rawDeflate.compress();
h=g.length;A&&(g=new Uint8Array(g.buffer),g.length<=h+4&&(this.output=new Uint8Array(g.length+4),this.output.set(g),g=this.output),g=g.subarray(0,h+4));g[h++]=e>>24&255;g[h++]=e>>16&255;g[h++]=e>>8&255;g[h++]=e&255;return g};function Db(a,c){var b,d;this.input=a;this.ip=0;if(c||!(c={}))c.index&&(this.ip=c.index),c.verify&&(this.verify=c.verify);b=a[this.ip++];d=a[this.ip++];switch(b&15){case Cb:this.method=Cb;break;default:m(Error("unsupported compression method"))}0!==((b<<8)+d)%31&&m(Error("invalid fcheck flag:"+((b<<8)+d)%31));d&32&&m(Error("fdict flag is not supported"));this.rawinflate=new W(a,{index:this.ip,bufferSize:c.bufferSize,bufferType:c.bufferType,resize:c.resize})}
Db.prototype.decompress=function(){var a=this.input,c,b;c=this.rawinflate.decompress();this.ip=this.rawinflate.ip;this.verify&&(b=(a[this.ip++]<<24|a[this.ip++]<<16|a[this.ip++]<<8|a[this.ip++])>>>0,b!==zb(c)&&m(Error("invalid adler-32 checksum")));return c};exports.deflate=Eb;exports.deflateSync=Fb;exports.inflate=Gb;exports.inflateSync=Hb;exports.gzip=Ib;exports.gzipSync=Jb;exports.gunzip=Kb;exports.gunzipSync=Lb;function Eb(a,c,b){process.nextTick(function(){var d,f;try{f=Fb(a,b)}catch(e){d=e}c(d,f)})}function Fb(a,c){var b;b=(new Ab(a)).compress();c||(c={});return c.noBuffer?b:Mb(b)}function Gb(a,c,b){process.nextTick(function(){var d,f;try{f=Hb(a,b)}catch(e){d=e}c(d,f)})}
function Hb(a,c){var b;a.subarray=a.slice;b=(new Db(a)).decompress();c||(c={});return c.noBuffer?b:Mb(b)}function Ib(a,c,b){process.nextTick(function(){var d,f;try{f=Jb(a,b)}catch(e){d=e}c(d,f)})}function Jb(a,c){var b;a.subarray=a.slice;b=(new Ca(a)).compress();c||(c={});return c.noBuffer?b:Mb(b)}function Kb(a,c,b){process.nextTick(function(){var d,f;try{f=Lb(a,b)}catch(e){d=e}c(d,f)})}function Lb(a,c){var b;a.subarray=a.slice;b=(new ob(a)).decompress();c||(c={});return c.noBuffer?b:Mb(b)}
function Mb(a){var c=new Buffer(a.length),b,d;b=0;for(d=a.length;b<d;++b)c[b]=a[b];return c};var Cb=8;}).call(this);

})(require("__browserify_process"),require("__browserify_buffer").Buffer)
},{"__browserify_process":9,"__browserify_buffer":18}],10:[function(require,module,exports){
var mcChunk = require('minecraft-chunk')

module.exports = RegionRenderer

module.exports.chunkPosition = chunkPosition

function chunkPosition(x, z) {
  return [x >> 4, z >> 4]
}

function RegionRenderer(region, options) {
  if (!(this instanceof RegionRenderer)) return new RegionRenderer(region, options)
  this.region = region
  this.options = options
}

RegionRenderer.prototype.positionBounds = function() {
  var cb = this.chunkBounds()
  var minx = cb[0] << 4
  var minz = cb[2] << 4
  var maxx = (cb[1] + 1 << 4) - 1
  var maxz = (cb[3] + 1 << 4) - 1
  return [[minx, 0, minz], [maxx, 256, maxz]]
}

RegionRenderer.prototype.chunkBounds = function() {
  var x = +this.region.x
  var z = +this.region.z
  var minx = x * 32
  var minz = z * 32
  var maxx = (x + 1) * 32 - 1
  var maxz = (z + 1) * 32 - 1
  return [minx, maxx, minz, maxz]
}

RegionRenderer.prototype.loadAll = function() {
  var chunks = this.chunkBounds()
  for (var x = chunks[0]; x <= chunks[1]; x++ ) {
    for (var z = chunks[2]; z <= chunks[3]; z++ ) {
      this.loadChunk(x, z)
    }
  }
}

RegionRenderer.prototype.loadNearby = function(pos, size) {
  var x = pos[0]
  var z = pos[2]
  var chunkPos = chunkPosition(x, z)
  var minx = (chunkPos[0]) - size
  var minz = (chunkPos[1]) - size
  var maxx = (chunkPos[0]) + size
  var maxz = (chunkPos[1]) + size
  for (var x = minx; x <= maxx; x++ ) {
    for (var z = minz; z <= maxz; z++ ) {
      this.loadChunk(x, z)
    }
  }
}

RegionRenderer.prototype.initializeChunk = function(chunk, chunkX, chunkZ) {
  var options = {
    nbt: chunk,
    ymin: this.options.ymin,
    showstuff: false,
    superflat: false,
    chunkX: chunkX,
    chunkZ: chunkZ
  }
  return mcChunk(options)
}

RegionRenderer.prototype.loadChunk = function(chunkX, chunkZ) {
  var self = this
  if (this.options.onChunk) this.options.onChunk(chunkX, chunkZ)
  var chunk = this.region.getChunk(chunkX, chunkZ)
  if (chunk != null) {
    var view = this.initializeChunk(chunk, chunkX, chunkZ)
    var voxels = []
    view.extractChunk(function(x, y, z, block) {
      self.options.onVoxel(x, y, z, block, chunkX, chunkZ)
    })
  } else {
    return false
  }
}
},{"minecraft-chunk":23}],24:[function(require,module,exports){
(function(){// UTILITY
var util = require('util');
var Buffer = require("buffer").Buffer;
var pSlice = Array.prototype.slice;

function objectKeys(object) {
  if (Object.keys) return Object.keys(object);
  var result = [];
  for (var name in object) {
    if (Object.prototype.hasOwnProperty.call(object, name)) {
      result.push(name);
    }
  }
  return result;
}

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.message = options.message;
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
};
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (value === undefined) {
    return '' + value;
  }
  if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (typeof value === 'function' || value instanceof RegExp) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (typeof s == 'string') {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

assert.AssertionError.prototype.toString = function() {
  if (this.message) {
    return [this.name + ':', this.message].join(' ');
  } else {
    return [
      this.name + ':',
      truncate(JSON.stringify(this.actual, replacer), 128),
      this.operator,
      truncate(JSON.stringify(this.expected, replacer), 128)
    ].join(' ');
  }
};

// assert.AssertionError instanceof Error

assert.AssertionError.__proto__ = Error.prototype;

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!!!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (Buffer.isBuffer(actual) && Buffer.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();

  // 7.3. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (typeof actual != 'object' && typeof expected != 'object') {
    return actual == expected;

  // 7.4. For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isUndefinedOrNull(value) {
  return value === null || value === undefined;
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (expected instanceof RegExp) {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (typeof expected === 'string') {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail('Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail('Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

})()
},{"util":6,"buffer":17}],11:[function(require,module,exports){
(function(process){var dataview = require('jDataView');
var NBTReader = require('minecraft-nbt').NBTReader;
var chunk = require('minecraft-chunk');
if (process.browser) var Zlib = require('./zlib-inflate.min').Zlib
else var Zlib = require('./zlibjs-node')

var CHUNK_HEADER_SIZE, SECTOR_BYTES, SECTOR_INTS, emptySector, emptySectorBuffer, sizeDelta,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

SECTOR_BYTES = 4096;

SECTOR_INTS = SECTOR_BYTES / 4;

CHUNK_HEADER_SIZE = 5;

emptySectorBuffer = new ArrayBuffer(4096);

emptySector = new Uint8Array(emptySectorBuffer);

sizeDelta = 0;

function mod (num, n) { return ((num % n) + n) % n }

function Region(buffer, x, z) {
  var i, nSectors, offset, sectorNum;

  this.buffer = buffer;
  this.x = x;
  this.z = z;
  this.outOfBounds = __bind(this.outOfBounds, this);
  this.getOffset = __bind(this.getOffset, this);
  this.getChunk = __bind(this.getChunk, this);
  this.dataView = new dataview(this.buffer);
  sizeDelta = 0;
  var length = this.buffer.byteLength || this.buffer.length
  nSectors = length / SECTOR_BYTES;
  this.sectorFree = [];
  for (i = 0; i <= nSectors - 1; ++i)
    this.sectorFree.push(true)
  this.sectorFree[0] = false;
  this.sectorFree[1] = false;
  this.dataView.seek(0);
  this.offsets = new Int32Array(this.buffer, 0, SECTOR_INTS);
  
  for (var i = 0; i <= SECTOR_INTS; ++i) {
    offset = this.dataView.getInt32();
    if (offset !== 0 && (offset >> 16) + ((offset >> 8) & 0xFF) <= this.sectorFree.length) {
      for (sectorNum = 0; sectorNum <= ((offset >> 8) & 0xFF) - 1; ++sectorNum) {
        var el = (offset >> 16) + sectorNum
        this.sectorFree[el] = false;
      }
    }
  }
}

Region.prototype.getChunk = function(x, z) {
  var data, length, nbtReader, retval, retvalbytes, version;
  if (this.outOfBounds(x, z)) return null
  var offset = this.getOffset(x, z)
  if (offset === 0) {
    return null
  } else {
    this.dataView.seek(offset)
    length = this.dataView.getInt32()
    version = this.dataView.getUint8()
    data = new Uint8Array(this.buffer, this.dataView.tell(), length)
    if (process.browser) retvalbytes = new Zlib.Inflate(data).decompress()
    else retvalbytes = Zlib.inflateSync(data)
    nbtReader = new NBTReader(retvalbytes)
    retval = nbtReader.read()
    return retval
  }
};

Region.prototype.outOfBounds = function(x, z) {
  var rx = +this.x
  var rz = +this.z
  var minx = rx * 32
  var minz = rz * 32
  var maxx = (rx + 1) * 32 - 1
  var maxz = (rz + 1) * 32 - 1
  if (maxx < minx) {
    minx = (rx + 1) * 32 - 1
    maxx = rx * 32
  }
  if (maxz < minz) {
    minz = (rz + 1) * 32 - 1
    maxz = rz * 32
  }
  return x < minx || x > maxx || z < minz || z > maxz
};

Region.prototype.getOffset = function(x, z) {
  var bytes, locationOffset, offset, sectors;
  x = Math.abs(mod(x, 32))
  z = Math.abs(mod(z, 32))  
  locationOffset = 4 * (x + z * 32)
  bytes = new Uint8Array(this.buffer, locationOffset, 4);
  sectors = bytes[3];
  offset = bytes[0] << 16 | bytes[1] << 8 | bytes[2];
  if (offset === 0) {
    return 0;
  } else {
    return offset * 4096;
  }
};

module.exports = function(data, x, z) {
  return new Region(data, x, z)
}

})(require("__browserify_process"))
},{"./zlib-inflate.min":21,"./zlibjs-node":22,"jDataView":25,"minecraft-nbt":26,"minecraft-chunk":27,"__browserify_process":9}],19:[function(require,module,exports){
(function(process){/* Copyright (c) 2013 Rod Vagg, MIT License */

function AbstractChainedBatch (db) {
  this._db         = db
  this._operations = []
}

AbstractChainedBatch.prototype.put = function (key, value) {
  var err = this._db._checkKeyValue(key, 'key', this._db._isBuffer)
  if (err) throw err
  err = this._db._checkKeyValue(value, 'value', this._db._isBuffer)
  if (err) throw err

  if (!this._db._isBuffer(key)) key = String(key)
  if (!this._db._isBuffer(value)) value = String(value)

  this._operations.push({ type: 'put', key: key, value: value })

  return this
}

AbstractChainedBatch.prototype.del = function (key) {
  var err = this._db._checkKeyValue(key, 'key', this._db._isBuffer)
  if (err) throw err

  if (!this._db._isBuffer(key)) key = String(key)

  this._operations.push({ type: 'del', key: key })

  return this
}

AbstractChainedBatch.prototype.clear = function () {
  this._operations = []
  return this
}

AbstractChainedBatch.prototype.write = function (options, callback) {
  if (typeof options == 'function')
    callback = options
  if (typeof callback != 'function')
    throw new Error('write() requires a callback argument')
  if (typeof options != 'object')
    options = {}

  if (typeof this._db._batch == 'function')
    return this._db._batch(this._operations, options, callback)

  process.nextTick(callback)
}

module.exports = AbstractChainedBatch
})(require("__browserify_process"))
},{"__browserify_process":9}],20:[function(require,module,exports){
(function(process){/* Copyright (c) 2013 Rod Vagg, MIT License */

function AbstractIterator (db) {
  this.db = db
  this._ended = false
  this._nexting = false
}

AbstractIterator.prototype.next = function (callback) {
  if (typeof callback != 'function')
    throw new Error('next() requires a callback argument')

  if (this._ended)
    return callback(new Error('cannot call next() after end()'))
  if (this._nexting)
    return callback(new Error('cannot call next() before previous next() has completed'))

  this._nexting = true
  if (typeof this._next == 'function') {
    return this._next(function () {
      this._nexting = false
      callback.apply(null, arguments)
    }.bind(this))
  }

  process.nextTick(function () {
    this._nexting = false
    callback()
  }.bind(this))
}

AbstractIterator.prototype.end = function (callback) {
  if (typeof callback != 'function')
    throw new Error('end() requires a callback argument')

  if (this._ended)
    return callback(new Error('end() already called on iterator'))

  this._ended = true

  if (typeof this._end == 'function')
    return this._end(callback)

  process.nextTick(callback)
}

module.exports = AbstractIterator

})(require("__browserify_process"))
},{"__browserify_process":9}],25:[function(require,module,exports){
(function(Buffer){//
// jDataView by Vjeux - Jan 2010
//
// A unique way to read a binary file in the browser
// http://github.com/vjeux/jDataView
// http://blog.vjeux.com/ <vjeuxx@gmail.com>
//

(function (global) {

var compatibility = {
	ArrayBuffer: typeof ArrayBuffer !== 'undefined',
	DataView: typeof DataView !== 'undefined' &&
		('getFloat64' in DataView.prototype ||				// Chrome
		 'getFloat64' in new DataView(new ArrayBuffer(1))), // Node
	// NodeJS Buffer in v0.5.5 and newer
	NodeBuffer: typeof Buffer !== 'undefined' && 'readInt16LE' in Buffer.prototype
};

var dataTypes = {
	'Int8': 1,
	'Int16': 2,
	'Int32': 4,
	'Uint8': 1,
	'Uint16': 2,
	'Uint32': 4,
	'Float32': 4,
	'Float64': 8
};

var nodeNaming = {
	'Int8': 'Int8',
	'Int16': 'Int16',
	'Int32': 'Int32',
	'Uint8': 'UInt8',
	'Uint16': 'UInt16',
	'Uint32': 'UInt32',
	'Float32': 'Float',
	'Float64': 'Double'
};

var jDataView = function (buffer, byteOffset, byteLength, littleEndian) {
	if (!(this instanceof jDataView)) {
		throw new Error("jDataView constructor may not be called as a function");
	}

	this.buffer = buffer;

	// Handle Type Errors
	if (!(compatibility.NodeBuffer && buffer instanceof Buffer) &&
		!(compatibility.ArrayBuffer && buffer instanceof ArrayBuffer) &&
		typeof buffer !== 'string') {
		throw new TypeError('jDataView buffer has an incompatible type');
	}

	// Check parameters and existing functionnalities
	this._isArrayBuffer = compatibility.ArrayBuffer && buffer instanceof ArrayBuffer;
	this._isDataView = compatibility.DataView && this._isArrayBuffer;
	this._isNodeBuffer = compatibility.NodeBuffer && buffer instanceof Buffer;

	// Default Values
	this._littleEndian = littleEndian === undefined ? false : littleEndian;

	var bufferLength = this._isArrayBuffer ? buffer.byteLength : buffer.length;
	if (byteOffset === undefined) {
		byteOffset = 0;
	}
	this.byteOffset = byteOffset;

	if (byteLength === undefined) {
		byteLength = bufferLength - byteOffset;
	}
	this.byteLength = byteLength;

	if (!this._isDataView) {
		// Do additional checks to simulate DataView
		if (typeof byteOffset !== 'number') {
			throw new TypeError('jDataView byteOffset is not a number');
		}
		if (typeof byteLength !== 'number') {
			throw new TypeError('jDataView byteLength is not a number');
		}
		if (byteOffset < 0) {
			throw new Error('jDataView byteOffset is negative');
		}
		if (byteLength < 0) {
			throw new Error('jDataView byteLength is negative');
		}
	}

	// Instanciate
	if (this._isDataView) {
		this._view = new DataView(buffer, byteOffset, byteLength);
		this._start = 0;
	}
	this._start = byteOffset;
	if (byteOffset + byteLength > bufferLength) {
		throw new Error("jDataView (byteOffset + byteLength) value is out of bounds");
	}

	this._offset = 0;

	// Create uniform reading methods (wrappers) for the following data types

	if (this._isDataView) { // DataView: we use the direct method
		for (var type in dataTypes) {
			if (!dataTypes.hasOwnProperty(type)) {
				continue;
			}
			(function(type, view){
				var size = dataTypes[type];
				view['get' + type] = function (byteOffset, littleEndian) {
					// Handle the lack of endianness
					if (littleEndian === undefined) {
						littleEndian = view._littleEndian;
					}

					// Handle the lack of byteOffset
					if (byteOffset === undefined) {
						byteOffset = view._offset;
					}

					// Move the internal offset forward
					view._offset = byteOffset + size;

					return view._view['get' + type](byteOffset, littleEndian);
				}
			})(type, this);
		}
	} else if (this._isNodeBuffer && compatibility.NodeBuffer) {
		for (var type in dataTypes) {
			if (!dataTypes.hasOwnProperty(type)) {
				continue;
			}

			var name;
			if (type === 'Int8' || type === 'Uint8') {
				name = 'read' + nodeNaming[type];
			} else if (littleEndian) {
				name = 'read' + nodeNaming[type] + 'LE';
			} else {
				name = 'read' + nodeNaming[type] + 'BE';
			}

			(function(type, view, name){
				var size = dataTypes[type];
				view['get' + type] = function (byteOffset, littleEndian) {
					// Handle the lack of endianness
					if (littleEndian === undefined) {
						littleEndian = view._littleEndian;
					}

					// Handle the lack of byteOffset
					if (byteOffset === undefined) {
						byteOffset = view._offset;
					}

					// Move the internal offset forward
					view._offset = byteOffset + size;

					return view.buffer[name](view._start + byteOffset);
				}
			})(type, this, name);
		}
	} else {
		for (var type in dataTypes) {
			if (!dataTypes.hasOwnProperty(type)) {
				continue;
			}
			(function(type, view){
				var size = dataTypes[type];
				view['get' + type] = function (byteOffset, littleEndian) {
					// Handle the lack of endianness
					if (littleEndian === undefined) {
						littleEndian = view._littleEndian;
					}

					// Handle the lack of byteOffset
					if (byteOffset === undefined) {
						byteOffset = view._offset;
					}

					// Move the internal offset forward
					view._offset = byteOffset + size;

					if (view._isArrayBuffer && (view._start + byteOffset) % size === 0 && (size === 1 || littleEndian)) {
						// ArrayBuffer: we use a typed array of size 1 if the alignment is good
						// ArrayBuffer does not support endianess flag (for size > 1)
						return new global[type + 'Array'](view.buffer, view._start + byteOffset, 1)[0];
					} else {
						// Error checking:
						if (typeof byteOffset !== 'number') {
							throw new TypeError('jDataView byteOffset is not a number');
						}
						if (byteOffset + size > view.byteLength) {
							throw new Error('jDataView (byteOffset + size) value is out of bounds');
						}

						return view['_get' + type](view._start + byteOffset, littleEndian);
					}
				}
			})(type, this);
		}
	}
};

if (compatibility.NodeBuffer) {
	jDataView.createBuffer = function () {
		var buffer = new Buffer(arguments.length);
		for (var i = 0; i < arguments.length; ++i) {
			buffer[i] = arguments[i];
		}
		return buffer;
	}
} else if (compatibility.ArrayBuffer) {
	jDataView.createBuffer = function () {
		var buffer = new ArrayBuffer(arguments.length);
		var view = new Int8Array(buffer);
		for (var i = 0; i < arguments.length; ++i) {
			view[i] = arguments[i];
		}
		return buffer;
	}
} else {
	jDataView.createBuffer = function () {
		return String.fromCharCode.apply(null, arguments);
	}
}

jDataView.prototype = {
	compatibility: compatibility,

	// Helpers

	getString: function (length, byteOffset) {
		var value;

		// Handle the lack of byteOffset
		if (byteOffset === undefined) {
			byteOffset = this._offset;
		}

		// Error Checking
		if (typeof byteOffset !== 'number') {
			throw new TypeError('jDataView byteOffset is not a number');
		}
		if (length < 0 || byteOffset + length > this.byteLength) {
			throw new Error('jDataView length or (byteOffset+length) value is out of bounds');
		}

		if (this._isNodeBuffer) {
			value = this.buffer.toString('ascii', this._start + byteOffset, this._start + byteOffset + length);
		}
		else {
			value = '';
			for (var i = 0; i < length; ++i) {
				var char = this.getUint8(byteOffset + i);
				value += String.fromCharCode(char > 127 ? 65533 : char);
			}
		}

		this._offset = byteOffset + length;
		return value;
	},

	getChar: function (byteOffset) {
		return this.getString(1, byteOffset);
	},

	tell: function () {
		return this._offset;
	},

	seek: function (byteOffset) {
		if (typeof byteOffset !== 'number') {
			throw new TypeError('jDataView byteOffset is not a number');
		}
		if (byteOffset < 0 || byteOffset > this.byteLength) {
			throw new Error('jDataView byteOffset value is out of bounds');
		}

		return this._offset = byteOffset;
	},

	// Compatibility functions on a String Buffer

	_endianness: function (byteOffset, pos, max, littleEndian) {
		return byteOffset + (littleEndian ? max - pos - 1 : pos);
	},

	_getFloat64: function (byteOffset, littleEndian) {
		var b0 = this._getUint8(this._endianness(byteOffset, 0, 8, littleEndian)),
			b1 = this._getUint8(this._endianness(byteOffset, 1, 8, littleEndian)),
			b2 = this._getUint8(this._endianness(byteOffset, 2, 8, littleEndian)),
			b3 = this._getUint8(this._endianness(byteOffset, 3, 8, littleEndian)),
			b4 = this._getUint8(this._endianness(byteOffset, 4, 8, littleEndian)),
			b5 = this._getUint8(this._endianness(byteOffset, 5, 8, littleEndian)),
			b6 = this._getUint8(this._endianness(byteOffset, 6, 8, littleEndian)),
			b7 = this._getUint8(this._endianness(byteOffset, 7, 8, littleEndian)),

			sign = 1 - (2 * (b0 >> 7)),
			exponent = ((((b0 << 1) & 0xff) << 3) | (b1 >> 4)) - (Math.pow(2, 10) - 1),

		// Binary operators such as | and << operate on 32 bit values, using + and Math.pow(2) instead
			mantissa = ((b1 & 0x0f) * Math.pow(2, 48)) + (b2 * Math.pow(2, 40)) + (b3 * Math.pow(2, 32)) +
						(b4 * Math.pow(2, 24)) + (b5 * Math.pow(2, 16)) + (b6 * Math.pow(2, 8)) + b7;

		if (exponent === 1024) {
			if (mantissa !== 0) {
				return NaN;
			} else {
				return sign * Infinity;
			}
		}

		if (exponent === -1023) { // Denormalized
			return sign * mantissa * Math.pow(2, -1022 - 52);
		}

		return sign * (1 + mantissa * Math.pow(2, -52)) * Math.pow(2, exponent);
	},

	_getFloat32: function (byteOffset, littleEndian) {
		var b0 = this._getUint8(this._endianness(byteOffset, 0, 4, littleEndian)),
			b1 = this._getUint8(this._endianness(byteOffset, 1, 4, littleEndian)),
			b2 = this._getUint8(this._endianness(byteOffset, 2, 4, littleEndian)),
			b3 = this._getUint8(this._endianness(byteOffset, 3, 4, littleEndian)),

			sign = 1 - (2 * (b0 >> 7)),
			exponent = (((b0 << 1) & 0xff) | (b1 >> 7)) - 127,
			mantissa = ((b1 & 0x7f) << 16) | (b2 << 8) | b3;

		if (exponent === 128) {
			if (mantissa !== 0) {
				return NaN;
			} else {
				return sign * Infinity;
			}
		}

		if (exponent === -127) { // Denormalized
			return sign * mantissa * Math.pow(2, -126 - 23);
		}

		return sign * (1 + mantissa * Math.pow(2, -23)) * Math.pow(2, exponent);
	},

	_getInt32: function (byteOffset, littleEndian) {
		var b = this._getUint32(byteOffset, littleEndian);
		return b > Math.pow(2, 31) - 1 ? b - Math.pow(2, 32) : b;
	},

	_getUint32: function (byteOffset, littleEndian) {
		var b3 = this._getUint8(this._endianness(byteOffset, 0, 4, littleEndian)),
			b2 = this._getUint8(this._endianness(byteOffset, 1, 4, littleEndian)),
			b1 = this._getUint8(this._endianness(byteOffset, 2, 4, littleEndian)),
			b0 = this._getUint8(this._endianness(byteOffset, 3, 4, littleEndian));

		return (b3 * Math.pow(2, 24)) + (b2 << 16) + (b1 << 8) + b0;
	},

	_getInt16: function (byteOffset, littleEndian) {
		var b = this._getUint16(byteOffset, littleEndian);
		return b > Math.pow(2, 15) - 1 ? b - Math.pow(2, 16) : b;
	},

	_getUint16: function (byteOffset, littleEndian) {
		var b1 = this._getUint8(this._endianness(byteOffset, 0, 2, littleEndian)),
			b0 = this._getUint8(this._endianness(byteOffset, 1, 2, littleEndian));

		return (b1 << 8) + b0;
	},

	_getInt8: function (byteOffset) {
		var b = this._getUint8(byteOffset);
		return b > Math.pow(2, 7) - 1 ? b - Math.pow(2, 8) : b;
	},

	_getUint8: function (byteOffset) {
		if (this._isArrayBuffer) {
			return new Uint8Array(this.buffer, byteOffset, 1)[0];
		}
		else if (this._isNodeBuffer) {
			return this.buffer[byteOffset];
		} else {
			return this.buffer.charCodeAt(byteOffset) & 0xff;
		}
	}
};

if (typeof jQuery !== 'undefined' && jQuery.fn.jquery >= "1.6.2") {
	var convertResponseBodyToText = function (byteArray) {
		// http://jsperf.com/vbscript-binary-download/6
		var scrambledStr;
		try {
			scrambledStr = IEBinaryToArray_ByteStr(byteArray);
		} catch (e) {
			// http://stackoverflow.com/questions/1919972/how-do-i-access-xhr-responsebody-for-binary-data-from-javascript-in-ie
			// http://miskun.com/javascript/internet-explorer-and-binary-files-data-access/
			var IEBinaryToArray_ByteStr_Script =
				"Function IEBinaryToArray_ByteStr(Binary)\r\n"+
				"	IEBinaryToArray_ByteStr = CStr(Binary)\r\n"+
				"End Function\r\n"+
				"Function IEBinaryToArray_ByteStr_Last(Binary)\r\n"+
				"	Dim lastIndex\r\n"+
				"	lastIndex = LenB(Binary)\r\n"+
				"	if lastIndex mod 2 Then\r\n"+
				"		IEBinaryToArray_ByteStr_Last = AscB( MidB( Binary, lastIndex, 1 ) )\r\n"+
				"	Else\r\n"+
				"		IEBinaryToArray_ByteStr_Last = -1\r\n"+
				"	End If\r\n"+
				"End Function\r\n";

			// http://msdn.microsoft.com/en-us/library/ms536420(v=vs.85).aspx
			// proprietary IE function
			window.execScript(IEBinaryToArray_ByteStr_Script, 'vbscript');

			scrambledStr = IEBinaryToArray_ByteStr(byteArray);
		}

		var lastChr = IEBinaryToArray_ByteStr_Last(byteArray),
		result = "",
		i = 0,
		l = scrambledStr.length % 8,
		thischar;
		while (i < l) {
			thischar = scrambledStr.charCodeAt(i++);
			result += String.fromCharCode(thischar & 0xff, thischar >> 8);
		}
		l = scrambledStr.length
		while (i < l) {
			result += String.fromCharCode(
				(thischar = scrambledStr.charCodeAt(i++), thischar & 0xff), thischar >> 8,
				(thischar = scrambledStr.charCodeAt(i++), thischar & 0xff), thischar >> 8,
				(thischar = scrambledStr.charCodeAt(i++), thischar & 0xff), thischar >> 8,
				(thischar = scrambledStr.charCodeAt(i++), thischar & 0xff), thischar >> 8,
				(thischar = scrambledStr.charCodeAt(i++), thischar & 0xff), thischar >> 8,
				(thischar = scrambledStr.charCodeAt(i++), thischar & 0xff), thischar >> 8,
				(thischar = scrambledStr.charCodeAt(i++), thischar & 0xff), thischar >> 8,
				(thischar = scrambledStr.charCodeAt(i++), thischar & 0xff), thischar >> 8);
		}
		if (lastChr > -1) {
			result += String.fromCharCode(lastChr);
		}
		return result;
	};

	jQuery.ajaxSetup({
		converters: {
			'* dataview': function(data) {
				return new jDataView(data);
			}
		},
		accepts: {
			dataview: "text/plain; charset=x-user-defined"
		},
		responseHandler: {
			dataview: function (responses, options, xhr) {
				// Array Buffer Firefox
				if ('mozResponseArrayBuffer' in xhr) {
					responses.text = xhr.mozResponseArrayBuffer;
				}
				// Array Buffer Chrome
				else if ('responseType' in xhr && xhr.responseType === 'arraybuffer' && xhr.response) {
					responses.text = xhr.response;
				}
				// Internet Explorer (Byte array accessible through VBScript -- convert to text)
				else if ('responseBody' in xhr) {
					responses.text = convertResponseBodyToText(xhr.responseBody);
				}
				// Older Browsers
				else {
					responses.text = xhr.responseText;
				}
			}
		}
	});

	jQuery.ajaxPrefilter('dataview', function(options, originalOptions, jqXHR) {
		// trying to set the responseType on IE 6 causes an error
		if (jQuery.support.ajaxResponseType) {
			if (!options.hasOwnProperty('xhrFields')) {
				options.xhrFields = {};
			}
			options.xhrFields.responseType = 'arraybuffer';
		}
		options.mimeType = 'text/plain; charset=x-user-defined';
	});
}

global.jDataView = (global.module || {}).exports = jDataView;
if (typeof module !== 'undefined') {
	module.exports = jDataView;
}

})(this);

})(require("__browserify_buffer").Buffer)
},{"__browserify_buffer":18}],28:[function(require,module,exports){
exports.readIEEE754 = function(buffer, offset, isBE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isBE ? 0 : (nBytes - 1),
      d = isBE ? 1 : -1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.writeIEEE754 = function(buffer, value, offset, isBE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isBE ? (nBytes - 1) : 0,
      d = isBE ? -1 : 1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],17:[function(require,module,exports){
(function(){function SlowBuffer (size) {
    this.length = size;
};

var assert = require('assert');

exports.INSPECT_MAX_BYTES = 50;


function toHex(n) {
  if (n < 16) return '0' + n.toString(16);
  return n.toString(16);
}

function utf8ToBytes(str) {
  var byteArray = [];
  for (var i = 0; i < str.length; i++)
    if (str.charCodeAt(i) <= 0x7F)
      byteArray.push(str.charCodeAt(i));
    else {
      var h = encodeURIComponent(str.charAt(i)).substr(1).split('%');
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16));
    }

  return byteArray;
}

function asciiToBytes(str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++ )
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push( str.charCodeAt(i) & 0xFF );

  return byteArray;
}

function base64ToBytes(str) {
  return require("base64-js").toByteArray(str);
}

SlowBuffer.byteLength = function (str, encoding) {
  switch (encoding || "utf8") {
    case 'hex':
      return str.length / 2;

    case 'utf8':
    case 'utf-8':
      return utf8ToBytes(str).length;

    case 'ascii':
    case 'binary':
      return str.length;

    case 'base64':
      return base64ToBytes(str).length;

    default:
      throw new Error('Unknown encoding');
  }
};

function blitBuffer(src, dst, offset, length) {
  var pos, i = 0;
  while (i < length) {
    if ((i+offset >= dst.length) || (i >= src.length))
      break;

    dst[i + offset] = src[i];
    i++;
  }
  return i;
}

SlowBuffer.prototype.utf8Write = function (string, offset, length) {
  var bytes, pos;
  return SlowBuffer._charsWritten =  blitBuffer(utf8ToBytes(string), this, offset, length);
};

SlowBuffer.prototype.asciiWrite = function (string, offset, length) {
  var bytes, pos;
  return SlowBuffer._charsWritten =  blitBuffer(asciiToBytes(string), this, offset, length);
};

SlowBuffer.prototype.binaryWrite = SlowBuffer.prototype.asciiWrite;

SlowBuffer.prototype.base64Write = function (string, offset, length) {
  var bytes, pos;
  return SlowBuffer._charsWritten = blitBuffer(base64ToBytes(string), this, offset, length);
};

SlowBuffer.prototype.base64Slice = function (start, end) {
  var bytes = Array.prototype.slice.apply(this, arguments)
  return require("base64-js").fromByteArray(bytes);
}

function decodeUtf8Char(str) {
  try {
    return decodeURIComponent(str);
  } catch (err) {
    return String.fromCharCode(0xFFFD); // UTF 8 invalid char
  }
}

SlowBuffer.prototype.utf8Slice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var res = "";
  var tmp = "";
  var i = 0;
  while (i < bytes.length) {
    if (bytes[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(bytes[i]);
      tmp = "";
    } else
      tmp += "%" + bytes[i].toString(16);

    i++;
  }

  return res + decodeUtf8Char(tmp);
}

SlowBuffer.prototype.asciiSlice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var ret = "";
  for (var i = 0; i < bytes.length; i++)
    ret += String.fromCharCode(bytes[i]);
  return ret;
}

SlowBuffer.prototype.binarySlice = SlowBuffer.prototype.asciiSlice;

SlowBuffer.prototype.inspect = function() {
  var out = [],
      len = this.length;
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i]);
    if (i == exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }
  return '<SlowBuffer ' + out.join(' ') + '>';
};


SlowBuffer.prototype.hexSlice = function(start, end) {
  var len = this.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var out = '';
  for (var i = start; i < end; i++) {
    out += toHex(this[i]);
  }
  return out;
};


SlowBuffer.prototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf8').toLowerCase();
  start = +start || 0;
  if (typeof end == 'undefined') end = this.length;

  // Fastpath empty strings
  if (+end == start) {
    return '';
  }

  switch (encoding) {
    case 'hex':
      return this.hexSlice(start, end);

    case 'utf8':
    case 'utf-8':
      return this.utf8Slice(start, end);

    case 'ascii':
      return this.asciiSlice(start, end);

    case 'binary':
      return this.binarySlice(start, end);

    case 'base64':
      return this.base64Slice(start, end);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Slice(start, end);

    default:
      throw new Error('Unknown encoding');
  }
};


SlowBuffer.prototype.hexWrite = function(string, offset, length) {
  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }

  // must be an even number of digits
  var strLen = string.length;
  if (strLen % 2) {
    throw new Error('Invalid hex string');
  }
  if (length > strLen / 2) {
    length = strLen / 2;
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16);
    if (isNaN(byte)) throw new Error('Invalid hex string');
    this[offset + i] = byte;
  }
  SlowBuffer._charsWritten = i * 2;
  return i;
};


SlowBuffer.prototype.write = function(string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length;
      length = undefined;
    }
  } else {  // legacy
    var swap = encoding;
    encoding = offset;
    offset = length;
    length = swap;
  }

  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase();

  switch (encoding) {
    case 'hex':
      return this.hexWrite(string, offset, length);

    case 'utf8':
    case 'utf-8':
      return this.utf8Write(string, offset, length);

    case 'ascii':
      return this.asciiWrite(string, offset, length);

    case 'binary':
      return this.binaryWrite(string, offset, length);

    case 'base64':
      return this.base64Write(string, offset, length);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Write(string, offset, length);

    default:
      throw new Error('Unknown encoding');
  }
};


// slice(start, end)
SlowBuffer.prototype.slice = function(start, end) {
  if (end === undefined) end = this.length;

  if (end > this.length) {
    throw new Error('oob');
  }
  if (start > end) {
    throw new Error('oob');
  }

  return new Buffer(this, end - start, +start);
};

SlowBuffer.prototype.copy = function(target, targetstart, sourcestart, sourceend) {
  var temp = [];
  for (var i=sourcestart; i<sourceend; i++) {
    assert.ok(typeof this[i] !== 'undefined', "copying undefined buffer bytes!");
    temp.push(this[i]);
  }

  for (var i=targetstart; i<targetstart+temp.length; i++) {
    target[i] = temp[i-targetstart];
  }
};

SlowBuffer.prototype.fill = function(value, start, end) {
  if (end > this.length) {
    throw new Error('oob');
  }
  if (start > end) {
    throw new Error('oob');
  }

  for (var i = start; i < end; i++) {
    this[i] = value;
  }
}

function coerce(length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length);
  return length < 0 ? 0 : length;
}


// Buffer

function Buffer(subject, encoding, offset) {
  if (!(this instanceof Buffer)) {
    return new Buffer(subject, encoding, offset);
  }

  var type;

  // Are we slicing?
  if (typeof offset === 'number') {
    this.length = coerce(encoding);
    this.parent = subject;
    this.offset = offset;
  } else {
    // Find the length
    switch (type = typeof subject) {
      case 'number':
        this.length = coerce(subject);
        break;

      case 'string':
        this.length = Buffer.byteLength(subject, encoding);
        break;

      case 'object': // Assume object is an array
        this.length = coerce(subject.length);
        break;

      default:
        throw new Error('First argument needs to be a number, ' +
                        'array or string.');
    }

    if (this.length > Buffer.poolSize) {
      // Big buffer, just alloc one.
      this.parent = new SlowBuffer(this.length);
      this.offset = 0;

    } else {
      // Small buffer.
      if (!pool || pool.length - pool.used < this.length) allocPool();
      this.parent = pool;
      this.offset = pool.used;
      pool.used += this.length;
    }

    // Treat array-ish objects as a byte array.
    if (isArrayIsh(subject)) {
      for (var i = 0; i < this.length; i++) {
        if (subject instanceof Buffer) {
          this.parent[i + this.offset] = subject.readUInt8(i);
        }
        else {
          this.parent[i + this.offset] = subject[i];
        }
      }
    } else if (type == 'string') {
      // We are a string
      this.length = this.write(subject, 0, encoding);
    }
  }

}

function isArrayIsh(subject) {
  return Array.isArray(subject) || Buffer.isBuffer(subject) ||
         subject && typeof subject === 'object' &&
         typeof subject.length === 'number';
}

exports.SlowBuffer = SlowBuffer;
exports.Buffer = Buffer;

Buffer.poolSize = 8 * 1024;
var pool;

function allocPool() {
  pool = new SlowBuffer(Buffer.poolSize);
  pool.used = 0;
}


// Static methods
Buffer.isBuffer = function isBuffer(b) {
  return b instanceof Buffer || b instanceof SlowBuffer;
};

Buffer.concat = function (list, totalLength) {
  if (!Array.isArray(list)) {
    throw new Error("Usage: Buffer.concat(list, [totalLength])\n \
      list should be an Array.");
  }

  if (list.length === 0) {
    return new Buffer(0);
  } else if (list.length === 1) {
    return list[0];
  }

  if (typeof totalLength !== 'number') {
    totalLength = 0;
    for (var i = 0; i < list.length; i++) {
      var buf = list[i];
      totalLength += buf.length;
    }
  }

  var buffer = new Buffer(totalLength);
  var pos = 0;
  for (var i = 0; i < list.length; i++) {
    var buf = list[i];
    buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer;
};

// Inspect
Buffer.prototype.inspect = function inspect() {
  var out = [],
      len = this.length;

  for (var i = 0; i < len; i++) {
    out[i] = toHex(this.parent[i + this.offset]);
    if (i == exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }

  return '<Buffer ' + out.join(' ') + '>';
};


Buffer.prototype.get = function get(i) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this.parent[this.offset + i];
};


Buffer.prototype.set = function set(i, v) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this.parent[this.offset + i] = v;
};


// write(string, offset = 0, length = buffer.length-offset, encoding = 'utf8')
Buffer.prototype.write = function(string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length;
      length = undefined;
    }
  } else {  // legacy
    var swap = encoding;
    encoding = offset;
    offset = length;
    length = swap;
  }

  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase();

  var ret;
  switch (encoding) {
    case 'hex':
      ret = this.parent.hexWrite(string, this.offset + offset, length);
      break;

    case 'utf8':
    case 'utf-8':
      ret = this.parent.utf8Write(string, this.offset + offset, length);
      break;

    case 'ascii':
      ret = this.parent.asciiWrite(string, this.offset + offset, length);
      break;

    case 'binary':
      ret = this.parent.binaryWrite(string, this.offset + offset, length);
      break;

    case 'base64':
      // Warning: maxLength not taken into account in base64Write
      ret = this.parent.base64Write(string, this.offset + offset, length);
      break;

    case 'ucs2':
    case 'ucs-2':
      ret = this.parent.ucs2Write(string, this.offset + offset, length);
      break;

    default:
      throw new Error('Unknown encoding');
  }

  Buffer._charsWritten = SlowBuffer._charsWritten;

  return ret;
};


// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf8').toLowerCase();

  if (typeof start == 'undefined' || start < 0) {
    start = 0;
  } else if (start > this.length) {
    start = this.length;
  }

  if (typeof end == 'undefined' || end > this.length) {
    end = this.length;
  } else if (end < 0) {
    end = 0;
  }

  start = start + this.offset;
  end = end + this.offset;

  switch (encoding) {
    case 'hex':
      return this.parent.hexSlice(start, end);

    case 'utf8':
    case 'utf-8':
      return this.parent.utf8Slice(start, end);

    case 'ascii':
      return this.parent.asciiSlice(start, end);

    case 'binary':
      return this.parent.binarySlice(start, end);

    case 'base64':
      return this.parent.base64Slice(start, end);

    case 'ucs2':
    case 'ucs-2':
      return this.parent.ucs2Slice(start, end);

    default:
      throw new Error('Unknown encoding');
  }
};


// byteLength
Buffer.byteLength = SlowBuffer.byteLength;


// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill(value, start, end) {
  value || (value = 0);
  start || (start = 0);
  end || (end = this.length);

  if (typeof value === 'string') {
    value = value.charCodeAt(0);
  }
  if (!(typeof value === 'number') || isNaN(value)) {
    throw new Error('value is not a number');
  }

  if (end < start) throw new Error('end < start');

  // Fill 0 bytes; we're done
  if (end === start) return 0;
  if (this.length == 0) return 0;

  if (start < 0 || start >= this.length) {
    throw new Error('start out of bounds');
  }

  if (end < 0 || end > this.length) {
    throw new Error('end out of bounds');
  }

  return this.parent.fill(value,
                          start + this.offset,
                          end + this.offset);
};


// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function(target, target_start, start, end) {
  var source = this;
  start || (start = 0);
  end || (end = this.length);
  target_start || (target_start = 0);

  if (end < start) throw new Error('sourceEnd < sourceStart');

  // Copy 0 bytes; we're done
  if (end === start) return 0;
  if (target.length == 0 || source.length == 0) return 0;

  if (target_start < 0 || target_start >= target.length) {
    throw new Error('targetStart out of bounds');
  }

  if (start < 0 || start >= source.length) {
    throw new Error('sourceStart out of bounds');
  }

  if (end < 0 || end > source.length) {
    throw new Error('sourceEnd out of bounds');
  }

  // Are we oob?
  if (end > this.length) {
    end = this.length;
  }

  if (target.length - target_start < end - start) {
    end = target.length - target_start + start;
  }

  return this.parent.copy(target.parent,
                          target_start + target.offset,
                          start + this.offset,
                          end + this.offset);
};


// slice(start, end)
Buffer.prototype.slice = function(start, end) {
  if (end === undefined) end = this.length;
  if (end > this.length) throw new Error('oob');
  if (start > end) throw new Error('oob');

  return new Buffer(this.parent, end - start, +start + this.offset);
};


// Legacy methods for backwards compatibility.

Buffer.prototype.utf8Slice = function(start, end) {
  return this.toString('utf8', start, end);
};

Buffer.prototype.binarySlice = function(start, end) {
  return this.toString('binary', start, end);
};

Buffer.prototype.asciiSlice = function(start, end) {
  return this.toString('ascii', start, end);
};

Buffer.prototype.utf8Write = function(string, offset) {
  return this.write(string, offset, 'utf8');
};

Buffer.prototype.binaryWrite = function(string, offset) {
  return this.write(string, offset, 'binary');
};

Buffer.prototype.asciiWrite = function(string, offset) {
  return this.write(string, offset, 'ascii');
};

Buffer.prototype.readUInt8 = function(offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return;

  return buffer.parent[buffer.offset + offset];
};

function readUInt16(buffer, offset, isBigEndian, noAssert) {
  var val = 0;


  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return 0;

  if (isBigEndian) {
    val = buffer.parent[buffer.offset + offset] << 8;
    if (offset + 1 < buffer.length) {
      val |= buffer.parent[buffer.offset + offset + 1];
    }
  } else {
    val = buffer.parent[buffer.offset + offset];
    if (offset + 1 < buffer.length) {
      val |= buffer.parent[buffer.offset + offset + 1] << 8;
    }
  }

  return val;
}

Buffer.prototype.readUInt16LE = function(offset, noAssert) {
  return readUInt16(this, offset, false, noAssert);
};

Buffer.prototype.readUInt16BE = function(offset, noAssert) {
  return readUInt16(this, offset, true, noAssert);
};

function readUInt32(buffer, offset, isBigEndian, noAssert) {
  var val = 0;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return 0;

  if (isBigEndian) {
    if (offset + 1 < buffer.length)
      val = buffer.parent[buffer.offset + offset + 1] << 16;
    if (offset + 2 < buffer.length)
      val |= buffer.parent[buffer.offset + offset + 2] << 8;
    if (offset + 3 < buffer.length)
      val |= buffer.parent[buffer.offset + offset + 3];
    val = val + (buffer.parent[buffer.offset + offset] << 24 >>> 0);
  } else {
    if (offset + 2 < buffer.length)
      val = buffer.parent[buffer.offset + offset + 2] << 16;
    if (offset + 1 < buffer.length)
      val |= buffer.parent[buffer.offset + offset + 1] << 8;
    val |= buffer.parent[buffer.offset + offset];
    if (offset + 3 < buffer.length)
      val = val + (buffer.parent[buffer.offset + offset + 3] << 24 >>> 0);
  }

  return val;
}

Buffer.prototype.readUInt32LE = function(offset, noAssert) {
  return readUInt32(this, offset, false, noAssert);
};

Buffer.prototype.readUInt32BE = function(offset, noAssert) {
  return readUInt32(this, offset, true, noAssert);
};


/*
 * Signed integer types, yay team! A reminder on how two's complement actually
 * works. The first bit is the signed bit, i.e. tells us whether or not the
 * number should be positive or negative. If the two's complement value is
 * positive, then we're done, as it's equivalent to the unsigned representation.
 *
 * Now if the number is positive, you're pretty much done, you can just leverage
 * the unsigned translations and return those. Unfortunately, negative numbers
 * aren't quite that straightforward.
 *
 * At first glance, one might be inclined to use the traditional formula to
 * translate binary numbers between the positive and negative values in two's
 * complement. (Though it doesn't quite work for the most negative value)
 * Mainly:
 *  - invert all the bits
 *  - add one to the result
 *
 * Of course, this doesn't quite work in Javascript. Take for example the value
 * of -128. This could be represented in 16 bits (big-endian) as 0xff80. But of
 * course, Javascript will do the following:
 *
 * > ~0xff80
 * -65409
 *
 * Whoh there, Javascript, that's not quite right. But wait, according to
 * Javascript that's perfectly correct. When Javascript ends up seeing the
 * constant 0xff80, it has no notion that it is actually a signed number. It
 * assumes that we've input the unsigned value 0xff80. Thus, when it does the
 * binary negation, it casts it into a signed value, (positive 0xff80). Then
 * when you perform binary negation on that, it turns it into a negative number.
 *
 * Instead, we're going to have to use the following general formula, that works
 * in a rather Javascript friendly way. I'm glad we don't support this kind of
 * weird numbering scheme in the kernel.
 *
 * (BIT-MAX - (unsigned)val + 1) * -1
 *
 * The astute observer, may think that this doesn't make sense for 8-bit numbers
 * (really it isn't necessary for them). However, when you get 16-bit numbers,
 * you do. Let's go back to our prior example and see how this will look:
 *
 * (0xffff - 0xff80 + 1) * -1
 * (0x007f + 1) * -1
 * (0x0080) * -1
 */
Buffer.prototype.readInt8 = function(offset, noAssert) {
  var buffer = this;
  var neg;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return;

  neg = buffer.parent[buffer.offset + offset] & 0x80;
  if (!neg) {
    return (buffer.parent[buffer.offset + offset]);
  }

  return ((0xff - buffer.parent[buffer.offset + offset] + 1) * -1);
};

function readInt16(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt16(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x8000;
  if (!neg) {
    return val;
  }

  return (0xffff - val + 1) * -1;
}

Buffer.prototype.readInt16LE = function(offset, noAssert) {
  return readInt16(this, offset, false, noAssert);
};

Buffer.prototype.readInt16BE = function(offset, noAssert) {
  return readInt16(this, offset, true, noAssert);
};

function readInt32(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt32(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x80000000;
  if (!neg) {
    return (val);
  }

  return (0xffffffff - val + 1) * -1;
}

Buffer.prototype.readInt32LE = function(offset, noAssert) {
  return readInt32(this, offset, false, noAssert);
};

Buffer.prototype.readInt32BE = function(offset, noAssert) {
  return readInt32(this, offset, true, noAssert);
};

function readFloat(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.readFloatLE = function(offset, noAssert) {
  return readFloat(this, offset, false, noAssert);
};

Buffer.prototype.readFloatBE = function(offset, noAssert) {
  return readFloat(this, offset, true, noAssert);
};

function readDouble(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 7 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.readDoubleLE = function(offset, noAssert) {
  return readDouble(this, offset, false, noAssert);
};

Buffer.prototype.readDoubleBE = function(offset, noAssert) {
  return readDouble(this, offset, true, noAssert);
};


/*
 * We have to make sure that the value is a valid integer. This means that it is
 * non-negative. It has no fractional component and that it does not exceed the
 * maximum allowed value.
 *
 *      value           The number to check for validity
 *
 *      max             The maximum value
 */
function verifuint(value, max) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value >= 0,
      'specified a negative value for writing an unsigned value');

  assert.ok(value <= max, 'value is larger than maximum value for type');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

Buffer.prototype.writeUInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xff);
  }

  if (offset < buffer.length) {
    buffer.parent[buffer.offset + offset] = value;
  }
};

function writeUInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffff);
  }

  for (var i = 0; i < Math.min(buffer.length - offset, 2); i++) {
    buffer.parent[buffer.offset + offset + i] =
        (value & (0xff << (8 * (isBigEndian ? 1 - i : i)))) >>>
            (isBigEndian ? 1 - i : i) * 8;
  }

}

Buffer.prototype.writeUInt16LE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt16BE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, true, noAssert);
};

function writeUInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffffffff);
  }

  for (var i = 0; i < Math.min(buffer.length - offset, 4); i++) {
    buffer.parent[buffer.offset + offset + i] =
        (value >>> (isBigEndian ? 3 - i : i) * 8) & 0xff;
  }
}

Buffer.prototype.writeUInt32LE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt32BE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, true, noAssert);
};


/*
 * We now move onto our friends in the signed number category. Unlike unsigned
 * numbers, we're going to have to worry a bit more about how we put values into
 * arrays. Since we are only worrying about signed 32-bit values, we're in
 * slightly better shape. Unfortunately, we really can't do our favorite binary
 * & in this system. It really seems to do the wrong thing. For example:
 *
 * > -32 & 0xff
 * 224
 *
 * What's happening above is really: 0xe0 & 0xff = 0xe0. However, the results of
 * this aren't treated as a signed number. Ultimately a bad thing.
 *
 * What we're going to want to do is basically create the unsigned equivalent of
 * our representation and pass that off to the wuint* functions. To do that
 * we're going to do the following:
 *
 *  - if the value is positive
 *      we can pass it directly off to the equivalent wuint
 *  - if the value is negative
 *      we do the following computation:
 *         mb + val + 1, where
 *         mb   is the maximum unsigned value in that byte size
 *         val  is the Javascript negative integer
 *
 *
 * As a concrete value, take -128. In signed 16 bits this would be 0xff80. If
 * you do out the computations:
 *
 * 0xffff - 128 + 1
 * 0xffff - 127
 * 0xff80
 *
 * You can then encode this value as the signed version. This is really rather
 * hacky, but it should work and get the job done which is our goal here.
 */

/*
 * A series of checks to make sure we actually have a signed 32-bit number
 */
function verifsint(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

function verifIEEE754(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');
}

Buffer.prototype.writeInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7f, -0x80);
  }

  if (value >= 0) {
    buffer.writeUInt8(value, offset, noAssert);
  } else {
    buffer.writeUInt8(0xff + value + 1, offset, noAssert);
  }
};

function writeInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fff, -0x8000);
  }

  if (value >= 0) {
    writeUInt16(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt16(buffer, 0xffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt16LE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt16BE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, true, noAssert);
};

function writeInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fffffff, -0x80000000);
  }

  if (value >= 0) {
    writeUInt32(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt32(buffer, 0xffffffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt32LE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt32BE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, true, noAssert);
};

function writeFloat(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.writeFloatLE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, false, noAssert);
};

Buffer.prototype.writeFloatBE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, true, noAssert);
};

function writeDouble(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 7 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.writeDoubleLE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, false, noAssert);
};

Buffer.prototype.writeDoubleBE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, true, noAssert);
};

SlowBuffer.prototype.readUInt8 = Buffer.prototype.readUInt8;
SlowBuffer.prototype.readUInt16LE = Buffer.prototype.readUInt16LE;
SlowBuffer.prototype.readUInt16BE = Buffer.prototype.readUInt16BE;
SlowBuffer.prototype.readUInt32LE = Buffer.prototype.readUInt32LE;
SlowBuffer.prototype.readUInt32BE = Buffer.prototype.readUInt32BE;
SlowBuffer.prototype.readInt8 = Buffer.prototype.readInt8;
SlowBuffer.prototype.readInt16LE = Buffer.prototype.readInt16LE;
SlowBuffer.prototype.readInt16BE = Buffer.prototype.readInt16BE;
SlowBuffer.prototype.readInt32LE = Buffer.prototype.readInt32LE;
SlowBuffer.prototype.readInt32BE = Buffer.prototype.readInt32BE;
SlowBuffer.prototype.readFloatLE = Buffer.prototype.readFloatLE;
SlowBuffer.prototype.readFloatBE = Buffer.prototype.readFloatBE;
SlowBuffer.prototype.readDoubleLE = Buffer.prototype.readDoubleLE;
SlowBuffer.prototype.readDoubleBE = Buffer.prototype.readDoubleBE;
SlowBuffer.prototype.writeUInt8 = Buffer.prototype.writeUInt8;
SlowBuffer.prototype.writeUInt16LE = Buffer.prototype.writeUInt16LE;
SlowBuffer.prototype.writeUInt16BE = Buffer.prototype.writeUInt16BE;
SlowBuffer.prototype.writeUInt32LE = Buffer.prototype.writeUInt32LE;
SlowBuffer.prototype.writeUInt32BE = Buffer.prototype.writeUInt32BE;
SlowBuffer.prototype.writeInt8 = Buffer.prototype.writeInt8;
SlowBuffer.prototype.writeInt16LE = Buffer.prototype.writeInt16LE;
SlowBuffer.prototype.writeInt16BE = Buffer.prototype.writeInt16BE;
SlowBuffer.prototype.writeInt32LE = Buffer.prototype.writeInt32LE;
SlowBuffer.prototype.writeInt32BE = Buffer.prototype.writeInt32BE;
SlowBuffer.prototype.writeFloatLE = Buffer.prototype.writeFloatLE;
SlowBuffer.prototype.writeFloatBE = Buffer.prototype.writeFloatBE;
SlowBuffer.prototype.writeDoubleLE = Buffer.prototype.writeDoubleLE;
SlowBuffer.prototype.writeDoubleBE = Buffer.prototype.writeDoubleBE;

})()
},{"assert":24,"./buffer_ieee754":28,"base64-js":29}],29:[function(require,module,exports){
(function (exports) {
	'use strict';

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	function b64ToByteArray(b64) {
		var i, j, l, tmp, placeHolders, arr;
	
		if (b64.length % 4 > 0) {
			throw 'Invalid string. Length must be a multiple of 4';
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		placeHolders = b64.indexOf('=');
		placeHolders = placeHolders > 0 ? b64.length - placeHolders : 0;

		// base64 is 4/3 + up to two characters of the original data
		arr = [];//new Uint8Array(b64.length * 3 / 4 - placeHolders);

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length;

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (lookup.indexOf(b64[i]) << 18) | (lookup.indexOf(b64[i + 1]) << 12) | (lookup.indexOf(b64[i + 2]) << 6) | lookup.indexOf(b64[i + 3]);
			arr.push((tmp & 0xFF0000) >> 16);
			arr.push((tmp & 0xFF00) >> 8);
			arr.push(tmp & 0xFF);
		}

		if (placeHolders === 2) {
			tmp = (lookup.indexOf(b64[i]) << 2) | (lookup.indexOf(b64[i + 1]) >> 4);
			arr.push(tmp & 0xFF);
		} else if (placeHolders === 1) {
			tmp = (lookup.indexOf(b64[i]) << 10) | (lookup.indexOf(b64[i + 1]) << 4) | (lookup.indexOf(b64[i + 2]) >> 2);
			arr.push((tmp >> 8) & 0xFF);
			arr.push(tmp & 0xFF);
		}

		return arr;
	}

	function uint8ToBase64(uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length;

		function tripletToBase64 (num) {
			return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
		};

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
			output += tripletToBase64(temp);
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1];
				output += lookup[temp >> 2];
				output += lookup[(temp << 4) & 0x3F];
				output += '==';
				break;
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
				output += lookup[temp >> 10];
				output += lookup[(temp >> 4) & 0x3F];
				output += lookup[(temp << 2) & 0x3F];
				output += '=';
				break;
		}

		return output;
	}

	module.exports.toByteArray = b64ToByteArray;
	module.exports.fromByteArray = uint8ToBase64;
}());

},{}],26:[function(require,module,exports){
(function(){var dataview = require('jDataView');

// Generated by CoffeeScript 1.6.2
(function(global) {
  var NBTReader, TAG, TAG_Byte, TAG_Byte_Array, TAG_Compound, TAG_Double, TAG_End, TAG_Float, TAG_Int, TAG_Int_Array, TAG_List, TAG_Long, TAG_Short, TAG_String, TAG_Unknown, tags, _ref, _ref1, _ref10, _ref11, _ref12, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8, _ref9,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };


  tags = {
    '_0': 'TAG_End',
    '_1': 'TAG_Byte',
    '_2': 'TAG_Short',
    '_3': 'TAG_Int',
    '_4': 'TAG_Long',
    '_5': 'TAG_Float',
    '_6': 'TAG_Double',
    '_7': 'TAG_Byte_Array',
    '_8': 'TAG_String',
    '_9': 'TAG_List',
    '_10': 'TAG_Compound',
    '_11': 'TAG_Int_Array'
  };

  TAG = (function() {
    function TAG(reader) {
      this.reader = reader;
      this.readName = __bind(this.readName, this);
    }

    TAG.prototype.readName = function() {
      var tagName;

      tagName = new TAG_String(this.reader);
      this.name = tagName.read();
      return this.name;
    };

    return TAG;

  })();

  TAG_End = (function(_super) {
    __extends(TAG_End, _super);

    function TAG_End() {
      this.read = __bind(this.read, this);
      this.readName = __bind(this.readName, this);      _ref = TAG_End.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    TAG_End.prototype.readName = function() {
      return 'END';
    };

    TAG_End.prototype.read = function() {
      return '=END=';
    };

    return TAG_End;

  })(TAG);

  TAG_Unknown = (function(_super) {
    __extends(TAG_Unknown, _super);

    function TAG_Unknown() {
      this.read = __bind(this.read, this);      _ref1 = TAG_Unknown.__super__.constructor.apply(this, arguments);
      return _ref1;
    }

    TAG_Unknown.prototype.read = function() {
      return 'unknown tag type';
    };

    return TAG_Unknown;

  })(TAG);

  TAG_Int = (function(_super) {
    __extends(TAG_Int, _super);

    function TAG_Int() {
      this.read = __bind(this.read, this);      _ref2 = TAG_Int.__super__.constructor.apply(this, arguments);
      return _ref2;
    }

    TAG_Int.prototype.read = function() {
      return this.reader.getInt32();
    };

    return TAG_Int;

  })(TAG);

  TAG_Float = (function(_super) {
    __extends(TAG_Float, _super);

    function TAG_Float() {
      this.read = __bind(this.read, this);      _ref3 = TAG_Float.__super__.constructor.apply(this, arguments);
      return _ref3;
    }

    TAG_Float.prototype.read = function() {
      return this.reader.getFloat32();
    };

    return TAG_Float;

  })(TAG);

  TAG_Double = (function(_super) {
    __extends(TAG_Double, _super);

    function TAG_Double() {
      this.read = __bind(this.read, this);      _ref4 = TAG_Double.__super__.constructor.apply(this, arguments);
      return _ref4;
    }

    TAG_Double.prototype.read = function() {
      return this.reader.getFloat64();
    };

    return TAG_Double;

  })(TAG);

  TAG_Byte = (function(_super) {
    __extends(TAG_Byte, _super);

    function TAG_Byte() {
      this.read = __bind(this.read, this);      _ref5 = TAG_Byte.__super__.constructor.apply(this, arguments);
      return _ref5;
    }

    TAG_Byte.prototype.read = function() {
      return this.reader.getInt8();
    };

    return TAG_Byte;

  })(TAG);

  TAG_Short = (function(_super) {
    __extends(TAG_Short, _super);

    function TAG_Short() {
      this.read = __bind(this.read, this);      _ref6 = TAG_Short.__super__.constructor.apply(this, arguments);
      return _ref6;
    }

    TAG_Short.prototype.read = function() {
      return this.reader.getInt16();
    };

    return TAG_Short;

  })(TAG);

  TAG_String = (function(_super) {
    __extends(TAG_String, _super);

    function TAG_String() {
      this.read = __bind(this.read, this);      _ref7 = TAG_String.__super__.constructor.apply(this, arguments);
      return _ref7;
    }

    TAG_String.prototype.read = function() {
      var length;

      if (this.reader == null) {
        return 0;
      }
      length = this.reader.getInt16();
      if (length === 0) {
        return '';
      } else {
        return this.reader.getString(length);
      }
    };

    return TAG_String;

  })(TAG);

  TAG_Long = (function(_super) {
    __extends(TAG_Long, _super);

    function TAG_Long() {
      this.read = __bind(this.read, this);      _ref8 = TAG_Long.__super__.constructor.apply(this, arguments);
      return _ref8;
    }

    TAG_Long.prototype.read = function() {
      return this.reader.getFloat64();
    };

    return TAG_Long;

  })(TAG);

  TAG_List = (function(_super) {
    __extends(TAG_List, _super);

    function TAG_List() {
      this.read = __bind(this.read, this);      _ref9 = TAG_List.__super__.constructor.apply(this, arguments);
      return _ref9;
    }

    TAG_List.prototype.read = function() {
      var arr, i, length, tag, type, _i, _ref10;

      type = this.reader.getInt8();
      length = this.reader.getInt32();
      arr = [];
      if (length === 0) {
        return arr;
      }
      for (i = _i = 0, _ref10 = length - 1; 0 <= _ref10 ? _i <= _ref10 : _i >= _ref10; i = 0 <= _ref10 ? ++_i : --_i) {
        tag = this.reader.read(type);
        arr.push(tag);
      }
      return arr;
    };

    return TAG_List;

  })(TAG);

  TAG_Byte_Array = (function(_super) {
    __extends(TAG_Byte_Array, _super);

    function TAG_Byte_Array() {
      this.read = __bind(this.read, this);      _ref10 = TAG_Byte_Array.__super__.constructor.apply(this, arguments);
      return _ref10;
    }

    TAG_Byte_Array.prototype.read = function() {
      var arr, length, seekTo, type;

      type = 1;
      length = this.reader.getInt32();
      arr = new Uint8Array(this.reader.dataview.buffer, this.reader.dataview.tell(), length);
      seekTo = this.reader.dataview.tell() + length;
      this.reader.dataview.seek(seekTo);
      return arr;
    };

    return TAG_Byte_Array;

  })(TAG);

  TAG_Int_Array = (function(_super) {
    __extends(TAG_Int_Array, _super);

    function TAG_Int_Array() {
      this.read = __bind(this.read, this);      _ref11 = TAG_Int_Array.__super__.constructor.apply(this, arguments);
      return _ref11;
    }

    TAG_Int_Array.prototype.read = function() {
      var arr, i, length, type, _i, _ref12;

      type = 3;
      length = this.reader.getInt32();
      arr = [];
      for (i = _i = 0, _ref12 = length - 1; 0 <= _ref12 ? _i <= _ref12 : _i >= _ref12; i = 0 <= _ref12 ? ++_i : --_i) {
        arr.push(this.reader.getInt32());
      }
      return arr;
    };

    return TAG_Int_Array;

  })(TAG);

  TAG_Compound = (function(_super) {
    __extends(TAG_Compound, _super);

    function TAG_Compound() {
      this.read = __bind(this.read, this);      _ref12 = TAG_Compound.__super__.constructor.apply(this, arguments);
      return _ref12;
    }

    TAG_Compound.prototype.read = function() {
      var bob, e, i, key, obj, tag, val;

      obj = {};
      i = 0;
      tag = 'dummy';
      while ((tag != null) && tag !== '=END=' && i < 160) {
        try {
          tag = this.reader.read();
          if ((tag != null) && tag !== '=END=') {
            for (key in tag) {
              val = tag[key];
              if (key === 'Y') {
                bob = 'test';
              }
              obj[key] = val;
            }
          }
        } catch (_error) {
          e = _error;
          console.log('Error in TAG_Compound');
          console.log(e);
        }
        i++;
      }
      return obj;
    };

    return TAG_Compound;

  })(TAG);

  global.NBTReader = (function() {
    function NBTReader(nbtbytes) {
      var i, _i, _ref13;

      this.nbtbytes = nbtbytes;
      this.getString = __bind(this.getString, this);
      this.getInt32 = __bind(this.getInt32, this);
      this.getInt16 = __bind(this.getInt16, this);
      this.getFloat64 = __bind(this.getFloat64, this);
      this.getFloat32 = __bind(this.getFloat32, this);
      this.getInt8 = __bind(this.getInt8, this);
      this.getUint8 = __bind(this.getUint8, this);
      this.nbtBuffer = new ArrayBuffer(nbtbytes.length);
      this.byteView = new Uint8Array(this.nbtBuffer);
      for (i = _i = 0, _ref13 = nbtbytes.length - 1; 0 <= _ref13 ? _i <= _ref13 : _i >= _ref13; i = 0 <= _ref13 ? ++_i : --_i) {
        this.byteView[i] = nbtbytes[i];
      }
      this.dataview = new dataview(this.nbtBuffer);
      this.dataview.seek.call(this.dataview, 0);
    }

    NBTReader.prototype.getUint8 = function() {
      return this.dataview.getUint8.call(this.dataview);
    };

    NBTReader.prototype.getInt8 = function() {
      return this.dataview.getInt8.call(this.dataview);
    };

    NBTReader.prototype.getFloat32 = function() {
      return this.dataview.getFloat32.call(this.dataview);
    };

    NBTReader.prototype.getFloat64 = function() {
      return this.dataview.getFloat64.call(this.dataview);
    };

    NBTReader.prototype.getInt16 = function() {
      return this.dataview.getInt16.call(this.dataview);
    };

    NBTReader.prototype.getInt32 = function() {
      return this.dataview.getInt32.call(this.dataview);
    };

    NBTReader.prototype.getString = function(length) {
      return this.dataview.getString.call(this.dataview, length);
    };

    NBTReader.prototype.read = function(typespec) {
      var e, name, name2, ret, tag, type, typeStr;

      try {
        type = null;
        if (typespec == null) {
          type = this.getUint8();
          if (type == null) {
            console.log('problem with type in nbt. type is:');
            console.log(type);
          }
        } else {
          type = typespec;
        }
        typeStr = '_' + type.toString();
        name = tags[typeStr];
        switch (name) {
          case 'TAG_End':
            tag = new TAG_End(this);
            break;
          case 'TAG_Byte':
            tag = new TAG_Byte(this);
            break;
          case 'TAG_Short':
            tag = new TAG_Short(this);
            break;
          case 'TAG_Int':
            tag = new TAG_Int(this);
            break;
          case 'TAG_Long':
            tag = new TAG_Long(this);
            break;
          case 'TAG_Float':
            tag = new TAG_Float(this);
            break;
          case 'TAG_Double':
            tag = new TAG_Double(this);
            break;
          case 'TAG_Byte_Array':
            tag = new TAG_Byte_Array(this);
            break;
          case 'TAG_Int_Array':
            tag = new TAG_Int_Array(this);
            break;
          case 'TAG_String':
            tag = new TAG_String(this);
            break;
          case 'TAG_List':
            tag = new TAG_List(this);
            break;
          case 'TAG_Compound':
            tag = new TAG_Compound(this);
            break;
          default:
            tag = new TAG_Unknown(this);
        }
        if (name === 'TAG_End') {
          return '=END=';
        }
        ret = {};
        name2 = '';
        if (typespec == null) {
          if (name !== 'TAG_End') {
            name2 = tag.readName();
            if (name === 'TAG_Compound' && name2 === '') {
              name2 = 'root';
            }
          } else {
            name2 = 'END';
          }
          ret[name2] = tag.read();
        } else {
          ret = tag.read();
        }
        return ret;
      } catch (_error) {
        e = _error;
        console.log('Error in nbt: ' + e.message);
        console.log(e.stack);
        return null;
      }
    };

    return NBTReader;

  })();

})(module.exports);

})()
},{"jDataView":25}],23:[function(require,module,exports){
var blockInfo = require('minecraft-blockinfo')

// Generated by CoffeeScript 1.6.2
var ChunkSizeX, ChunkSizeY, ChunkSizeZ, ChunkView, calcOpts, calcPoint, cubeCount, times, typeToCoords, typeToCoords2,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

ChunkSizeY = 256;
ChunkSizeZ = 16;
ChunkSizeX = 16;
cubeCount = 0;
calcOpts = {};
times = 0;

calcPoint = function(pos, opts) {
  var verts;

  verts = [];
  verts.push(pos[0] + opts.chunkX * 16 * 1.00000);
  verts.push((pos[1] + 1) * 1.0);
  verts.push(pos[2] + opts.chunkZ * 16 * 1.00000);
  return verts;
};

typeToCoords = function(type) {
  var s, x, y;

  if (type.t != null) {
    x = type.t[0];
    y = 15 - type.t[1];
    s = 0.0085;
    return [x / 16.0 + s, y / 16.0 + s, (x + 1.0) / 16.0 - s, y / 16.0 + s, (x + 1.0) / 16.0 - s, (y + 1.0) / 16.0 - s, x / 16.0 + s, (y + 1.0) / 16.0 - s];
  } else {
    return [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
  }
};

typeToCoords2 = function(type) {
  var s, x, y;

  if (type.t != null) {
    x = type.t[0];
    y = 15 - type.t[1];
    s = 0.0085;
    return [x / 16.0 + s, y / 16.0 + s, (x + 1.0) / 16.0 - s, y / 16.0 + s, (x + 1.0) / 16.0 - s, (y + 1.0) / 16.0 - s, x / 16.0 + s, y / 16.0 + s, (x + 1.0) / 16.0 - s, (y + 1.0) / 16.0 - s, x / 16.0 + s, (y + 1.0) / 16.0 - s];
  } else {
    return [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
  }
};

ChunkView = (function() {
  function ChunkView(options) {
    this.options = options;
    this.getBlockAt = __bind(this.getBlockAt, this);
    this.getSectionInfo = __bind(this.getSectionInfo, this);
    this.extractChunk = __bind(this.extractChunk, this);
    this.extractVoxel = __bind(this.extractVoxel, this);
    this.transNeighbors = __bind(this.transNeighbors, this);
    this.getBlockInfo = __bind(this.getBlockInfo, this);
    this.index = 0;
    this.nbt = options.nbt;
    this.pos = options.pos;
    this.torches = [];
    this.unknown = [];
    this.notexture = [];
    this.rotcent = true;
    this.filled = [];
    this.nomatch = {};
    this.special = {};
    if (this.options.ymin != null) {
      this.ymin = this.options.ymin;
    } else {
      this.ymin = 60;
    }
    if ((this.options.superflat != null) === 'true') {
      this.options.superflat = true;
    }
    if (this.options.superflat != null) {
      this.superflat = this.options.superflat;
    } else {
      this.superflat = false;
    }
    if (this.options.showstuff != null) {
      this.showStuff = this.options.showstuff;
    } else {
      this.showStuff = 'diamondsmoss';
    }
    if (options.ymin != null) {
      this.ymin = options.ymin;
    }
  }
  
  ChunkView.prototype.getPosition = function() {
    return [this.nbt.root.Level.xPos, this.nbt.root.Level.yPos]
  }

  ChunkView.prototype.getBlockAt = function(x, y, z) {
    var blockpos, offset, section, sectionnum, sections, _i, _len, _ref;

    if (((_ref = this.nbt.root) != null ? _ref.Level.Sections : void 0) != null) {
      sections = this.nbt.root.Level.Sections;
    } else {
      sections = this.nbt.root.Sections;
    }
    if (!sections) {
      return -1;
    }
    sectionnum = Math.floor(y / 16);
    offset = ((y % 16) * 256) + (z * 16) + x;
    blockpos = offset;
    for (_i = 0, _len = sections.length; _i < _len; _i++) {
      section = sections[_i];
      if (section !== void 0 && section.Y * 1 === sectionnum * 1) {
        return section.Blocks[blockpos];
      }
    }
    return -1;
  };

  ChunkView.prototype.transNeighbors = function(x, y, z) {
    var blockID, i, j, k, _i, _j, _k, _ref, _ref1, _ref2, _ref3, _ref4, _ref5;

    for (i = _i = _ref = x - 1, _ref1 = x + 1; _ref <= _ref1 ? _i <= _ref1 : _i >= _ref1; i = _ref <= _ref1 ? ++_i : --_i) {
      if (i >= ChunkSizeX) {
        continue;
      }
      for (j = _j = _ref2 = y - 1, _ref3 = y + 1; _ref2 <= _ref3 ? _j <= _ref3 : _j >= _ref3; j = _ref2 <= _ref3 ? ++_j : --_j) {
        for (k = _k = _ref4 = z - 1, _ref5 = z + 1; _ref4 <= _ref5 ? _k <= _ref5 : _k >= _ref5; k = _ref4 <= _ref5 ? ++_k : --_k) {
          if (k >= ChunkSizeZ) {
            continue;
          }
          if (!(i === x && j === y && k === z)) {
            blockID = this.getBlockAt(i, j, k);
            if (blockID === 0 || blockID === -1) {
              return true;
            }
          }
        }
      }
    }
    return false;
  };

  ChunkView.prototype.extractChunk = function(cb) {
    this.textcoords = [];
    this.cubeCount = 0;
    if (this.nbt.root.Level.Sections != null) {
      var sections = this.nbt.root.Level.Sections;
    } else {
      var sections = this.nbt.root.Sections;
    }
    if (!sections) return
    for (var i = 0, len = sections.length; i < len; i++) {
      var section = sections[i];
      if (section !== void 0) {
        var Y = section.Y * 1
        var ymin = Y * 16
        var xmin = 0
        var zmin = 0
        var ymax = Y * 16 + 15
        var xmax = ChunkSizeX - 1
        var zmax = ChunkSizeZ - 1
        var x, y, z, _i, _j, _k, _l, _len, _ref, _ref1, _ref2, _ref3
        for (y = _j = _ref = ymin, _ref1 = ymax; _ref <= _ref1 ? _j <= _ref1 : _j >= _ref1; y = _ref <= _ref1 ? ++_j : --_j) {
          for (x = _k = xmin, _ref2 = xmax; 0 <= _ref2 ? _k <= _ref2 : _k >= _ref2; x = 0 <= _ref2 ? ++_k : --_k) {
            for (z = _l = zmin, _ref3 = zmax; 0 <= _ref3 ? _l <= _ref3 : _l >= _ref3; z = 0 <= _ref3 ? ++_l : --_l) {
              if (y < this.ymin) {
                continue;
              }
              this.extractVoxel(section, x, y, z, cb)
            }
          }
        }
      }
    }
  };
  
  ChunkView.prototype.extractVoxel = function(section, x, y, z, cb) {
    var offset = ((y % 16) * 256) + (z * 16) + x;
    var id = section.Blocks[offset];
    var blockType = blockInfo.blocks['_' + id];
    if (blockType == null) {
      id = -1;
    }
    var show = false;
    show = id > 0;
    if (!this.superflat && y < 60 && this.showStuff === 'diamondsmoss') {
      show = id === 48 || id === 56 || id === 4 || id === 52;
    } else {
      if (id !== 0 && id !== -1 && id !== -10) {
        show = this.transNeighbors(x, y, z);
      } else {
        show = false;
      }
    }
    if (show) {
      var block = this.getBlockInfo(x, y, z);
      if (block.type === 'colored_wool') {
        var meta = this.getSectionInfo('Data', x, y, z)
        block.type = block.data[meta]
      }
      cb(x, y, z, block);
    } else {
      var blah = 1;
    }
  }
  
  ChunkView.prototype.getSectionInfo = function(info, x, y, z) {
    var offset, section, sectionnum, sections, _i, _len;
    if (this.nbt.root.Level.Sections != null) {
      sections = this.nbt.root.Level.Sections;
    } else {
      sections = this.nbt.root.Sections;
    }
    if (!sections) return -1;
    sectionnum = Math.floor(y / 16);
    offset = ((y % 16) * 256) + (z * 16) + x;
    for (_i = 0, _len = sections.length; _i < _len; _i++) {
      section = sections[_i];
      if (section !== void 0 && section.Y * 1 === sectionnum * 1) {
        if (offset % 2 === 0) {
          return section[info][Math.floor(offset / 2)] & 0x0F;
        } else {
          return (section[info][Math.floor(offset / 2)] >> 4) & 0x0F;
        }
      }
    }
    return -1;
  };

  ChunkView.prototype.getBlockInfo = function(x, y, z) {
    var blockID, blockType, id;

    blockType = blockInfo.blocks["_-1"];
    id = this.getBlockAt(x, y, z);
    blockID = "_-1";
    if (id != null) {
      blockID = "_" + id.toString();
    }
    if (blockInfo.blocks[blockID] != null) {
      return blockInfo.blocks[blockID];
    } else {
      return blockInfo.blocks["_-1"];
    }
  };


  return ChunkView;

})();

module.exports = function(options) {
  return new ChunkView(options)
}

module.exports.calcPoint = calcPoint;

module.exports.typeToCoords = typeToCoords;


},{"minecraft-blockinfo":30}],27:[function(require,module,exports){
var blockInfo = require('minecraft-blockinfo')

// Generated by CoffeeScript 1.6.2
var ChunkSizeX, ChunkSizeY, ChunkSizeZ, ChunkView, calcOpts, calcPoint, cubeCount, times, typeToCoords, typeToCoords2,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

ChunkSizeY = 256;
ChunkSizeZ = 16;
ChunkSizeX = 16;
cubeCount = 0;
calcOpts = {};
times = 0;

calcPoint = function(pos, opts) {
  var verts;

  verts = [];
  verts.push(pos[0] + opts.chunkX * 16 * 1.00000);
  verts.push((pos[1] + 1) * 1.0);
  verts.push(pos[2] + opts.chunkZ * 16 * 1.00000);
  return verts;
};

typeToCoords = function(type) {
  var s, x, y;

  if (type.t != null) {
    x = type.t[0];
    y = 15 - type.t[1];
    s = 0.0085;
    return [x / 16.0 + s, y / 16.0 + s, (x + 1.0) / 16.0 - s, y / 16.0 + s, (x + 1.0) / 16.0 - s, (y + 1.0) / 16.0 - s, x / 16.0 + s, (y + 1.0) / 16.0 - s];
  } else {
    return [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
  }
};

typeToCoords2 = function(type) {
  var s, x, y;

  if (type.t != null) {
    x = type.t[0];
    y = 15 - type.t[1];
    s = 0.0085;
    return [x / 16.0 + s, y / 16.0 + s, (x + 1.0) / 16.0 - s, y / 16.0 + s, (x + 1.0) / 16.0 - s, (y + 1.0) / 16.0 - s, x / 16.0 + s, y / 16.0 + s, (x + 1.0) / 16.0 - s, (y + 1.0) / 16.0 - s, x / 16.0 + s, (y + 1.0) / 16.0 - s];
  } else {
    return [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
  }
};

ChunkView = (function() {
  function ChunkView(options) {
    this.options = options;
    this.getBlockAt = __bind(this.getBlockAt, this);
    this.getSectionInfo = __bind(this.getSectionInfo, this);
    this.extractChunk = __bind(this.extractChunk, this);
    this.extractVoxel = __bind(this.extractVoxel, this);
    this.transNeighbors = __bind(this.transNeighbors, this);
    this.getBlockInfo = __bind(this.getBlockInfo, this);
    this.index = 0;
    this.nbt = options.nbt;
    this.pos = options.pos;
    this.torches = [];
    this.unknown = [];
    this.notexture = [];
    this.rotcent = true;
    this.filled = [];
    this.nomatch = {};
    this.special = {};
    if (this.options.ymin != null) {
      this.ymin = this.options.ymin;
    } else {
      this.ymin = 60;
    }
    if ((this.options.superflat != null) === 'true') {
      this.options.superflat = true;
    }
    if (this.options.superflat != null) {
      this.superflat = this.options.superflat;
    } else {
      this.superflat = false;
    }
    if (this.options.showstuff != null) {
      this.showStuff = this.options.showstuff;
    } else {
      this.showStuff = 'diamondsmoss';
    }
    if (options.ymin != null) {
      this.ymin = options.ymin;
    }
  }
  
  ChunkView.prototype.getPosition = function() {
    return [this.nbt.root.Level.xPos, this.nbt.root.Level.yPos]
  }

  ChunkView.prototype.getBlockAt = function(x, y, z) {
    var blockpos, offset, section, sectionnum, sections, _i, _len, _ref;

    if (((_ref = this.nbt.root) != null ? _ref.Level.Sections : void 0) != null) {
      sections = this.nbt.root.Level.Sections;
    } else {
      sections = this.nbt.root.Sections;
    }
    if (!sections) {
      return -1;
    }
    sectionnum = Math.floor(y / 16);
    offset = ((y % 16) * 256) + (z * 16) + x;
    blockpos = offset;
    for (_i = 0, _len = sections.length; _i < _len; _i++) {
      section = sections[_i];
      if (section !== void 0 && section.Y * 1 === sectionnum * 1) {
        return section.Blocks[blockpos];
      }
    }
    return -1;
  };

  ChunkView.prototype.transNeighbors = function(x, y, z) {
    var blockID, i, j, k, _i, _j, _k, _ref, _ref1, _ref2, _ref3, _ref4, _ref5;

    for (i = _i = _ref = x - 1, _ref1 = x + 1; _ref <= _ref1 ? _i <= _ref1 : _i >= _ref1; i = _ref <= _ref1 ? ++_i : --_i) {
      if (i >= ChunkSizeX) {
        continue;
      }
      for (j = _j = _ref2 = y - 1, _ref3 = y + 1; _ref2 <= _ref3 ? _j <= _ref3 : _j >= _ref3; j = _ref2 <= _ref3 ? ++_j : --_j) {
        for (k = _k = _ref4 = z - 1, _ref5 = z + 1; _ref4 <= _ref5 ? _k <= _ref5 : _k >= _ref5; k = _ref4 <= _ref5 ? ++_k : --_k) {
          if (k >= ChunkSizeZ) {
            continue;
          }
          if (!(i === x && j === y && k === z)) {
            blockID = this.getBlockAt(i, j, k);
            if (blockID === 0 || blockID === -1) {
              return true;
            }
          }
        }
      }
    }
    return false;
  };

  ChunkView.prototype.extractChunk = function(cb) {
    this.textcoords = [];
    this.cubeCount = 0;
    if (this.nbt.root.Level.Sections != null) {
      var sections = this.nbt.root.Level.Sections;
    } else {
      var sections = this.nbt.root.Sections;
    }
    if (!sections) return
    for (var i = 0, len = sections.length; i < len; i++) {
      var section = sections[i];
      if (section !== void 0) {
        var Y = section.Y * 1
        var ymin = Y * 16
        var xmin = 0
        var zmin = 0
        var ymax = Y * 16 + 15
        var xmax = ChunkSizeX - 1
        var zmax = ChunkSizeZ - 1
        var x, y, z, _i, _j, _k, _l, _len, _ref, _ref1, _ref2, _ref3
        for (y = _j = _ref = ymin, _ref1 = ymax; _ref <= _ref1 ? _j <= _ref1 : _j >= _ref1; y = _ref <= _ref1 ? ++_j : --_j) {
          for (x = _k = xmin, _ref2 = xmax; 0 <= _ref2 ? _k <= _ref2 : _k >= _ref2; x = 0 <= _ref2 ? ++_k : --_k) {
            for (z = _l = zmin, _ref3 = zmax; 0 <= _ref3 ? _l <= _ref3 : _l >= _ref3; z = 0 <= _ref3 ? ++_l : --_l) {
              if (y < this.ymin) {
                continue;
              }
              this.extractVoxel(section, x, y, z, cb)
            }
          }
        }
      }
    }
  };
  
  ChunkView.prototype.extractVoxel = function(section, x, y, z, cb) {
    var offset = ((y % 16) * 256) + (z * 16) + x;
    var id = section.Blocks[offset];
    var blockType = blockInfo.blocks['_' + id];
    if (blockType == null) {
      id = -1;
    }
    var show = false;
    show = id > 0;
    if (!this.superflat && y < 60 && this.showStuff === 'diamondsmoss') {
      show = id === 48 || id === 56 || id === 4 || id === 52;
    } else {
      if (id !== 0 && id !== -1 && id !== -10) {
        show = this.transNeighbors(x, y, z);
      } else {
        show = false;
      }
    }
    if (show) {
      var block = this.getBlockInfo(x, y, z);
      if (block.type === 'colored_wool') {
        var meta = this.getSectionInfo('Data', x, y, z)
        block.type = block.data[meta]
      }
      cb(x, y, z, block);
    } else {
      var blah = 1;
    }
  }
  
  ChunkView.prototype.getSectionInfo = function(info, x, y, z) {
    var offset, section, sectionnum, sections, _i, _len;
    if (this.nbt.root.Level.Sections != null) {
      sections = this.nbt.root.Level.Sections;
    } else {
      sections = this.nbt.root.Sections;
    }
    if (!sections) return -1;
    sectionnum = Math.floor(y / 16);
    offset = ((y % 16) * 256) + (z * 16) + x;
    for (_i = 0, _len = sections.length; _i < _len; _i++) {
      section = sections[_i];
      if (section !== void 0 && section.Y * 1 === sectionnum * 1) {
        if (offset % 2 === 0) {
          return section[info][Math.floor(offset / 2)] & 0x0F;
        } else {
          return (section[info][Math.floor(offset / 2)] >> 4) & 0x0F;
        }
      }
    }
    return -1;
  };

  ChunkView.prototype.getBlockInfo = function(x, y, z) {
    var blockID, blockType, id;

    blockType = blockInfo.blocks["_-1"];
    id = this.getBlockAt(x, y, z);
    blockID = "_-1";
    if (id != null) {
      blockID = "_" + id.toString();
    }
    if (blockInfo.blocks[blockID] != null) {
      return blockInfo.blocks[blockID];
    } else {
      return blockInfo.blocks["_-1"];
    }
  };


  return ChunkView;

})();

module.exports = function(options) {
  return new ChunkView(options)
}

module.exports.calcPoint = calcPoint;

module.exports.typeToCoords = typeToCoords;


},{"minecraft-blockinfo":30}],30:[function(require,module,exports){
// mostly from http://www.minecraftwiki.net/wiki/Data_values#Data

// TODO (fork and contribute!): water, lava, fire, saplings, wood rotation, decay of leaves, slab orientation, piston, piston extension, redstone wire, crops, sign posts, farmland, door, rails, levers, pressure plates, buttons, snowfall, cacti, sugar cane, jukebox, pumpkins, cake, redstone repeaters, trapdoors, monster egg, stone brick, mushrooms, stems, vines, fence gates, nether wart, brewing stand, cauldron, end portal block, cocoas, tripwire hook, tripwire, flower pots, heads, dyes, anvil, potions, status effects, spawn eggs, golden apple

module.exports.colored_wool = {
  "0":   {"color": "ffffff", "name": "White"},
  "1":   {"color": "ffa800", "name": "Orange"},
  "2":   {"color": "ea01ff", "name": "Magenta"},
  "3":   {"color": "b1eeff", "name": "Light Blue"},
  "4":   {"color": "fdfa00", "name": "Yellow"},
  "5":   {"color": "54ff00", "name": "Lime"},
  "6":   {"color": "ff00ea", "name": "Pink"},
  "7":   {"color": "b8b8b8", "name": "Gray"},
  "8":   {"color": "ebebeb", "name": "Light Gray"},
  "9":   {"color": "2efff8", "name": "Cyan"},
  "10":  {"color": "9e0ec7", "name": "Purple"},
  "11":  {"color": "1334ff", "name": "Blue"},
  "12":  {"color": "896862", "name": "Brown"},
  "13":  {"color": "0c840f", "name": "Green"},
  "14":  {"color": "f00000", "name": "Red"},
  "15":  {"color": "000000", "name": "Black"}
}

// alternative wool colors
// • White      - FFe4e4e4 
// • Light Gray - FFa0a7a7 
// • Dark Gray  - FF414141 
// • Black      - FF181414 
// • Red        - FF9e2b27 
// • Orange     - FFea7e35 
// • Yellow     - FFc2b51c 
// • Lime Green - FF39ba2e 
// • Green      - FF364b18 
// • Light Blue - FF6387d2 
// • Cyan       - FF267191 
// • Blue       - FF253193 
// • Purple     - FF7e34bf 
// • Magenta    - FFbe49c9 
// • Pink       - FFd98199 
// • Brown      - FF56331c

module.exports.wooden_plank = {
  "0": "oak_wood_planks",
  "1": "spruce_wood_planks",
  "2": "birch_wood_planks",
  "3": "jungle_wood_planks"
}

module.exports.wood = {
  "0": "oak_wood",
  "1": "spruce_wood",
  "2": "birch_wood",
  "3": "jungle_wood"
}

module.exports.leaves = {
  "0": "oak_leaves",
  "1": "spruce_leaves",
  "2": "birch_leaves",
  "3": "jungle_leaves"
}

module.exports.torches = {
  "1": "east",
  "2": "west",
  "3": "south",
  "4": "north",
  "5": "floor",
  "6": "ground" // not sure what the diff is between the last two
}

module.exports.slabs = {
  "0": "stone_slab",
  "1": "sandstone_slab",
  "2": "wooden_slab",
  "3": "cobblestone_slab",
  "4": "brick_slab",
  "5": "stone_brick_slab",
  "6": "nether_brick_slab",
  "7": "quartz_slab",
  // double slabs only:
  "8": "smooth_stone_slab",
  "9": "smooth_sandstone_slab",
  "15": "tile_quartz_slab" // note the underside
}

module.exports.wooden_slab = {
  "0": "oak_wood_slab", 
  "1": "spruce_wood_slab",
  "2": "birch_wood_slab",
  "3": "jungle_wood_slab"
}

module.exports.sandstone = {
  "0": "normal",
  "1": "chiseled",
  "2": "smooth"
}

module.exports.bed = {
  "0": "Head is pointing south",
  "1": "Head is pointing west",
  "2": "Head is pointing north",
  "3": "Head is pointing east"
}

module.exports.grass = {
  "0": "shrub", // (identical in appearance to block Dead Bush when placed, but acts like grass or fern)
  "1": "grass",
  "2": "fern",
}

// ascending direction
module.exports.stairs = {
  "0": "east",
  "1": "west",
  "2": "south",
  "3": "north"
}

// facing direction
module.exports.attachments = {
  "0": "down",
  "1": "up",
  "2": "north",
  "3": "south",
  "4": "west",
  "5": "east"
}

module.exports.cobblestone_wall = {
  "0": "cobblestone",
  "1": "moss_stone"
}

module.exports.quartz = {
  "0": "quartz_block",
  "1": "chiseled_quartz_block",
  "2": "pillar_quartz_block_vertical",
  "3": "pillar_quartz_block_north_south",
  "4": "pillar_quartz_block_east_west"
}

module.exports.coal = {
  "0": "coal",
  "1": "charcoal"
}

module.exports.blocks = {
  "_-1": {
    id: -10,
    type: "fill"
  },
  "_1": {
    "type": "stone",
    "id": 1
  },
  "_2": {
    "type": "grass",
    "id": 2
  },
  "_3": {
    "type": "dirt",
    "id": 3
  },
  "_4": {
    "type": "cobblestone",
    "id": 4
  },
  "_5": {
    "type": "wooden_plank",
    "id": 5,
    "data": module.exports.wooden_plank
  },
  "_6": {
    "type": "sapling",
    "id": 6
  },
  "_7": {
    "type": "adminium",
    "id": 7
  },
  "_8": {
    "type": "water",
    "id": 8
  },
  "_9": {
    "type": "stationary_water",
    "id": 9
  },
  "_10": {
    "type": "lava",
    "id": 10
  },
  "_11": {
    "type": "stationary_lava",
    "id": 11
  },
  "_12": {
    "type": "sand",
    "id": 12
  },
  "_13": {
    "type": "gravel",
    "id": 13
  },
  "_14": {
    "type": "gold_ore",
    "id": 14
  },
  "_15": {
    "type": "iron_ore",
    "id": 15
  },
  "_16": {
    "type": "coal_ore",
    "id": 16
  },
  "_17": {
    "type": "wood",
    "id": 17,
    "data": module.exports.wood
  },
  "_18": {
    "type": "leaves",
    "id": 18,
    "data": module.exports.leaves
  },
  "_19": {
    "type": "sponge",
    "id": 19
  },
  "_20": {
    "type": "glass",
    "id": 20
  },
  "_21": {
    "type": "lapis_lazuli_ore",
    "id": 21
  },
  "_22": {
    "type": "lapis_lazuli_block",
    "id": 22
  },
  "_23": {
    "type": "dispenser",
    "id": 23,
    "data": module.exports.attachments
  },
  "_24": {
    "type": "sandstone",
    "id": 24,
    "data": module.exports.sandstone
  },
  "_25": {
    "type": "note_block",
    "id": 25
  },
  "_26": {
    "type": "colored_wool",
    "id": 26,
    "data": module.exports.colored_wool
  },
  "_27": {
    "type": "powered_rail",
    "id": 27
  },
  "_28": {
    "type": "detector_rail",
    "id": 28
  },
  "_29": {
    "type": "sticky_piston",
    "id": 29
  },
  "_30": {
    "type": "cobweb",
    "id": 30
  },
  "_31": {
    "type": "grass",
    "id": 31,
    "data": module.exports.grass
  },
  "_32": {
    "type": "dead_bush",
    "id": 32
  },
  "_33": {
    "type": "piston",
    "id": 33
  },
  "_34": {
    "type": "black_wool",
    "id": 34
  },
  "_35": {
    "type": "wool",
    "id": 35
  },
  "_36": {
    "type": "wool",
    "id": 36
  },
  "_37": {
    "type": "yellow_flower",
    "id": 37
  },
  "_38": {
    "type": "red_flower",
    "id": 38
  },
  "_39": {
    "type": "brown_mushroom",
    "id": 39
  },
  "_40": {
    "type": "red_mushroom",
    "id": 40
  },
  "_41": {
    "type": "gold_block",
    "id": 41
  },
  "_42": {
    "type": "iron_block",
    "id": 42
  },
  "_43": {
    "type": "double_slabs",
    "id": 43,
    "data": module.exports.slabs
  },
  "_44": {
    "type": "slabs",
    "id": 44,
    "data": module.exports.slabs
  },
  "_45": {
    "type": "brick",
    "id": 45
  },
  "_46": {
    "type": "tnt",
    "id": 46
  },
  "_47": {
    "type": "bookshelf",
    "id": 47
  },
  "_48": {
    "type": "moss_stone",
    "id": 48
  },
  "_49": {
    "type": "obsidian",
    "id": 49
  },
  "_50": {
    "type": "torch",
    "id": 50,
    "data": module.exports.torches
  },
  "_51": {
    "type": "fire",
    "id": 51
  },
  "_52": {
    "type": "monster_spawner",
    "id": 52
  },
  "_53": {
    "type": "wooden_stairs",
    "id": 53,
    "data": module.exports.stairs
  },
  "_54": {
    "type": "chest",
    "id": 54,
    "data": module.exports.attachments
  },
  "_55": {
    "type": "redstone_wire",
    "id": 55
  },
  "_56": {
    "type": "diamond_ore",
    "id": 56
  },
  "_57": {
    "type": "diamond_block",
    "id": 57
  },
  "_58": {
    "type": "workbench",
    "id": 58
  },
  "_59": {
    "type": "wheat_seeds",
    "id": 59
  },
  "_60": {
    "type": "soil",
    "id": 60
  },
  "_61": {
    "type": "furnace",
    "id": 61,
    "data": module.exports.attachments
  },
  "_62": {
    "type": "burning_furnace",
    "id": 62
  },
  "_63": {
    "type": "signpost",
    "id": 63
  },
  "_64": {
    "type": "wooden_door",
    "id": 64
  },
  "_65": {
    "type": "ladder",
    "id": 65,
    "data": module.exports.attachments
  },
  "_66": {
    "type": "minecart_track",
    "id": 66
  },
  "_67": {
    "type": "cobblestone_stairs",
    "id": 67,
    "data": module.exports.stairs
  },
  "_68": {
    "type": "wall_sign",
    "id": 68,
    "data": module.exports.attachments
  },
  "_69": {
    "type": "lever",
    "id": 69
  },
  "_70": {
    "type": "stone_pressure_plate",
    "id": 70
  },
  "_71": {
    "type": "iron_door",
    "id": 71
  },
  "_72": {
    "type": "wooden_pressure_plate",
    "id": 72
  },
  "_73": {
    "type": "redstone_ore",
    "id": 73
  },
  "_74": {
    "type": "glowing_redstone_ore",
    "id": 74
  },
  "_75": {
    "type": "redstone_torch_off",
    "id": 75,
    "data": module.exports.torches
  },
  "_76": {
    "type": "redstone_torch_on",
    "id": 76,
    "data": module.exports.torches
  },
  "_77": {
    "type": "stone_button",
    "id": 77
  },
  "_78": {
    "type": "snow",
    "id": 78
  },
  "_79": {
    "type": "ice",
    "id": 79
  },
  "_80": {
    "type": "snow_block",
    "id": 80
  },
  "_81": {
    "type": "cactus",
    "id": 81
  },
  "_82": {
    "type": "clay",
    "id": 82
  },
  "_83": {
    "type": "sugar_cane",
    "id": 83
  },
  "_84": {
    "type": "jukebox",
    "id": 84
  },
  "_85": {
    "type": "fence",
    "id": 85
  },
  "_86": {
    "type": "pumpkin",
    "id": 86
  },
  "_87": {
    "type": "netherrack",
    "id": 87
  },
  "_88": {
    "type": "soul_sand",
    "id": 88
  },
  "_89": {
    "type": "glowstone",
    "id": 89
  },
  "_90": {
    "type": "portal",
    "id": 90
  },
  "_91": {
    "type": "jack-o-lantern",
    "id": 91
  },
  "_92": {
    "type": "cake",
    "id": 92
  },
  "_95": {
    "type": "locked_chest",
    "id": 95,
    "data": module.exports.attachments
  },
  "_96": {
    "type": "trapdoor",
    "id": 96
  },
  "_97": {
    "type": "monster_egg",
    "id": 97
  },
  "_98": {
    "type": "stone_brick",
    "id": 98
  },
  "_99": {
    "type": "huge_brown_mushroom",
    "id": 99
  },
  "_100": {
    "type": "huge_red_mushroom",
    "id": 100
  },
  "_101": {
    "type": "iron_bars",
    "id": 101
  },
  "_102": {
    "type": "glass_pane",
    "id": 102
  },
  "_103": {
    "type": "melon",
    "id": 103
  },
  "_106": {
    "type": "vines",
    "id": 106
  },
  "_107": {
    "type": "fence_gate",
    "id": 107
  },
  "_108": {
    "type": "brick_stairs",
    "id": 108,
    "data": module.exports.stairs
  },
  "_109": {
    "type": "stone_brick_stairs",
    "id": 109,
    "data": module.exports.stairs
  },
  "_110": {
    "type": "mycelium",
    "id": 110
  },
  "_111": {
    "type": "lily_pad",
    "id": 111
  },
  "_112": {
    "type": "nether_brick",
    "id": 112
  },
  "_113": {
    "type": "nether_brick_fence",
    "id": 113
  },
  "_114": {
    "type": "nether_brick_stairs",
    "id": 114,
    "data": module.exports.stairs
  },
  "_116": {
    "type": "enchantment_table",
    "id": 116
  },
  "_121": {
    "type": "end_stone",
    "id": 121
  },
  "_122": {
    "type": "dragon_egg",
    "id": 122
  },
  "_123": {
    "type": "redstone_lamp",
    "id": 123
  },
  "_126": {
    "type": "wooden_slab",
    "id": 126,
    "data": module.exports.wooden_slab
  },
  "_127": {
    "type": "cocoa_plant",
    "id": 127
  },
  "_128": {
    "type": "sandstone_stairs",
    "id": 128,
    "data": module.exports.stairs
  },
  "_129": {
    "type": "emerald_ore",
    "id": 129
  },
  "_130": {
    "type": "ender_chest",
    "id": 130,
    "data": module.exports.attachments
  },
  "_133": {
    "type": "block_of_emerald",
    "id": 133
  },
  "_134": {
    "type": "spruce_wood_stairs",
    "id": 134,
    "data": module.exports.stairs
  },
  "_135": {
    "type": "birch_wood_stairs",
    "id": 135,
    "data": module.exports.stairs
  },
  "_136": {
    "type": "jungle_wood_stairs",
    "id": 136,
    "data": module.exports.stairs
  },
  "_137": {
    "type": "command_block",
    "id": 137
  },
  "_138": {
    "type": "beacon",
    "id": 138
  },
  "_139": {
    "type": "cobblestone_wall",
    "id": 139,
    "data": module.exports.cobblestone_wall
  },
  "_143": {
    "type": "wooden_button",
    "id": 143
  },
  "_145": {
    "type": "anvil",
    "id": 145
  },
  "_146" : {
    "id": 146, 
    "type": "trapped_chest",
    "data": module.exports.attachments
  },
  "_147": {
    "id": 147, 
    "type": "weighted_pressure_plate_light"
  },
  "_148": {
    "id": 148, 
    "type": "weighted_pressure_plate_heavy"
  },
  "_149": {
    "id": 149, 
    "type": "redstone_comparator_inactive"
  },
  "_150": {
    "id": 150, 
    "type": "redstone_comparator_active"
  },
  "_151": {
    "id": 151, 
    "type": "daylight_sensor"
  },
  "_152": {
    "id": 152, 
    "type": "redstone_block"
  },
  "_153": {
    "id": 153,
    "type": "nether_quartz_ore"
  },
  "_154": {
    "id": 154, 
    "type": "hopper",
    "data": module.exports.attachments
  },
  "_155": {
    "id": 155, 
    "type": "quartz_block"
  },
  "_156": {
    "id": 156, 
    "type": "quartz_stairs",
    "data": module.exports.stairs
  },
  "_157": {
    "id": 157, 
    "type": "activator_rail"
  },
  "_158": {
    "id": 158, 
    "type": "dropper",
    "data": module.exports.attachments
  },
  "_170": {
    "id": 170, 
    "type": "hay_bale"
  },
  "_171": {
    "id": 171, 
    "type": "carpet"
  },
  "_260": {
    "type": "apple",
    "id": 260
  },
  "_262": {
    "type": "arrow",
    "id": 262
  },
  "_263": {
    "type": "coal",
    "id": 263,
    "data": module.exports.coal
  },
  "_264": {
    "type": "diamond",
    "id": 264
  },
  "_265": {
    "type": "iron_ingot",
    "id": 265
  },
  "_266": {
    "type": "gold_ingot",
    "id": 266
  },
  "_280": {
    "type": "stick",
    "id": 280
  },
  "_281": {
    "type": "bowl",
    "id": 281
  },
  "_282": {
    "type": "mushroom_soup",
    "id": 282
  },
  "_287": {
    "type": "string",
    "id": 287
  },
  "_288": {
    "type": "feather",
    "id": 288
  },
  "_289": {
    "type": "gun_powder",
    "id": 289
  },
  "_295": {
    "type": "seeds",
    "id": 295
  },
  "_296": {
    "type": "wheat",
    "id": 296
  },
  "_297": {
    "type": "bread",
    "id": 297
  },
  "_318": {
    "type": "flint",
    "id": 318
  },
  "_319": {
    "type": "raw_porkchop",
    "id": 319
  },
  "_320": {
    "type": "cooked_porkchop",
    "id": 320
  },
  "_321": {
    "type": "paintings",
    "id": 321
  },
  "_322": {
    "type": "golden_apple",
    "id": 322
  },
  "_323": {
    "type": "sign",
    "id": 323
  },
  "_324": {
    "type": "wooden_door",
    "id": 324
  },
  "_325": {
    "type": "bucket",
    "id": 325
  },
  "_326": {
    "type": "water_bucket",
    "id": 326
  },
  "_327": {
    "type": "lava_bucket",
    "id": 327
  },
  "_329": {
    "type": "saddle",
    "id": 329
  },
  "_330": {
    "type": "iron_door",
    "id": 330
  },
  "_331": {
    "type": "redstone_dust",
    "id": 331
  },
  "_332": {
    "type": "snowball",
    "id": 332
  },
  "_333": {
    "type": "boat",
    "id": 333
  },
  "_334": {
    "type": "leather",
    "id": 334
  },
  "_335": {
    "type": "milk",
    "id": 335
  },
  "_336": {
    "type": "clay_brick",
    "id": 336
  },
  "_337": {
    "type": "clay_balls",
    "id": 337
  },
  "_338": {
    "type": "sugar_cane",
    "id": 338
  },
  "_339": {
    "type": "paper",
    "id": 339
  },
  "_340": {
    "type": "book",
    "id": 340
  },
  "_341": {
    "type": "slimeball",
    "id": 341
  },
  "_344": {
    "type": "egg",
    "id": 344
  },
  "_346": {
    "type": "fishing_rod",
    "id": 346
  },
  "_348": {
    "type": "glowstone_dust",
    "id": 348
  },
  "_349": {
    "type": "raw_fish",
    "id": 349
  },
  "_350": {
    "type": "cooked_fish",
    "id": 350
  },
  "_351": {
    "type": "dyes",
    "id": 351
  },
  "_352": {
    "type": "bone",
    "id": 352
  },
  "_353": {
    "type": "sugar",
    "id": 353
  },
  "_354": {
    "type": "cake",
    "id": 354
  },
  "_354": {
    "type": "bed",
    "id": 355,
    "data": module.exports.bed
  },
  "_356": {
    "type": "redstone_repeater",
    "id": 356
  },
  "_357": {
    "type": "cookie",
    "id": 357
  },
  "_358": {
    "type": "map",
    "id": 358
  },
  "_359": {
    "type": "shears",
    "id": 359
  },
  "_360": {
    "type": "melon_slice",
    "id": 360
  },
  "_361": {
    "type": "pumpkin_seeds",
    "id": 361
  },
  "_362": {
    "type": "melon_seeds",
    "id": 362
  },
  "_363": {
    "type": "raw_beef",
    "id": 363
  },
  "_364": {
    "type": "steak",
    "id": 364
  },
  "_365": {
    "type": "raw_chicken",
    "id": 365
  },
  "_366": {
    "type": "cooked_chicken",
    "id": 366
  },
  "_367": {
    "type": "rotton_flesh",
    "id": 367
  },
  "_368": {
    "type": "ender_pearl",
    "id": 368
  },
  "_369": {
    "type": "blaze_rod",
    "id": 369
  },
  "_370": {
    "type": "ghast_tear",
    "id": 370
  },
  "_374": {
    "type": "glass_bottle",
    "id": 374
  },
  "_375": {
    "type": "spider_eye",
    "id": 375
  },
  "_376": {
    "type": "fermented_spider_eye",
    "id": 376
  },
  "_377": {
    "type": "blaze_powder",
    "id": 377
  },
  "_378": {
    "type": "magma_cream",
    "id": 378
  },
  "_379": {
    "type": "brewing_stand",
    "id": 379
  },
  "_380": {
    "type": "cauldron",
    "id": 380
  },
  "_381": {
    "type": "eye_of_ender",
    "id": 381
  },
  "_382": {
    "type": "glistering_melon",
    "id": 382
  },
  "_383": {
    "type": "spawn_eggs",
    "id": 383
  },
  "_384": {
    "type": "bottle_o_enchanting",
    "id": 384
  },
  "_385": {
    "type": "fire_charge",
    "id": 385
  },
  "_388": {
    "type": "emerald",
    "id": 388
  },
  "_390": {
    "type": "flower_pot",
    "id": 390
  },
  "_391": {
    "type": "carrot",
    "id": 391
  },
  "_392": {
    "type": "unknown",
    "id": 392
  },
  "_393": {
    "type": "baked_potato",
    "id": 393
  },
  "_394": {
    "type": "poisonous_potato",
    "id": 394
  },
  "_395": {
    "type": "map",
    "id": 395
  },
  "_396": {
    "type": "golden_carrot",
    "id": 396
  },
  "_397": {
    "type": "mob_head",
    "id": 397
  },
  "_399": {
    "type": "nether_star",
    "id": 399
  },
  "_400": {
    "type": "pumkpin_pie",
    "id": 400
  },
  "_401": {
    "type": "firework_rocket",
    "id": 401
  },
  "_402": {
    "type": "firework_star",
    "id": 402
  }
}
},{}]},{},[1])
;