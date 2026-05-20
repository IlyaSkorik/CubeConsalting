import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const canvas = document.getElementById('solutions-canvas');
if (!canvas) {
  console.warn('Solutions 3D canvas not found.');
} else {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x020817, 2, 12);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x020817, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.8, 4.5);
  camera.layers.enableAll();

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(2.5, 4, 4);
  scene.add(keyLight);

  const hemiLight = new THREE.HemisphereLight(0xcce0ff, 0x151b27, 0.85);
  scene.add(hemiLight);

  const fillLight = new THREE.PointLight(0x00d9ff, 8, 25);
  fillLight.position.set(-1.8, 1.3, 3);
  scene.add(fillLight);

  const rimLight = new THREE.PointLight(0x7c3aed, 8, 24);
  rimLight.position.set(1.8, 1.5, 3.5);
  scene.add(rimLight);

  const backLight = new THREE.PointLight(0xffffff, 6, 35);
  backLight.position.set(0, 0, -6);
  scene.add(backLight);

  const loader = new GLTFLoader();
  const section = document.getElementById('solutions-section');
  const state = {
    model: null,
    baseScale: 1,
    shrinkScale: 1,
    targetScale: 1,
    currentScale: 0,
    smallCubes: [],
  };

  const createPlaceholderCube = () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x4f46e5,
      metalness: 0.3,
      roughness: 0.35,
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 0, 0);
    scene.add(cube);

    state.model = cube;
    state.baseScale = 1;
    state.shrinkScale = 1 / 1.5;
    state.targetScale = state.shrinkScale;
    state.currentScale = state.targetScale;
    cube.scale.setScalar(state.currentScale);
  };

  const resizeRenderer = () => {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const setSectionVisibility = (visible) => {
    if (!state.model) {
      return;
    }

    state.targetScale = visible ? state.shrinkScale : state.baseScale;
  };

  if (section) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setSectionVisibility(entry.isIntersecting && entry.intersectionRatio > 0.35);
        });
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    observer.observe(section);
  }

  window.addEventListener('resize', resizeRenderer);
  resizeRenderer();

  loader.load(
    '/static/desktop/models/model2.glb',
    (gltf) => {
      const model = gltf.scene;
      scene.add(model);

      const layerMasks = new Set();
      gltf.scene.traverse((child) => {
        if (child.layers) {
          layerMasks.add(child.layers.mask);
          console.log('model2 node:', child.name || child.type, 'layerMask:', child.layers.mask);
        }

        if (child.isMesh) {
          const name = (child.name || '').toLowerCase();
          if (name.includes('маленький') || name.includes('small')) {
            child.layers.set(2);
            state.smallCubes.push(child);
          } else {
            child.layers.set(1);
          }

          child.geometry.computeVertexNormals();
          child.material.metalness = 0.16;
          child.material.roughness = 0.24;
          child.material.envMapIntensity = 1.5;
          child.material.emissive = new THREE.Color(0x0a1b40);
          child.material.emissiveIntensity = 0.18;
          child.material.needsUpdate = true;
        }
      });

      console.log('model2 layer masks:', [...layerMasks].sort((a, b) => a - b));

      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      model.position.sub(center);
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = maxDim > 0 ? 1.05 / maxDim : 1;
      const shrinkRatio = 1.5;

      state.model = model;
      state.baseScale = scale;
      state.shrinkScale = scale / shrinkRatio;
      state.targetScale = state.shrinkScale;
      state.currentScale = state.targetScale;
      model.scale.setScalar(state.currentScale);
    },
    undefined,
    (error) => {
      console.error('Failed to load model2.glb', error);
      createPlaceholderCube();
    }
  );

  const clock = new THREE.Clock();

  const tick = () => {
    window.requestAnimationFrame(tick);

    if (state.model) {
      const delta = clock.getDelta();
      const lerpFactor = 1 - Math.pow(0.25, delta * 3);
      state.currentScale += (state.targetScale - state.currentScale) * lerpFactor;
      state.model.scale.setScalar(state.currentScale);
      state.model.rotation.y += 0.004;
      state.model.rotation.x += 0.0009;
    }

    renderer.render(scene, camera);
  };

  const setModelLayerVisibility = (layers) => {
    const layersSet = new Set(layers);
    camera.layers.disableAll();
    layersSet.forEach((layer) => camera.layers.enable(layer));
    console.log('switched model2 visible layers to:', [...layersSet].sort((a, b) => a - b));
  };

  const moveOneSmallCubeLeft = () => {
    if (state.smallCubes.length === 0) {
      console.warn('No small cubes found to move');
      return;
    }

    const cube = state.smallCubes[0];
    cube.position.x -= 0.35;
    console.log('Moved one small cube left:', cube.name || cube.type, 'new x:', cube.position.x);
  };

  window.addEventListener('keydown', (event) => {
    if (event.key === '1') {
      setModelLayerVisibility([1]);
    } else if (event.key === '2') {
      setModelLayerVisibility([2]);
    } else if (event.key === '0') {
      setModelLayerVisibility([1, 2]);
    } else if (event.key === '3') {
      moveOneSmallCubeLeft();
    }
  });

  tick();
}
