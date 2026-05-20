import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';

const canvas = document.getElementById('hero-canvas');

if (!canvas) {
  console.warn('Canvas not found');
} else {

  // ======================================================
  // RENDERER
  // ======================================================

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
  );

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );

  renderer.setClearColor(0x000000, 0);

  renderer.outputColorSpace =
    THREE.SRGBColorSpace;

  renderer.toneMapping =
    THREE.ACESFilmicToneMapping;

  renderer.toneMappingExposure = 1.2;

  // ======================================================
  // SCENE
  // ======================================================

  const scene = new THREE.Scene();

  scene.fog = new THREE.Fog(
    0x020617,
    8,
    18
  );

  // ======================================================
  // CAMERA
  // ======================================================

  const camera = new THREE.PerspectiveCamera(
    35,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  camera.position.set(0, 0.5, 5);

  // ======================================================
  // LIGHTS
  // ======================================================

  const ambient =
    new THREE.AmbientLight(
      0xffffff,
      1.3
    );

  scene.add(ambient);

  const frontLight =
    new THREE.DirectionalLight(
      0xffffff,
      3
    );

  frontLight.position.set(0, 2, 5);

  scene.add(frontLight);

  const cyanLight =
    new THREE.PointLight(
      0x00d9ff,
      35,
      20
    );

  cyanLight.position.set(-3, 1, 3);

  scene.add(cyanLight);

  const purpleLight =
    new THREE.PointLight(
      0x7c3aed,
      35,
      20
    );

  purpleLight.position.set(3, 1, 3);

  scene.add(purpleLight);

  const backLight =
    new THREE.PointLight(
      0xffffff,
      20,
      30
    );

  backLight.position.set(0, 0, -5);

  scene.add(backLight);

  // ======================================================
  // MODEL
  // ======================================================

  let model;

  const loader = new GLTFLoader();

  loader.load(
    '/static/desktop/models/model.glb',

    (gltf) => {

      model = gltf.scene;

      scene.add(model);

      // ================================================
      // MATERIALS
      // ================================================

      model.traverse((child) => {

        if (child.isMesh) {

          child.geometry.computeVertexNormals();

          child.material.metalness =
            0.1;

          child.material.roughness =
            0.2;

          child.material.envMapIntensity =
            2;

          child.material.emissive =
            new THREE.Color(0x1d4ed8);

          child.material.emissiveIntensity =
            0.25;

          child.material.needsUpdate =
            true;

          // ORIGINAL POSITION
          child.userData.original =
            child.position.clone();

        }

      });

      // ================================================
      // FIT MODEL
      // ================================================

      const box =
        new THREE.Box3().setFromObject(
          model
        );

      const size =
        box.getSize(
          new THREE.Vector3()
        );

      const center =
        box.getCenter(
          new THREE.Vector3()
        );

      model.position.sub(center);

      const maxDim = Math.max(
        size.x,
        size.y,
        size.z
      );

      // НОРМАЛЬНЫЙ РАЗМЕР
      const scale =
        1 / maxDim;

      model.scale.setScalar(scale);

      // POSITION
      model.position.y = 0.5;

      model.position.z = -1;

      // ROTATION
      model.rotation.y =
        Math.PI + 0.65;

      model.rotation.x = 0.40;

      // INTRO
      gsap.from(model.scale, {

        x: 0,
        y: 0,
        z: 0,

        duration: 1.2,

        ease: 'expo.out'

      });

    },

    undefined,

    (err) => {

      console.error(err);

    }
  );

  // ======================================================
  // BUTTON
  // ======================================================

  const button =
    document.querySelector(
      '.launch-btn'
    );

  let exploded = false;

  if (button) {

    // ================================================
    // HOVER
    // ================================================

    button.addEventListener(
      'mouseenter',
      () => {

        if (!model || exploded)
          return;

        exploded = true;

        gsap.to(camera.position, {

          z: 4.5,

          duration: 0.6,

          ease: 'power2.out'

        });

        gsap.to(cyanLight, {

          intensity: 60,

          duration: 0.4

        });

        gsap.to(purpleLight, {

          intensity: 60,

          duration: 0.4

        });

        model.traverse(
          (child, i) => {

            if (!child.isMesh)
              return;

            const dir =
              new THREE.Vector3(
                child.position.x,
                child.position.y,
                child.position.z
              ).normalize();

            gsap.to(
              child.position,
              {

                x:
                  child.userData
                    .original.x +
                  dir.x * 0.35,

                y:
                  child.userData
                    .original.y +
                  dir.y * 0.35,

                z:
                  child.userData
                    .original.z +
                  dir.z * 0.35,

                duration: 0.7,

                ease:
                  'expo.out'

              }
            );

          }
        );

      }
    );

    // ================================================
    // LEAVE
    // ================================================

    button.addEventListener(
      'mouseleave',
      () => {

        if (!model) return;

        exploded = false;

        gsap.to(camera.position, {

          z: 5,

          duration: 0.7,

          ease: 'power2.out'

        });

        gsap.to(cyanLight, {

          intensity: 35,

          duration: 0.4

        });

        gsap.to(purpleLight, {

          intensity: 35,

          duration: 0.4

        });

        model.traverse((child) => {

          if (!child.isMesh)
            return;

          gsap.to(
            child.position,
            {

              x:
                child.userData
                  .original.x,

              y:
                child.userData
                  .original.y,

              z:
                child.userData
                  .original.z,

              duration: 0.9,

              ease:
                'expo.out'

            }
          );

        });

      }
    );

    // ================================================
    // CLICK
    // ================================================

    button.addEventListener(
      'click',
      () => {

        if (!model) return;

        gsap.to(model.rotation, {

          y:
            model.rotation.y +
            Math.PI * 2,

          duration: 1.4,

          ease: 'expo.out'

        });

        gsap.to(camera.position, {

          z: 3.8,

          duration: 0.25,

          yoyo: true,

          repeat: 1

        });

        gsap.to(cyanLight, {

          intensity: 120,

          duration: 0.2,

          yoyo: true,

          repeat: 1

        });

        gsap.to(purpleLight, {

          intensity: 120,

          duration: 0.2,

          yoyo: true,

          repeat: 1

        });

      }
    );

  }

  // ======================================================
  // MOUSE PARALLAX
  // ======================================================

  let mouseX = 0;

  let mouseY = 0;

  window.addEventListener(
    'pointermove',
    (e) => {

      mouseX =
        (
          e.clientX /
          window.innerWidth -
          0.5
        ) * 2;

      mouseY =
        (
          e.clientY /
          window.innerHeight -
          0.5
        ) * 2;

    }
  );

  // ======================================================
  // RESIZE
  // ======================================================

  window.addEventListener(
    'resize',
    () => {

      camera.aspect =
        window.innerWidth /
        window.innerHeight;

      camera.updateProjectionMatrix();

      renderer.setSize(
        window.innerWidth,
        window.innerHeight
      );

    }
  );

  // ======================================================
  // ANIMATE
  // ======================================================

  function animate() {

    requestAnimationFrame(
      animate
    );

    if (model) {

      // FLOAT
      model.position.y =
        Math.sin(
          Date.now() * 0.0015
        ) * 0.05 + 0.25;
model.position.x = 0.1// ROTATION
      model.rotation.y +=
        (
          Math.PI +
          0.65 +
          mouseX * 0.15 -
          model.rotation.y
        ) * 0.04;

      // TILT
      model.rotation.x =
        0.12 + mouseY * 0.1

    }

    renderer.render(
      scene,
      camera
    );

  }

  animate();

}