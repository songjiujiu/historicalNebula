import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export interface BookOpeningScene {
  /** Total finite sequence: lift, native Blender animation, and a settled hold. */
  durationMs: number;
  render(progress: number): void;
  dispose(): void;
}

interface OpeningOptions { id: string; signal: AbortSignal; onUnavailable: () => void }
const ids = new Set(['shiji', 'hanshu', 'sanguozhi', 'jiutangshu', 'qingshigao']);
const liftMs = 450, holdMs = 500;
const smooth = (value: number) => { const t = Math.min(1, Math.max(0, value)); return t * t * (3 - 2 * t); };

/** The glTF clip carries real hinge rotations and curved-page morph targets. */
export async function createBookOpeningScene(container: HTMLElement, options: OpeningOptions): Promise<BookOpeningScene> {
  if (!ids.has(options.id)) throw new Error('Unknown opening book');
  const url = new URL(`${import.meta.env.BASE_URL}models/opening/${options.id}.glb`, location.href);
  const response = await fetch(url, { signal: options.signal });
  if (!response.ok) throw new Error('Book artwork unavailable');
  const bytes = await response.arrayBuffer();
  if (options.signal.aborted) throw new DOMException('Opening cancelled', 'AbortError');
  const gltf = await new GLTFLoader().parseAsync(bytes, new URL('.', url).href);
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  gltf.scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    object.castShadow = false; object.receiveShadow = false;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      // Preserve the selected shelf's antique cover colors exactly.
      if (material instanceof THREE.MeshBasicMaterial) material.toneMapped = false;
      Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); });
    }
  });
  let assetsReleased = false;
  const releaseAssets = () => {
    if (assetsReleased) return;
    assetsReleased = true;
    geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose());
    textures.forEach(item => {
      const bitmap = item.image;
      if (typeof ImageBitmap !== 'undefined' && bitmap instanceof ImageBitmap) bitmap.close();
      item.dispose();
    });
  };
  const clip = gltf.animations.find(animation => animation.name === 'BookOpen');
  if (!clip || !Number.isFinite(clip.duration) || clip.duration <= 0) { releaseAssets(); throw new Error('Opening animation unavailable'); }
  const clipDuration = clip.duration;
  if (options.signal.aborted || !container.isConnected) { releaseAssets(); throw new DOMException('Opening cancelled', 'AbortError'); }
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
  catch (error) { releaseAssets(); throw error; }
  let alive = true;
  const scene = new THREE.Scene(); scene.add(gltf.scene);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1;
  renderer.setClearColor(0, 0); renderer.shadowMap.enabled = false;
  const { width, height } = container.getBoundingClientRect();
  const aspect = width > 0 && height > 0 ? width / height : 1.4;
  const camera = new THREE.OrthographicCamera(-3.65 / 2, 3.65 / 2, 3.65 / aspect / 2, -3.65 / aspect / 2, .01, 30);
  scene.add(new THREE.HemisphereLight(0xfff6e5, 0x746a57, 1.7));
  const key = new THREE.DirectionalLight(0xfff5e5, 2.25); key.position.set(-3, 7, 4); scene.add(key);
  const fill = new THREE.DirectionalLight(0xe6eff7, .85); fill.position.set(4, 5, -3); scene.add(fill);
  const mixer = new THREE.AnimationMixer(gltf.scene);
  const action = mixer.clipAction(clip); action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play();
  const durationMs = liftMs + clipDuration * 1000 + holdMs;
  const lookAt = new THREE.Vector3();
  const onContextLost = (event: Event) => {
    event.preventDefault();
    try { dispose(); } finally { options.onUnavailable(); }
  };
  function dispose() {
    if (!alive) return;
    alive = false;
    options.signal.removeEventListener('abort', dispose);
    renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
    try { mixer.stopAllAction(); mixer.uncacheRoot(gltf.scene); }
    finally {
      try { renderer.dispose(); }
      finally {
        try { renderer.forceContextLoss(); }
        finally { renderer.domElement.remove(); releaseAssets(); }
      }
    }
  }
  function render(progress: number) {
    if (!alive) return;
    const elapsed = Math.max(0, Math.min(1, progress)) * durationMs;
    const animationTime = Math.max(0, Math.min(clipDuration, (elapsed - liftMs) / 1000));
    // Absolute seeking keeps a clamped action from resetting to its first pose on hold frames.
    action.time = animationTime; mixer.update(0);
    // From the original upright cover image into a readable three-quarter spread.
    const turn = smooth((elapsed - liftMs) / Math.min(1300, clipDuration * 700));
    // The raised page tips need room above the settled, flat reading position.
    const raised = Math.sin(Math.PI * animationTime / clipDuration);
    const span = 3.65 + .6 * raised;
    camera.left = -span / 2; camera.right = span / 2;
    camera.top = span / aspect / 2; camera.bottom = -span / aspect / 2;
    camera.updateProjectionMatrix();
    lookAt.set(.8 * (1 - turn), .075 + .5 * raised, 0);
    camera.position.set(.8 * (1 - turn), 4.9 - .5 * turn + .5 * raised, .35 + 2.65 * turn);
    camera.lookAt(lookAt); camera.updateMatrixWorld(); renderer.render(scene, camera);
  }
  try {
    renderer.setSize(Math.max(1, Math.round(width || 700)), Math.max(1, Math.round(height || 500)), false);
    renderer.domElement.setAttribute('aria-hidden', 'true'); container.append(renderer.domElement);
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    options.signal.addEventListener('abort', dispose, { once: true });
    if (options.signal.aborted) { dispose(); throw new DOMException('Opening cancelled', 'AbortError'); }
    render(0);
    return { durationMs, render, dispose };
  } catch (error) { dispose(); throw error; }
}
