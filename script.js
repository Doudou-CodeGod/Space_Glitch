		import * as THREE from 'three';
		import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
		import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
		import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
		import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
        import { Refractor } from 'three/examples/jsm/objects/Refractor.js';
        import { WaterRefractionShader } from 'three/examples/jsm/shaders/WaterRefractionShader.js';
        import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

        import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
        import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
        import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
        import { BloomPass } from 'three/examples/jsm/postprocessing/BloomPass.js';
        import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
        import { FocusShader } from 'three/examples/jsm/shaders/FocusShader.js';


let container;
let camera, scene, renderer;
let materials, current_material;
let light, pointLight, ambientLight;
let effect, resolution;
let effectController;
let time = 0;
let refractor;
let groundMirror;
let prevMousePos = new THREE.Vector2();


let composer, effectFocus;

const clock = new THREE.Clock();
const delta = clock.getDelta();

init();
addGLTFModel(5, 0, 25, 0, -Math.PI / 3, 0, 'models/Human LowPoly.gltf');
addGLTFModel(-30, 0, -20, 0, 0, 0, 'models/Human LowPoly.gltf');
addGLTFModel(-30, 0, 20, 0, -Math.PI / 3, 0, 'models/Human LowPoly.gltf');
addGLTFModel(-2, 0, -15, 0, Math.PI / 5, 0, 'models/Human LowPoly.gltf');
animate();

//glt models
function addGLTFModel(x, y, z, rx, ry, rz, modelPath, scaleX = 0.05, scaleY = 0.05, scaleZ = 0.05) {
    const loader = new GLTFLoader();
    loader.load(
      modelPath,
      (gltf) => {
          gltf.scene.position.set(x, y, z);
          gltf.scene.rotation.set(rx, ry, rz);
          gltf.scene.scale.set(scaleX, scaleY, scaleZ);
          scene.add(gltf.scene);
        },
        (xhr) => {
          console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
        },
        (error) => {
          console.error('An error occurred while loading the GLTF model:', error);
        }
      );
  }


function init() {

    container = document.getElementById( 'container' );

// CAMERA

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 200 );
    camera.position.set( 20, 2,0 );
    

// SCENE

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xffffff );



// refractor
   const refractorGeometry = new THREE.PlaneGeometry( 1, 1 );

   refractor = new Refractor( refractorGeometry, {
    clipBias: 0.003,
    color: 0x999999,
    textureWidth: 1024,
    textureHeight: 1024,
    shader: WaterRefractionShader
} );

   refractor.position.set( 0, 0, 0 );
   refractor.rotateX( - Math.PI / 2 );
   scene.add( refractor );


// reflectors/mirrors

let geometry;

   geometry = new THREE.PlaneGeometry(5000, 5000);
   groundMirror = new Reflector(geometry, {
   clipBias: 0.002,
   textureWidth: window.innerWidth * window.devicePixelRatio,
   textureHeight: window.innerHeight * window.devicePixelRatio,
   color: 0x777777,
});

   groundMirror.rotateX( - Math.PI / 2 );
   scene.add( groundMirror );



    const dudvMap = new THREE.TextureLoader().load( 'textures/waterdudv.jpg', function () {

    animate();

} );

dudvMap.wrapS = dudvMap.wrapT = THREE.RepeatWrapping;
refractor.material.uniforms.tDudv.value = dudvMap;



// loder

const loader = new GLTFLoader();

loader.load( 'models/frame.gltf', function ( gltf ) {
gltf.scene.scale.set(0.2, 0.2, 0.2)
gltf.scene.position.set(0, 0, 0)
gltf.scene.rotation.y = Math.PI * 4.5
scene.add( gltf.scene );

}, undefined, function ( error ) {

console.error( error );

} );

const anotherLoader = new GLTFLoader();

anotherLoader.load( 'models/room.gltf', function ( gltf ) {
    gltf.scene.scale.set(1, 1, 1); // Set the scale as required
    gltf.scene.position.set(0, 0.3, 0); // Set the position as required
    //gltf.scene.rotation.y = Math.PI * 0.5; // Set the rotation as required
    scene.add( gltf.scene );

}, undefined, function ( error ) {

    console.error( error );

} );



