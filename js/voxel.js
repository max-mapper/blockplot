var createGame = require('voxel-hello-world')
var mca2js = require('mca2js')
var fly = require('voxel-fly')
var crunch = require('voxel-crunch')
var voxelLevel = require('voxel-level')
var bundle = require('voxel-bundle')
var level = voxelLevel('blocks', function ready() {})

module.exports = {
  initGame: initGame,
  saveRegion: saveRegion,
  level: level
}

function initGame(options) {
  $('.content').hide()

  var textures = "http://commondatastorage.googleapis.com/voxeltextures/painterly/"

  var materials = [["adminium"], "stationary_lava", "stone", "dirt", "redstone_ore", "coal_ore", "gravel", "iron_ore", "double_stone_slab", "grass", "sandstone", "stone_slab", "stone_pressure_plate", "brick", "glass", "iron_door", "wall_sign", "nether_brick_fence", "glowstone", "torch", "wool", "glass_pane", "wood", "wooden_stairs", "bookshelf", "ladder", "nether_brick_stairs", "wooden_plank", "fence", "stone_brick_stairs", "workbench", "wooden_door", "jukebox", "stone_brick", "chest", "iron_block", "furnace", "brick_stairs", "wooden_pressure_plate", "cobblestone", "clay", "fence_gate", "stationary_water", "minecart_track", "powered_rail", "colored_wool", "leaves", "lapis_lazuli_ore", "gold_ore", "obsidian", "brown_mushroom", "redstone_torch_on", "moss_stone", "monster_spawner", "diamond_ore", "signpost", "gold_block", "white_wool", "orange_wool", "magenta_wool", "light_blue_wool", "yellow_wool", "lime_wool", "pink_wool", "dark_gray_wool", "light_gray_wool", "light_blue_wool", "purple_wool", "dark_blue_wool", "brown_wool", "green_wool", "red_wool", "black_wool"]

  var pos = [0, 0, 0]
  var chunkDimensions = [16, 16, 16]
  var gameChunkSize = 16
  // var regionX = Math.floor((pos[0] >> 4) / 32)
  // var regionZ = Math.floor((pos[2] >> 4) / 32)
  
  var game = require('voxel-hello-world')({
    generateChunks: false,
    texturePath: textures,
    playerSkin: textures + '../player.png',
    chunkSize: gameChunkSize,
    chunkDistance: 4,
    arrayType: Uint8Array,
    worldOrigin: pos,
    materials: materials
  })
  
  var level = voxelLevel(game, function ready() {
    game.paused = false
    window.game = game // for console debugging
    var makeFly = fly(game)
    makeFly(game.controls.target()).startFlying()
    game.controls.target().avatar.position.copy({x: pos[0], y: pos[1], z: pos[2]})
  })
  
  game.voxels.on('missingChunk', function(p) {
    var chunkPosition = [p[0] * gameChunkSize, p[1] * gameChunkSize, p[2] * gameChunkSize]
    var empty = {
      position: p,
      voxels: new Uint8Array(gameChunkSize * gameChunkSize * gameChunkSize),
      dims: [gameChunkSize, gameChunkSize, gameChunkSize]
    }
    game.showChunk(empty)
    level.load(chunkPosition, chunkDimensions, function(err, chunk) {
      if (err) return
      var chunkBundle = bundle(chunk)
      chunkBundle.extract(function(x, y, z, type, idx) {
        if (!type) return
        var cx = x - chunk.position[0]
        var cy = y - chunk.position[1]
        var cz = z - chunk.position[2]
        var cidx = cx + (cy * gameChunkSize) + (cz * gameChunkSize * gameChunkSize)
        var pos = [x,y,z]
        game.setBlock(pos, type)
      })
    })
  })
}

function saveRegion(buffer, regionX, regionZ, options, cb) {
  var converter = mca2js(options)
  var pending = 0
  var done = false
  var errors = {}
  converter.on('data', function(chunk) {
    pending++
    level.store(chunk, function afterStore(err) {
      if (err) errors[key] = err
      pending--
      if (done && pending === 0) cb(Object.keys(errors).length > 0 ? errors : false)
    })
  })
  converter.on('end', function(){
    done = true
  })
  converter.convert(buffer, regionX, regionZ)
}

