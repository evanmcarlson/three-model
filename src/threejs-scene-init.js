// Define an 8th Wall XR Camera Pipeline Module that adds a cube to a threejs scene on startup.

export const initScenePipelineModule = () => {
  const modelFile = require('./assets/doty.glb')  // 3D model to spawn at tap
  const loader = new THREE.GLTFLoader()           // This comes from GLTFLoader.js.

  let mixer
  const clock = new THREE.Clock()

  // Populates a cube into an XR scene and sets the initial camera position.
  const initXrScene = ({scene, camera, renderer}) => {
    // Enable shadows in the rednerer.
    renderer.shadowMap.enabled = true

    // Add some light to the scene.
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
    directionalLight.position.set(5, 10, 7)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    const ambientLight = new THREE.AmbientLight(0xffffff, 2)
    scene.add(ambientLight)

    // Add a 3D model
    loader.load(
      modelFile,  // resource URL.
      (gltf) => {
        const model = gltf.scene
        model.position.set(0, 0, 0)
        model.scale.set(5, 5, 5)

        // cast shadow
        model.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true
          }
        })

        // prebaked animation, if applicable
        mixer = new THREE.AnimationMixer(model)
        const clip = gltf.animations[0]
        mixer.clipAction(clip.optimize()).play()

        scene.add(model)
      }
    )

    // Add a plane that can receive shadows.
    const planeGeometry = new THREE.PlaneGeometry(2000, 2000)
    planeGeometry.rotateX(-Math.PI / 2)

    const planeMaterial = new THREE.ShadowMaterial()
    planeMaterial.opacity = 0.67

    const plane = new THREE.Mesh(planeGeometry, planeMaterial)
    plane.receiveShadow = true
    scene.add(plane)

    // Set the initial camera position relative to the scene we just laid out. This must be at a
    // height greater than y=0.
    camera.position.set(0, 2, 2)
  }

  // Return a camera pipeline module that adds scene elements on start.
  return {
    // Camera pipeline modules need a name. It can be whatever you want but must be unique within
    // your app.
    name: 'threejsinitscene',

    // onStart is called once when the camera feed begins. In this case, we need to wait for the
    // XR8.Threejs scene to be ready before we can access it to add content. It was created in
    // XR8.Threejs.pipelineModule()'s onStart method.
    onStart: ({canvas}) => {
      const {scene, camera, renderer} = XR8.Threejs.xrScene()  // Get the 3js scene from XR8.Threejs

      initXrScene({scene, camera, renderer})  // Add objects set the starting camera position.

      // prevent scroll/pinch gestures on canvas
      canvas.addEventListener('touchmove', (event) => {
        event.preventDefault()
      })

      // Sync the xr controller's 6DoF position and camera paremeters with our scene.
      XR8.XrController.updateCameraProjectionMatrix(
        {origin: camera.position, facing: camera.quaternion}
      )

      // Recenter content when the canvas is tapped.
      canvas.addEventListener(
        'touchstart', (e) => {
          e.touches.length === 1 && XR8.XrController.recenter()
        }, true
      )
    },
    onUpdate: () => {
      if (!mixer) {
        return
      }
      // Animate the model
      const delta = clock.getDelta()
      mixer.update(delta)
    },
  }
}
