var container;
var camera, scene, renderer, effect;

init();
animate();

function init() {

  container = document.createElement( 'div' );
  document.body.appendChild( container );

  camera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, - 500, 1000 );
  camera.position.x = 100;
  camera.position.y = 50;
  camera.position.z = 100;

  scene = new THREE.Scene();



  // Cubes

  var geometry = new THREE.CubeGeometry( 50, 50, 50 );
  var material = new THREE.MeshLambertMaterial( { color: 0xffffff, shading: THREE.FlatShading, overdraw: true } );

  for ( var i = 0; i < 20; i ++ ) {

    var cube = new THREE.Mesh( geometry, material );

    cube.scale.y = Math.floor( Math.random() * 2 + 1 );

    cube.position.x = Math.floor( ( Math.random() * 1000 - 500 ) / 50 ) * 50 + 25;
    cube.position.y = ( cube.scale.y * 50 ) / 2;
    cube.position.z = Math.floor( ( Math.random() * 1000 - 500 ) / 50 ) * 50 + 25;
    var multiply = 2
    cube.position.x *= multiply / 1.5
    cube.position.z *= multiply / 1.5
    cube.scale.x *= multiply
    cube.scale.z *= multiply
    cube.scale.y *= multiply
    scene.add( cube );

  }

  // Lights

  // var alp = Math.random() * 0x10
  var ambientLight = new THREE.AmbientLight( 9.381581880152225   );
  scene.add( ambientLight );

  var directionalLight = new THREE.DirectionalLight( Math.random() * 0xffffff );
  // directionalLight.position.x = Math.random() - 0.5;
  // directionalLight.position.y = Math.random() - 0.5;
  // directionalLight.position.z = Math.random() - 0.5;
  directionalLight.position.copy({ "x": 0.4637009314795087, "y": -0.6329965798085929, "z": -0.6199167493266008 })
  directionalLight.position.normalize();
  scene.add( directionalLight );

  var directionalLight = new THREE.DirectionalLight( Math.random() * 0xffffff );
  // directionalLight.position.x = Math.random() - 0.5;
  // directionalLight.position.y = Math.random() - 0.5;
  // directionalLight.position.z = Math.random() - 0.5;
  directionalLight.position.copy({ "x": 0.5480640365708019, "y": -0.5509175233997147, "z": 0.6293772272880895 })
  directionalLight.position.normalize();

  scene.add( directionalLight );

  renderer = new THREE.CanvasRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  effect = new THREE.AsciiEffect( renderer );
  effect.setSize( window.innerWidth, window.innerHeight );
  
  container.appendChild( effect.domElement );

  //

  window.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {

  // camera.left = window.innerWidth / - 2;
  // camera.right = window.innerWidth / 2;
  // camera.top = window.innerHeight / 2;
  // camera.bottom = window.innerHeight / - 2;
  // 
  // camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

}

//

function animate() {

  requestAnimationFrame( animate );

  render();

}

function render() {

  var timer = Date.now() * 0.0001;

  camera.position.x = Math.cos( timer ) * 100;
  camera.position.z = Math.sin( timer ) * 100;
  camera.lookAt( scene.position );

  effect.render( scene, camera );

}
