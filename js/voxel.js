var createGame = require('voxel-hello-world')
var mca2js = require('mca2js')
var fly = require('voxel-fly')
var crunch = require('voxel-crunch')
var voxelLevel = require('voxel-level')
var level = voxelLevel('blocks', function ready() {})

module.exports = {
  initGame: initGame,
  saveRegion: saveRegion,
  level: level
}

function initGame(options) {

  var textures = "http://commondatastorage.googleapis.com/voxeltextures/painterly/"

  var materials = [["adminium"], "stationary_lava", "stone", "dirt", "redstone_ore", "coal_ore", "gravel", "iron_ore", "double_stone_slab", "grass", "sandstone", "stone_slab", "stone_pressure_plate", "brick", "glass", "iron_door", "wall_sign", "nether_brick_fence", "glowstone", "torch", "wool", "glass_pane", "wood", "wooden_stairs", "bookshelf", "ladder", "nether_brick_stairs", "wooden_plank", "fence", "stone_brick_stairs", "workbench", "wooden_door", "jukebox", "stone_brick", "chest", "iron_block", "furnace", "brick_stairs", "wooden_pressure_plate", "cobblestone", "clay", "fence_gate", "stationary_water", "minecart_track", "powered_rail", "colored_wool", "leaves", "lapis_lazuli_ore", "gold_ore", "obsidian", "brown_mushroom", "redstone_torch_on", "moss_stone", "monster_spawner", "diamond_ore", "signpost", "gold_block", "white_wool", "orange_wool", "magenta_wool", "light_blue_wool", "yellow_wool", "lime_wool", "pink_wool", "dark_gray_wool", "light_gray_wool", "light_blue_wool", "purple_wool", "dark_blue_wool", "brown_wool", "green_wool", "red_wool", "black_wool"]

  var pos = [108, 71, 276]
  var chunkDimensions = [16, 256, 16]
  // var regionX = Math.floor((pos[0] >> 4) / 32)
  // var regionZ = Math.floor((pos[2] >> 4) / 32)
  
  var game = require('voxel-hello-world')({
    generateChunks: false,
    texturePath: textures,
    playerSkin: textures + '../player.png',
    chunkSize: 16,
    chunkDistance: 4,
    arrayType: Float32Array,
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
  
  game.voxels.on('missingChunk', function(chunkPosition) {
    level.load(chunkPosition, chunkDimensions, function(err, chunk) {
      console.log('loaded chunk', err, chunk)
    })
  })
}

function saveRegion(buffer, regionX, regionZ, options, cb) {
  var converter = mca2js(options)
  var pending = 0
  var count = 0
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