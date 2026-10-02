import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** Demand-rendered Blender assets. No drifting labels or permanent animation loop. */
export async function mountHistoryModels(host: HTMLElement): Promise<() => void> {
  if (!('WebGLRenderingContext' in window) || window.innerWidth < 760 || (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return () => {};
  const cleanups: (() => void)[] = [];
  const loader = new GLTFLoader();
  await Promise.all(Array.from(host.querySelectorAll<HTMLElement>('[data-history-model]')).map(async stage => {
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
    catch { return; }
    const mount = stage.querySelector<HTMLElement>('.stage-canvas')!;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    let alive = true, frame = 0;
    const scene = new THREE.Scene();
    const roots = new Map<string, THREE.Object3D>();
    let camera: THREE.OrthographicCamera | undefined;
    let active = '';
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function draw() { if (alive && camera && stage.isConnected) renderer.render(scene, camera); }
    function resize() {
      const {width,height} = stage.getBoundingClientRect();
      if (width > 0 && height > 0) { renderer.setSize(width,height,false); draw(); }
    }
    const observer = new ResizeObserver(resize);
    const onContextLost = (event: Event) => { event.preventDefault(); stage.classList.remove('model-ready'); };
    renderer.domElement.addEventListener('webglcontextlost',onContextLost);
    const onHover = (event: Event) => {
      const target = (event.target as Element).closest<HTMLElement>('[data-stage-book]');
      active = event.type === 'pointerleave' || event.type === 'focusout' ? '' : target?.dataset.stageBook ?? '';
      if (!roots.size || reduced) return;
      cancelAnimationFrame(frame);
      let ticks = 0;
      const animate = () => {
        if (!alive || !stage.isConnected) return;
        roots.forEach((root,id) => {
          const home = root.userData.home as THREE.Vector3;
          root.position.z = THREE.MathUtils.lerp(root.position.z, home.z + (id === active ? .15 : 0), .22);
          root.position.y = THREE.MathUtils.lerp(root.position.y, home.y + (id === active ? .035 : 0), .22);
        });
        draw(); if (++ticks < 24) frame = requestAnimationFrame(animate);
      }; frame = requestAnimationFrame(animate);
    };
    const region = stage.closest('.shelf-display');
    region?.addEventListener('pointerover',onHover); region?.addEventListener('pointerleave',onHover);
    region?.addEventListener('focusin',onHover); region?.addEventListener('focusout',onHover);
    const release = () => {
      alive=false;cancelAnimationFrame(frame);observer.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost',onContextLost);
      region?.removeEventListener('pointerover',onHover);region?.removeEventListener('pointerleave',onHover);
      region?.removeEventListener('focusin',onHover);region?.removeEventListener('focusout',onHover);
      scene.traverse(object=>{
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material=>{Object.values(material).forEach(value=>{if(value instanceof THREE.Texture){const bitmap=value.image;if(typeof ImageBitmap!=='undefined' && bitmap instanceof ImageBitmap)bitmap.close();value.dispose();}});material.dispose();});
        }
      });
      renderer.dispose();renderer.domElement.remove();stage.classList.remove('model-ready');
    };
    cleanups.push(release);
    try {
      const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}models/history/${stage.dataset.historyModel}.glb`);
      scene.add(gltf.scene);
      gltf.scene.traverse(object=>{
        if(object.name.startsWith('book-')) { roots.set(object.name.slice(5),object); object.userData.home=object.position.clone(); }
        if(object instanceof THREE.Mesh) object.frustumCulled=false;
      });
      if (!alive || !stage.isConnected) { release(); return; }
      camera=gltf.cameras.find(c=>c instanceof THREE.OrthographicCamera) as THREE.OrthographicCamera | undefined;
      if (!camera) { release(); return; }
      scene.add(new THREE.HemisphereLight(0xe0d4bb,0x343039,2));
      const light=new THREE.DirectionalLight(0xffdb9d,2.5);light.position.set(-3,6,8);scene.add(light);
      mount.append(renderer.domElement);observer.observe(stage);resize();stage.classList.add('model-ready');
    } catch { release(); /* Keep the Blender-rendered poster and working links. */ }
  }));
  return () => cleanups.forEach(dispose=>dispose());
}
