var container;
var camera, scene, renderer;
var group;
var mouseX = 0, mouseY = 0;

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

init();
animate();

function init() {

  container = document.createElement( 'div' );
  document.body.appendChild( container );

  camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 10000 );
  camera.position.z = 500;

  scene = new THREE.Scene();

  group = new THREE.Object3D();
  scene.add( group );

  // earth

  var earthTexture = new THREE.Texture();
  var loader = new THREE.ImageLoader();

  loader.addEventListener( 'load', function ( event ) {

    earthTexture.image = event.content;
    earthTexture.needsUpdate = true;

  } );

  loader.load( 'img/3D-worldmap.png' );

  var geometry = new THREE.SphereGeometry( 200, 20, 20 );
  var material = new THREE.MeshBasicMaterial( { map: earthTexture, overdraw: true } );

  var mesh = new THREE.Mesh( geometry, material );
  group.add( mesh );

  // shadow

  var canvas = document.createElement( 'canvas' );
  canvas.width = 128;
  canvas.height = 128;

  var context = canvas.getContext( '2d' );
  var gradient = context.createRadialGradient( canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2 );
  gradient.addColorStop( 0.1, 'rgba(210,210,210,1)' );
  gradient.addColorStop( 1, 'rgba(255,255,255,1)' );

  context.fillStyle = gradient;
  context.fillRect( 0, 0, canvas.width, canvas.height );

  var texture = new THREE.Texture( canvas );
  texture.needsUpdate = true;

  var geometry = new THREE.PlaneGeometry( 300, 300, 3, 3 );
  var material = new THREE.MeshBasicMaterial( { map: texture, overdraw: true } );

  var mesh = new THREE.Mesh( geometry, material );
  mesh.position.y = - 250;
  mesh.rotation.x = - Math.PI / 2;
  group.add( mesh );

  renderer = new THREE.CanvasRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );

  container.appendChild( renderer.domElement );

  document.addEventListener( 'mousemove', onDocumentMouseMove, false );

  //

  window.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {

  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );

}

function onDocumentMouseMove( event ) {

  mouseX = ( event.clientX - windowHalfX );
  mouseY = ( event.clientY - windowHalfY );

}

//

function animate() {

  requestAnimationFrame( animate );

  render();

}

function render() {

  camera.position.x += ( mouseX - camera.position.x ) * 0.05;
  camera.position.y += ( - mouseY - camera.position.y ) * 0.05;
  camera.lookAt( scene.position );

  group.rotation.y -= 0.005;

  renderer.render( scene, camera );

}

