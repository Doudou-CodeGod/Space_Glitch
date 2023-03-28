import * as THREE from 'three';

			import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
			import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
			import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
			import { BloomPass } from 'three/examples/jsm/postprocessing/BloomPass.js';
			import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
			import { FocusShader } from 'three/examples/jsm/shaders/FocusShader.js';
			import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
			import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
			import { Reflector } from 'three/examples/jsm/objects/Reflector.js';


			let camera, scene, renderer, mesh;

			let parent;
			let groundMirror;

			const meshes = [], clonemeshes = [];

			let composer, effectFocus;

			const clock = new THREE.Clock();



			// Define controls variable here
let controls;

			init();
			animate();

			function init() {

				const container = document.querySelector( '#container' );

				camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 50000 );
				camera.position.set( -8000, 0, 7000 );

				scene = new THREE.Scene();
				scene.background = new THREE.Color( 0x989898 );
				scene.fog = new THREE.FogExp2( 0x989898, 0.0000675 );

				camera.lookAt( scene.position );


				const loader = new OBJLoader();

				loader.load( 'models/obj/male02/male02.obj', function ( object ) {

					const positions = combineBuffer( object, 'position' );

					createMesh( positions, scene, 4.05, - 500, - 350, 600, 0xFF526C );
					createMesh( positions, scene, 4.05, 500, - 350, 0, 0xFFFFFF );
					createMesh( positions, scene, 4.05, - 250, - 350, 1500, 0xFF526C );
					createMesh( positions, scene, 4.05, - 250, - 350, - 1500, 0xFFFFFF );

				} );

				loader.load( 'models/obj/female02/female02.obj', function ( object ) {

					const positions = combineBuffer( object, 'position' );

					createMesh( positions, scene, 4.05, - 1000, - 350, 0, 0xFF526C );
					createMesh( positions, scene, 4.05, 0, - 350, 0, 0xFFFFFF );
					createMesh( positions, scene, 4.05, 1000, - 350, 400, 0xFF526C );
					createMesh( positions, scene, 4.05, 250, - 350, 1500, 0xFF526C );
					createMesh( positions, scene, 4.05, 250, - 350, 2500, 0xFFFFFF );

				} );


				renderer = new THREE.WebGLRenderer();
				renderer.setPixelRatio( window.devicePixelRatio );
				renderer.setSize( window.innerWidth, window.innerHeight );
				renderer.autoClear = false;
				container.appendChild( renderer.domElement );

// Initialize OrbitControls after the renderer is created
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 100;
  controls.maxDistance = 5000;
  controls.maxPolarAngle = Math.PI / 2;

  // Enable pan using WASD keys
  controls.enableKeys = true;
  controls.keys = {
    LEFT: 65, // A
    UP: 87, // W
    RIGHT: 68, // D
    BOTTOM: 83, // S
  };

  // reflectors/mirrors

let geometry;

geometry = new THREE.PlaneGeometry(50000, 50000);
groundMirror = new Reflector(geometry, {
clipBias: 0.002,
textureWidth: window.innerWidth * window.devicePixelRatio,
textureHeight: window.innerHeight * window.devicePixelRatio,
color: 0x777777,
});