// LIGHTS

    light = new THREE.DirectionalLight( 0xffffff );
    light.position.set( 0.5, 0.5, 1 );
    scene.add( light );


    ambientLight = new THREE.AmbientLight( 0x080808 );
    scene.add( ambientLight );

    // MATERIALS

    materials = generateMaterials();
    current_material = 'Grass';

    // MARCHING CUBES

    resolution = 39;

    effect = new MarchingCubes( resolution, materials[ current_material ], true, true, 100000 );
    effect.position.set( 3.6, 2.75, 0.1 );
    effect.scale.set( 5.01, 2.5, 3.5 );

    effect.enableUvs = false;
    effect.enableColors = false;

    scene.add( effect );

    // RENDERER

    renderer = new THREE.WebGLRenderer();
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );

    // CONTROLS

    const controls = new OrbitControls( camera, renderer.domElement );
    controls.minDistance = 0.1;
    controls.maxDistance = 100;


    // GUI

    setupGui();

    // EVENTS

    window.addEventListener( 'resize', onWindowResize );

}

//

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix(); 

    renderer.setSize( window.innerWidth, window.innerHeight );

}

function generateMaterials() {

    // environment map0

    const path = 'textures/cube/SwedishRoyalCastle/';
    const format = '.jpg';
    const urls = [
        path + 'px' + format, path + 'nx' + format,
        path + 'py' + format, path + 'ny' + format,
        path + 'pz' + format, path + 'nz' + format
    ];

    const cubeTextureLoader = new THREE.CubeTextureLoader();

    const reflectionCube = cubeTextureLoader.load( urls );
    const refractionCube = cubeTextureLoader.load( urls );
    refractionCube.mapping = THREE.CubeRefractionMapping;

    // environment map1

    const path3 = 'textures/cube/4/';
    const format3 = '.jpg';
    const urls3 = [
        path3 + 'px' + format, path3 + 'nx' + format,
        path3 + 'py' + format, path3 + 'ny' + format,
        path3 + 'pz' + format, path3 + 'nz' + format
    ];

    const cubeTextureLoader3 = new THREE.CubeTextureLoader();

    const reflectionCube3 = cubeTextureLoader3.load( urls3 );
    const refractionCube3 = cubeTextureLoader3.load( urls3 );
    refractionCube3.mapping = THREE.CubeRefractionMapping;		
    

    // environment map2

    const path2 = 'textures/cube/1/';
    const format2 = '.jpg';
    const urls2 = [
        path2 + 'px' + format, path2 + 'nx' + format,
        path2 + 'py' + format, path2 + 'ny' + format,
        path2 + 'pz' + format, path2 + 'nz' + format
    ];

    const cubeTextureLoader2 = new THREE.CubeTextureLoader();

    const reflectionCube2 = cubeTextureLoader2.load( urls2 );
    const refractionCube2 = cubeTextureLoader2.load( urls2 );
    refractionCube2.mapping = THREE.CubeRefractionMapping;	
        
// background			
scene.background = reflectionCube3
scene.background = new THREE.Color( 0x000000 );    

    const texture = new THREE.TextureLoader().load( 'textures/uv_grid_opengl.png' );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    const materials = {
        'shiny': new THREE.MeshStandardMaterial( { color: 0x00c5e5, envMap: reflectionCube, roughness: 0.1, metalness: 1.0 } ),
        'Ground': new THREE.MeshLambertMaterial( { color: 0xffffff, envMap: reflectionCube } ),
        'Elevator': new THREE.MeshLambertMaterial( { color: 0xffffff, envMap: reflectionCube3 } ),
        'Grass': new THREE.MeshLambertMaterial( { color: 0xffffff, envMap: reflectionCube2 } ),
        'flat': new THREE.MeshLambertMaterial( { /*TODO flatShading: true */ } ),
        'textured': new THREE.MeshPhongMaterial( { color: 0xffffff, specular: 0x111111, shininess: 1, map: texture } ),
        'colors': new THREE.MeshPhongMaterial( { color: 0xffffff, specular: 0xffffff, shininess: 2, vertexColors: true } ),
        'multiColors': new THREE.MeshPhongMaterial( { shininess: 2, vertexColors: true } ),
        'plastic': new THREE.MeshPhongMaterial( { specular: 0x888888, shininess: 250 } ),
    };

    return materials;

}

