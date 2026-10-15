import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/** Optional examination of the real book meshes. No permanent animation loop. */
export async function openReadingModel(stage: HTMLElement, signal?: AbortSignal): Promise<() => void> {
  const model = stage.dataset.readingModel;
  if (!['reading-desk', 'archive-books', 'modern-archive'].includes(model ?? '')) throw new Error('Unknown model');
  const gltf = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/reading/${model}.glb`);
  const scene = new THREE.Scene(); scene.add(gltf.scene);
  const camera = gltf.cameras.find(item => item instanceof THREE.OrthographicCamera) as THREE.OrthographicCamera | undefined;
  const materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>(), geometries = new Set<THREE.BufferGeometry>();
  gltf.scene.traverse(object => {
    if (object instanceof THREE.Mesh) {
      geometries.add(object.geometry); object.castShadow = true; object.receiveShadow = true;
      (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => {
        materials.add(material);
        Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); });
      });
    }
  });
  const releaseAsset = () => {
    geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose());
    textures.forEach(item => { const bitmap = item.image; if (typeof ImageBitmap !== 'undefined' && bitmap instanceof ImageBitmap) bitmap.close(); item.dispose(); });
  };
  if (signal?.aborted || !stage.isConnected) {
    releaseAsset(); throw new DOMException('Model loading cancelled', 'AbortError');
  }
  if (!camera) { releaseAsset(); throw new Error('Model camera unavailable'); }
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
  catch (error) { releaseAsset(); throw error; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.11; renderer.setClearColor(0, 0);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.add(new THREE.HemisphereLight(0xffedd5, 0x323b3a, .65));
  const key = new THREE.DirectionalLight(0xffe0af, 2.7); key.position.set(-3, 8, 4); key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: .1, far: 22 });
  key.shadow.mapSize.set(1024,1024); key.shadow.bias = .0002; key.shadow.normalBias = .04; scene.add(key);
  const fill = new THREE.DirectionalLight(0xcbd9e7, 1.1); fill.position.set(5, 5, 1); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffcc8a, 1.9); rim.position.set(1, 6, -5); scene.add(rim);
  scene.updateMatrixWorld(true);
  const worldCamera = camera.clone(); worldCamera.position.copy(camera.getWorldPosition(new THREE.Vector3()));
  worldCamera.quaternion.copy(camera.getWorldQuaternion(new THREE.Quaternion()));
  const box = new THREE.Box3(); gltf.scene.traverse(object => { if (object instanceof THREE.Mesh) box.expandByObject(object); });
  const controls = new OrbitControls(worldCamera, renderer.domElement);
  controls.target.copy(box.getCenter(new THREE.Vector3()));
  controls.enablePan = false; controls.enableZoom = false; controls.enableDamping = false;
  controls.minPolarAngle = Math.PI / 7; controls.maxPolarAngle = Math.PI / 2.1;
  let alive = true;
  function draw() { if (alive && stage.isConnected) renderer.render(scene, worldCamera); }
  controls.addEventListener('change', draw);
  const bounds = { left: camera.left, right: camera.right, top: camera.top, bottom: camera.bottom };
  function resize() {
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height || !alive) return;
    const cameraAspect = (bounds.right - bounds.left) / (bounds.top - bounds.bottom);
    const ratio = width / height / cameraAspect;
    worldCamera.left = bounds.left * ratio; worldCamera.right = bounds.right * ratio;
    worldCamera.updateProjectionMatrix(); renderer.setSize(width, height, false); draw();
  }
  const observer = new ResizeObserver(resize);
  const keydown = (event: KeyboardEvent) => {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const offset = worldCamera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    if (event.key === 'ArrowLeft') spherical.theta -= .12;
    if (event.key === 'ArrowRight') spherical.theta += .12;
    if (event.key === 'ArrowUp') spherical.phi = Math.max(controls.minPolarAngle, spherical.phi - .10);
    if (event.key === 'ArrowDown') spherical.phi = Math.min(controls.maxPolarAngle, spherical.phi + .10);
    worldCamera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical)); controls.update(); draw();
  };
  let release: () => void = () => {};
  const onContextLost = (event: Event) => {
    event.preventDefault(); release();
    stage.dispatchEvent(new Event('reading-model-unavailable', { bubbles: true }));
  };
  stage.querySelector('.reading-model-canvas')!.append(renderer.domElement);
  stage.tabIndex = 0; stage.setAttribute('aria-label', '陈列模型，拖动或用方向键转动');
  stage.addEventListener('keydown', keydown); renderer.domElement.addEventListener('webglcontextlost', onContextLost);
  controls.update(); observer.observe(stage); resize(); stage.classList.add('is-interactive');
  release = () => {
    if (!alive) return;
    alive = false; observer.disconnect(); controls.removeEventListener('change', draw); controls.dispose();
    stage.removeEventListener('keydown', keydown); renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
    stage.removeAttribute('tabindex'); stage.removeAttribute('aria-label'); stage.classList.remove('is-interactive');
    key.shadow.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); releaseAsset();
  };
  return release;
}