groundMirror.rotateX( - Math.PI / 2 );
groundMirror.position.set(0, -350, 0);
scene.add( groundMirror );

				parent = new THREE.Object3D();
				scene.add( parent );

				const grid = new THREE.Points( new THREE.PlaneGeometry( 15000, 15000, 64, 64 ), new THREE.PointsMaterial( { color: 0x000000, size: 10 } ) );
				grid.position.y = - 400;
				grid.rotation.x = - Math.PI / 2;
				parent.add( grid );

				// postprocessing

				const renderModel = new RenderPass( scene, camera );
				const effectBloom = new BloomPass( 0.2 );
				const effectFilm = new FilmPass( 0.5, 0.5, 1900, false );

				effectFocus = new ShaderPass( FocusShader );

				effectFocus.uniforms[ 'screenWidth' ].value = window.innerWidth * window.devicePixelRatio;
				effectFocus.uniforms[ 'screenHeight' ].value = window.innerHeight * window.devicePixelRatio;

				composer = new EffectComposer( renderer );

				composer.addPass( renderModel );
				composer.addPass( effectBloom );
				composer.addPass( effectFilm );
				composer.addPass( effectFocus );



			}


			function onWindowResize() {

				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();

				camera.lookAt( scene.position );

				renderer.setSize( window.innerWidth, window.innerHeight );
				composer.setSize( window.innerWidth, window.innerHeight );

				effectFocus.uniforms[ 'screenWidth' ].value = window.innerWidth * window.devicePixelRatio;
				effectFocus.uniforms[ 'screenHeight' ].value = window.innerHeight * window.devicePixelRatio;

			}

			function combineBuffer( model, bufferName ) {

				let count = 0;

				model.traverse( function ( child ) {

					if ( child.isMesh ) {

						const buffer = child.geometry.attributes[ bufferName ];

						count += buffer.array.length;

					}

				} );

				const combined = new Float32Array( count );

				let offset = 0;

				model.traverse( function ( child ) {

					if ( child.isMesh ) {

						const buffer = child.geometry.attributes[ bufferName ];

						combined.set( buffer.array, offset );
						offset += buffer.array.length;

					}

				} );

				return new THREE.BufferAttribute( combined, 3 );

			}

			function createMesh( positions, scene, scale, x, y, z, color ) {

				const geometry = new THREE.BufferGeometry();
				geometry.setAttribute( 'position', positions.clone() );
				geometry.setAttribute( 'initialPosition', positions.clone() );

				geometry.attributes.position.setUsage( THREE.DynamicDrawUsage );

				const clones = [

					[ 6000, 0, - 4000 ],
					[ 5000, 0, 0 ],
					[ 1000, 0, 5000 ],
					[ 1000, 0, - 5000 ],
					[ 4000, 0, 2000 ],
					[ - 4000, 0, 1000 ],
					[ - 5000, 0, - 5000 ],

					[ 0, 0, 0 ]

				];

				for ( let i = 0; i < clones.length; i ++ ) {

					const c = ( i < clones.length - 1 ) ? 0x252525 : color;

					mesh = new THREE.Points( geometry, new THREE.PointsMaterial( { size: 40, color: c } ) );
					mesh.scale.x = mesh.scale.y = mesh.scale.z = scale;

					mesh.position.x = x + clones[ i ][ 0 ];
					mesh.position.y = y + clones[ i ][ 1 ];
					mesh.position.z = z + clones[ i ][ 2 ];

					parent.add( mesh );

					clonemeshes.push( { mesh: mesh, speed: 0.5 + Math.random() } );

				}

				meshes.push( {
					mesh: mesh, verticesDown: 0, verticesUp: 0, direction: 0, speed: 15, delay: Math.floor( 200 + 200 * Math.random() ),
					start: Math.floor( 100 + 200 * Math.random() ),
				} );

			}

			function animate() {
				requestAnimationFrame(animate);
				render();

				controls.update();
			  }

			function render() {

				let delta = 10 * clock.getDelta();

				delta = delta < 2 ? delta : 2;

				//parent.rotation.y += - 0.02 * delta;

				for ( let j = 0; j < clonemeshes.length; j ++ ) {

					const cm = clonemeshes[ j ];
					cm.mesh.rotation.y += - 0.1 * delta * cm.speed;

				}

				for ( let j = 0; j < meshes.length; j ++ ) {

					const data = meshes[ j ];
					const positions = data.mesh.geometry.attributes.position;
					const initialPositions = data.mesh.geometry.attributes.initialPosition;

					const count = positions.count;

					if ( data.start > 0 ) {

						data.start -= 1;

					} else {

						if ( data.direction === 0 ) {

							data.direction = - 1;

						}

					}

					for ( let i = 0; i < count; i ++ ) {

						const px = positions.getX( i );
						const py = positions.getY( i );
						const pz = positions.getZ( i );

						// falling down
						if ( data.direction < 0 ) {

							if ( py > 0 ) {

								positions.setXYZ(
									i,
									px + 1.5 * ( 0.50 - Math.random() ) * data.speed * delta,
									py + 3.0 * ( 0.25 - Math.random() ) * data.speed * delta,
									pz + 1.5 * ( 0.50 - Math.random() ) * data.speed * delta
								);

							} else {

								data.verticesDown += 1;

							}

						}

						// rising up
						if ( data.direction > 0 ) {

							const ix = initialPositions.getX( i );
							const iy = initialPositions.getY( i );
							const iz = initialPositions.getZ( i );

							const dx = Math.abs( px - ix );
							const dy = Math.abs( py - iy );
							const dz = Math.abs( pz - iz );

							const d = dx + dy + dx;

							if ( d > 1 ) {

								positions.setXYZ(
									i,
									px - ( px - ix ) / dx * data.speed * delta * ( 0.85 - Math.random() ),
									py - ( py - iy ) / dy * data.speed * delta * ( 1 + Math.random() ),
									pz - ( pz - iz ) / dz * data.speed * delta * ( 0.85 - Math.random() )
								);

							} else {

								data.verticesUp += 1;

							}

						}

					}

					// all vertices down
					if ( data.verticesDown >= count ) {

						if ( data.delay <= 0 ) {

							data.direction = 1;
							data.speed = 5;
							data.verticesDown = 0;
							data.delay = 320;

						} else {

							data.delay -= 1;

						}

					}

					// all vertices up
					if ( data.verticesUp >= count ) {

						if ( data.delay <= 0 ) {

							data.direction = - 1;
							data.speed = 15;
							data.verticesUp = 0;
							data.delay = 120;

						} else {

							data.delay -= 1;

						}

					}

					positions.needsUpdate = true;

				}

				composer.render( 0.01 );

			}