//

function setupGui() {

    const createHandler = function ( id ) {

        return function () {

            current_material = id;

            effect.material = materials[ id ];
            effect.enableUvs = ( current_material === 'textured' ) ? true : false;
            effect.enableColors = ( current_material === 'colors' || current_material === 'multiColors' ) ? true : false;

        };

    };

    effectController = {

        material: 'shiny',

        speed: 1.0,
        numBlobs: 10,
        resolution: 39,
        isolation: 80,

        wallx: true,

        dummy: function () {}

    };

    let h;

    const gui = new GUI();

    // material (type)

    h = gui.addFolder( 'Materials' );

    for ( const m in materials ) {

        effectController[ m ] = createHandler( m );
        h.add( effectController, m ).name( m );

    }

    // simulation

    h = gui.addFolder( 'Simulation' );

    h.add( effectController, 'speed', 0.1, 8.0, 0.05 );
    h.add( effectController, 'numBlobs', 1, 50, 1 );
    h.add( effectController, 'resolution', 14, 39, 1 );
    h.add( effectController, 'isolation', 10, 79, 1 );


    h.add( effectController, 'wallx' );

}

				// postprocessing

				const renderModel = new RenderPass( scene, camera );
				const effectBloom = new BloomPass( 0.75 );
				const effectFilm = new FilmPass( 0.5, 0.5, 1448, false );

				effectFocus = new ShaderPass( FocusShader );

				effectFocus.uniforms[ 'screenWidth' ].value = window.innerWidth * window.devicePixelRatio;
				effectFocus.uniforms[ 'screenHeight' ].value = window.innerHeight * window.devicePixelRatio;

				composer = new EffectComposer( renderer );

				composer.addPass( renderModel );
				composer.addPass( effectBloom );
				composer.addPass( effectFilm );
				composer.addPass( effectFocus );

// this controls content of marching cubes voxel field

function updateCubes( object, time, numblobs, floor, wallx, wallz,scene ) {

    object.reset();

    // fill the field with some metaballs

    const rainbow = [
        new THREE.Color( 0xff0000 ),
        new THREE.Color( 0xff7f00 ),
        new THREE.Color( 0xffff00 ),
        new THREE.Color( 0x00ff00 ),
        new THREE.Color( 0x0000ff ),
        new THREE.Color( 0x4b0082 ),
        new THREE.Color( 0x9400d3 )
    ];
    const subtract = 12;
    const strength = 1.2 / ( ( Math.sqrt( numblobs ) - 1 ) / 4 + 1 );

    for ( let i = 0; i < numblobs; i ++ ) {

        const ballx = Math.sin( i + 1.26 * time * ( 1.03 + 0.5 * Math.cos( 0.21 * i ) ) ) * 0.27 + 0.5;
        const bally = Math.abs( Math.cos( i + 1.12 * time * Math.cos( 1.22 + 0.1424 * i ) ) ) * 0.77; // dip into the floor
        const ballz = Math.cos( i + 1.32 * time * 0.1 * Math.sin( ( 0.92 + 0.53 * i ) ) ) * 0.27 + 0.5;

        if ( current_material === 'multiColors' ) {

            object.addBall( ballx, bally, ballz, strength, subtract, rainbow[ i % 7 ] );

        } else {

            object.addBall( ballx, bally, ballz, strength, subtract );

        }

    }


    if ( wallx ) object.addPlaneX( 2, 12 );

    object.update();

}

//

function animate() {
    

    requestAnimationFrame( animate );

    render();
    

}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    time += delta * effectController.speed * 0.5;

    updateCubes(effect, time, effectController.numBlobs, effectController.floor, effectController.wallx, effectController.wallz, scene);

    renderer.render(scene, camera);

    render();
}

function render() {
    composer.render(delta);
}