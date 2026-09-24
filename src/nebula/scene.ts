import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import type { GraphView, Group, Relation, SceneController, SceneOptions, SpatialSnapshot, Vec3 } from '../domain/types';
import { createLayout, hash, validVector } from './layout';

const COLORS: Record<Group, string> = {
  wu: '#7de2ce', shu: '#dcb779', wei: '#92aefe',
  chu: '#e8a46d', han: '#70c7dc', qin: '#a898d5', neutral: '#cfabed',
};
const TIERS = {
  low: { stars: 1500, clouds: 2, dpr: 1, pixels: 800000 },
  medium: { stars: 4000, clouds: 5, dpr: 1.25, pixels: 1500000 },
  high: { stars: 8000, clouds: 8, dpr: 1.5, pixels: 2100000 },
};
type Quality = keyof typeof TIERS;
interface ProjectedNode { id: string; x: number; y: number; z: number; radius: number }
interface Edge { relation: Relation; points: THREE.Vector3[] }

function seededRandom(seed: number) {
  return () => {
    seed += 0x6D2B79F5;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCloudTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('无法建立星云纹理。');
  const data = context.createImageData(size, size);
  const random = seededRandom(194208);
  const grid = new Float32Array(128 * 128);
  for (let i = 0; i < grid.length; i++) grid[i] = random();
  const noise = (x: number, y: number) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    let u = x - ix, v = y - iy;
    u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
    const at = (a: number, b: number) => grid[(a & 127) + (b & 127) * 128];
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(at(ix, iy), at(ix + 1, iy), u), THREE.MathUtils.lerp(at(ix, iy + 1), at(ix + 1, iy + 1), u), v);
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = (x / size - .5) * 2, ny = (y / size - .5) * 2;
    const turbulent = noise(x / 47, y / 47) * .55 + noise(x / 21 + 24, y / 21 + 9) * .26 + noise(x / 8, y / 8) * .13 + noise(x / 3, y / 3) * .06;
    const falloff = Math.pow(Math.max(0, 1 - nx * nx - ny * ny), 2.3);
    const alpha = Math.pow(Math.max(0, turbulent - .17), 1.7) * falloff;
    const pixel = (y * size + x) * 4;
    data.data[pixel] = data.data[pixel + 1] = data.data[pixel + 2] = 255;
    data.data[pixel + 3] = Math.min(255, alpha * 640);
  }
  context.putImageData(data, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** One renderer, with independent decorative and historical-data scenes. */
export function createNebulaScene(container: HTMLElement, options: SceneOptions): SceneController {
  const initializationCleanup: Array<() => void> = [];
  try {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  initializationCleanup.push(() => { renderer.setAnimationLoop(null); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); });
  renderer.setClearColor(0x050812, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.autoClear = false;
  renderer.domElement.className = 'nebula-canvas';
  renderer.domElement.setAttribute('aria-label', '历史关系三维星云，可拖动探索；完整内容也可通过列表访问。');
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;outline:none;';
  container.append(renderer.domElement);

  const style = document.createElement('style');
  style.textContent = `
    .nebula-labels{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:2}
    .nebula-label{position:absolute;left:0;top:0;display:flex;min-height:40px;min-width:54px;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:3px 9px;border:1px solid transparent;border-radius:7px;background:transparent;pointer-events:auto;color:#e2e5ed;cursor:pointer;line-height:1.25;text-shadow:0 1px 7px #050812,0 0 16px #050812;font-family:inherit;white-space:nowrap;transition:color .16s,background .16s,border-color .16s}
    .nebula-label strong{font-size:14px;font-weight:500;letter-spacing:1.7px}
    .nebula-label small{font-size:9px;font-weight:400;letter-spacing:1px;color:#8c98b4}
    .nebula-label:hover,.nebula-label:focus-visible{outline:none;color:white;border-color:#526477;background:#0c162ada}
    .nebula-label[data-selected=true]{color:#f4d69f;border-color:#b99b614f;background:#111525a8}
    .nebula-label[data-center=true] strong{font-size:18px;font-weight:550;letter-spacing:3px}
    .nebula-label[data-center=true] small{color:#b7a584}
    .nebula-label[data-context=true]{opacity:.55}
    .nebula-edge-hint{position:absolute;transform:translate(-50%,-135%);padding:6px 10px;border:1px solid #7894b64a;border-radius:5px;background:#0b1422ef;color:#d9e5f2;font:11px/1.5 inherit;letter-spacing:1px;pointer-events:none;white-space:nowrap}
    .nebula-pick-menu{position:absolute;width:235px;padding:8px;border:1px solid #476080;border-radius:9px;background:#0a1426f5;box-shadow:0 10px 40px #0008;pointer-events:auto;color:#bbc9dd;font:11px/1.6 inherit;z-index:3000}.nebula-pick-menu p{margin:3px 7px 6px}.nebula-pick-menu button{display:block;width:100%;border:0;border-radius:5px;background:none;text-align:left;color:#e5dfd2;padding:8px;font:12px/1.7 inherit;cursor:pointer}.nebula-pick-menu button:hover,.nebula-pick-menu button:focus-visible{background:#1d3049;outline:1px solid #7d98b7}
    @media(max-width:720px){.nebula-label{min-width:44px;min-height:44px;padding:3px 6px}.nebula-label strong{font-size:12px}.nebula-label small{font-size:8px}}
  `;
  container.append(style);
  initializationCleanup.push(() => style.remove());
  const labelsLayer = document.createElement('div');
  labelsLayer.className = 'nebula-labels';
  container.append(labelsLayer);
  initializationCleanup.push(() => labelsLayer.remove());
  initializationCleanup.push(() => { delete container.dataset.quality; });
  const edgeHint = document.createElement('div');
  edgeHint.className = 'nebula-edge-hint';
  edgeHint.hidden = true;
  labelsLayer.append(edgeHint);
  const pickMenu = document.createElement('div');
  pickMenu.className = 'nebula-pick-menu';
  pickMenu.setAttribute('role', 'group');
  pickMenu.setAttribute('aria-label', '选择重叠的关系');
  pickMenu.hidden = true;
  labelsLayer.append(pickMenu);

  const scene = new THREE.Scene();
  const background = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, 1, 1, 1800);
  camera.position.set(0, 0, 198);
  const controls = new OrbitControls(camera, renderer.domElement);
  initializationCleanup.push(() => controls.dispose());
  controls.enableDamping = true;
  controls.dampingFactor = .095;
  controls.rotateSpeed = .42;
  controls.panSpeed = .7;
  controls.zoomSpeed = .65;
  controls.minDistance = 34;
  controls.maxDistance = 700;
  controls.minPolarAngle = Math.PI * .14;
  controls.maxPolarAngle = Math.PI * .86;
  controls.screenSpacePanning = true;
  controls.touches.ONE = window.matchMedia('(pointer: coarse)').matches ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
  controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
  controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  initializationCleanup.push(() => {
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    textures.forEach(texture => texture.dispose());
  });
  const ownGeometry = <T extends THREE.BufferGeometry>(geometry: T): T => { geometries.add(geometry); return geometry; };
  const ownMaterial = <T extends THREE.Material>(material: T): T => { materials.add(material); return material; };

  const starRandom = seededRandom(220208);
  const starPositions = new Float32Array(8000 * 3);
  const starColors = new Float32Array(8000 * 3);
  const starSizes = new Float32Array(8000);
  for (let index = 0; index < 8000; index++) {
    starPositions[index * 3] = (starRandom() - .5) * 1250;
    starPositions[index * 3 + 1] = (starRandom() - .5) * 950;
    starPositions[index * 3 + 2] = -100 - starRandom() * 650;
    const brightness = .28 + starRandom() * .65;
    const color = new THREE.Color().setHSL(.54 + starRandom() * .17, .15 + starRandom() * .4, brightness);
    color.toArray(starColors, index * 3);
    starSizes[index] = starRandom() > .986 ? 3.7 + starRandom() * 2 : .5 + starRandom() * 1.3;
  }
  const starGeometry = ownGeometry(new THREE.BufferGeometry());
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  starGeometry.setAttribute('aSize', new THREE.BufferAttribute(starSizes, 1));
  const starMaterial = ownMaterial(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uDpr: { value: 1 }, uTime: { value: 0 } },
    vertexShader: `attribute float aSize; attribute vec3 color; uniform float uDpr; uniform float uTime; varying vec3 vColor; varying float vSize;
      void main(){vColor=color;vSize=aSize;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=max(1.,aSize*uDpr*430./max(100.,-p.z));}`,
    fragmentShader: `varying vec3 vColor;varying float vSize;
      void main(){vec2 p=gl_PointCoord-.5;float d=length(p);float a=exp(-d*d*26.);if(vSize>3.)a+=.23*exp(-abs(p.x)*90.)*exp(-abs(p.y)*5.)+.23*exp(-abs(p.y)*90.)*exp(-abs(p.x)*5.);gl_FragColor=vec4(vColor,a*.85);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  }));
  background.add(new THREE.Points(starGeometry, starMaterial));

  const cloudTexture = makeCloudTexture();
  textures.add(cloudTexture);
  const cloudSettings = [
    [-73, 21, -90, 280, 140, '#364faf', .35, -.42],
    [52, -14, -65, 270, 130, '#307e92', .25, .38],
    [-48, -16, -120, 185, 110, '#63337d', .25, -.6],
    [22, 30, -110, 145, 85, '#366c85', .19, .2],
    [4, 5, -95, 165, 58, '#8c6642', .14, -.7],
    [98, 46, -160, 210, 160, '#3a5496', .17, .6],
    [-130, -69, -170, 270, 160, '#422467', .2, -.1],
    [34, -72, -190, 240, 110, '#245073', .14, -.3],
  ] as const;
  const clouds = cloudSettings.map(([x, y, z, sx, sy, color, opacity, rotation]) => {
    const material = ownMaterial(new THREE.SpriteMaterial({ map: cloudTexture, color, opacity, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, rotation }));
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, y, z);
    sprite.scale.set(sx, sy, 1);
    background.add(sprite);
    return { sprite, opacity, rotation };
  });

  scene.add(new THREE.AmbientLight(0xcddcff, 1.6));
  const keyLight = new THREE.DirectionalLight(0xd3e8ff, 3);
  keyLight.position.set(-40, 70, 110);
  scene.add(keyLight);
  const coreMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: .28, roughness: .29, emissive: 0x202637, emissiveIntensity: .8 }));
  const people = new THREE.InstancedMesh(ownGeometry(new THREE.SphereGeometry(1.15, 20, 14)), coreMaterial, 50);
  initializationCleanup.push(() => people.dispose());
  const events = new THREE.InstancedMesh(ownGeometry(new THREE.OctahedronGeometry(1.8, 0)), coreMaterial, 50);
  initializationCleanup.push(() => events.dispose());
  people.count = events.count = 0;
  people.frustumCulled = events.frustumCulled = false;
  scene.add(people, events);
  const glowMaterial = ownMaterial(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv;varying vec3 vColor;
      void main(){vUv=uv;vColor=instanceColor;vec4 center=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);float scale=length(instanceMatrix[0].xyz);center.xy+=position.xy*scale;gl_Position=projectionMatrix*center;}`,
    fragmentShader: `varying vec2 vUv;varying vec3 vColor;
      void main(){float d=length(vUv-.5)*2.;float glow=exp(-d*d*5.5)*.25+exp(-d*d*52.)*.46;gl_FragColor=vec4(vColor,glow*(1.-smoothstep(.5,1.,d)));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  }));
  const glows = new THREE.InstancedMesh(ownGeometry(new THREE.PlaneGeometry(1, 1)), glowMaterial, 50);
  initializationCleanup.push(() => glows.dispose());
  glows.count = 0;
  glows.setColorAt(0, new THREE.Color(0xffffff));
  glows.frustumCulled = false;
  scene.add(glows);
  const ringMaterial = ownMaterial(new THREE.MeshBasicMaterial({ color: 0xe8c884, transparent: true, opacity: .54, depthWrite: false, blending: THREE.AdditiveBlending }));
  const centerRing = new THREE.Mesh(ownGeometry(new THREE.TorusGeometry(5.9, .045, 5, 120)), ringMaterial);
  const orbitRing = new THREE.Mesh(ownGeometry(new THREE.TorusGeometry(8.5, .022, 4, 150)), ownMaterial(new THREE.MeshBasicMaterial({ color: 0xad92d1, transparent: true, opacity: .18, depthWrite: false })));
  const selectedRing = new THREE.Mesh(ownGeometry(new THREE.TorusGeometry(3.9, .065, 5, 72)), ownMaterial(new THREE.MeshBasicMaterial({ color: 0xf1d4a1, transparent: true, opacity: .76, depthWrite: false })));
  scene.add(centerRing, orbitRing, selectedRing);
  const arrows = new THREE.InstancedMesh(ownGeometry(new THREE.ConeGeometry(.4, 1.3, 5)), ownMaterial(new THREE.MeshBasicMaterial({ color: 0xb1c6e0, transparent: true, opacity: .4 })), 300);
  initializationCleanup.push(() => arrows.dispose());
  arrows.count = 0;
  arrows.frustumCulled = false;
  scene.add(arrows);
  const edgeGroup = new THREE.Group();
  scene.add(edgeGroup);
  const lineMaterials: LineMaterial[] = [];
  const edgeGeometries: LineSegmentsGeometry[] = [];
  initializationCleanup.push(() => {
    lineMaterials.forEach(material => material.dispose());
    edgeGeometries.forEach(geometry => geometry.dispose());
  });
  let graph: GraphView = { nodes: [], relations: [], contextIds: [], centerId: '', selectedId: null, relationId: null };
  let positions: Record<string, Vec3> = {};
  const labels = new Map<string, HTMLButtonElement>();
  let projectedNodes: ProjectedNode[] = [];
  let edges: Edge[] = [];
  const personIds: string[] = [], eventIds: string[] = [];
  let width = 1, height = 1;
  let quality: Quality = window.matchMedia('(max-width:720px)').matches ? 'low' : 'medium';
  let disposed = false, active = true, contextLost = false, running = false, applying = false, shaderFailed = false;
  let motion = false, motionRequested = false, idleFrames = 0, previousTime = 0, atmosphereTime = 0;
  let hoverId: string | null = null;
  let pointerStart: { x: number; y: number; time: number; id: number } | null = null;
  let multitouch = false;
  const pointerIds = new Set<number>();
  let interaction = false;
  let sampleDuration = 0, slowWindows = 0, cooldown = 0;
  let frameSamples: number[] = [];
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const point = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();

  function stop() {
    renderer.setAnimationLoop(null);
    running = false;
    previousTime = 0;
    frameSamples = [];
    sampleDuration = 0;
    slowWindows = 0;
  }

  function invalidate() {
    idleFrames = 0;
    if (disposed || !active || contextLost || shaderFailed || document.hidden || running) return;
    running = true;
    renderer.setAnimationLoop(tick);
  }

  function updateLabels() {
    camera.updateMatrixWorld();
    projectedNodes = [];
    for (const node of graph.nodes) {
      const position = positions[node.id];
      if (!position) continue;
      point.fromArray(position).project(camera);
      const label = labels.get(node.id)!;
      if (point.z < -1 || point.z > 1 || Math.abs(point.x) > 1.14 || Math.abs(point.y) > 1.14) {
        label.style.display = 'none';
        continue;
      }
      projectedNodes.push({ id: node.id, x: (point.x + 1) * width / 2, y: (1 - point.y) * height / 2, z: point.z, radius: node.id === graph.centerId ? 16 : 11 });
    }
    const highlightedRelation = graph.relations.find(relation => relation.id === graph.relationId);
    const priority = (id: string) => id === graph.selectedId ? 1000 : id === graph.centerId ? 900 : id === hoverId ? 800 : id === highlightedRelation?.source || id === highlightedRelation?.target ? 700 : 0;
    const sorted = [...projectedNodes].sort((a, b) => priority(b.id) - priority(a.id) || a.z - b.z);
    const occupied: Array<{ left: number; top: number; right: number; bottom: number }> = [];
    let count = 0;
    const budget = width < 650 ? 12 : 24;
    for (const node of sorted) {
      const label = labels.get(node.id)!;
      label.style.display = 'flex';
      const labelWidth = label.offsetWidth || 70;
      const labelHeight = label.offsetHeight || 40;
      const hiddenByNode = sorted.some(other => other.id !== node.id && other.z < node.z && Math.hypot(other.x - node.x, other.y - node.y) < 9);
      if ((count >= budget || hiddenByNode) && priority(node.id) === 0) { label.style.display = 'none'; continue; }
      const below = node.id === graph.centerId ? 17 : 9;
      const candidates = [[-labelWidth / 2, below], [-labelWidth / 2, -labelHeight - 12], [12, -labelHeight / 2], [-labelWidth - 12, -labelHeight / 2]];
      let placement: { left: number; top: number; right: number; bottom: number } | undefined;
      for (const [dx, dy] of candidates) {
        const candidate = { left: node.x + dx, top: node.y + dy, right: node.x + dx + labelWidth, bottom: node.y + dy + labelHeight };
        if (candidate.left < 6 || candidate.right > width - 6 || candidate.top < 5 || candidate.bottom > height - 5) continue;
        if (!occupied.some(other => candidate.left < other.right + 5 && candidate.right + 5 > other.left && candidate.top < other.bottom + 2 && candidate.bottom + 2 > other.top)) { placement = candidate; break; }
      }
      if (!placement) { label.style.display = 'none'; continue; }
      occupied.push(placement);
      label.style.transform = `translate3d(${Math.round(placement.left)}px,${Math.round(placement.top)}px,0)`;
      label.style.zIndex = `${Math.round(1000 - node.z * 500 + priority(node.id))}`;
      count++;
    }
  }

  function tick(time: number) {
    if (disposed || !active || contextLost || shaderFailed || document.hidden) { stop(); return; }
    const delta = previousTime ? Math.min((time - previousTime) / 1000, .08) : 0;
    previousTime = time;
    const changed = controls.update();
    if (controls.target.length() > 240) {
      const bounded = controls.target.clone().clampLength(0, 240);
      camera.position.add(bounded.clone().sub(controls.target));
      controls.target.copy(bounded);
    }
    if (changed) idleFrames = 0;
    else idleFrames++;
    if (motion) {
      atmosphereTime += delta;
      clouds.forEach(({ sprite, opacity, rotation }, index) => {
        sprite.material.opacity = opacity * (1 + Math.sin(atmosphereTime * .15 + index) * .075);
        sprite.material.rotation = rotation + Math.sin(atmosphereTime * .035 + index) * .012;
      });
    }
    centerRing.quaternion.copy(camera.quaternion);
    orbitRing.quaternion.copy(camera.quaternion);
    selectedRing.quaternion.copy(camera.quaternion);
    orbitRing.rotateX(.72);
    orbitRing.rotateZ(-.45);
    renderer.clear();
    renderer.render(background, camera);
    renderer.clearDepth();
    renderer.render(scene, camera);
    updateLabels();
    if ((interaction || motion) && delta > 0 && delta < .075) {
      frameSamples.push(delta * 1000);
      sampleDuration += delta;
      if (sampleDuration >= 3) {
        frameSamples.sort((a, b) => a - b);
        const p95 = frameSamples[Math.floor(frameSamples.length * .95)];
        slowWindows = p95 > (quality === 'low' ? 40 : 27) ? slowWindows + 1 : 0;
        if (slowWindows >= 2 && time > cooldown && quality !== 'low') {
          applyQuality(quality === 'high' ? 'medium' : 'low');
          cooldown = time + 15000;
          slowWindows = 0;
        }
        frameSamples = []; sampleDuration = 0;
      }
    }
    if (!motion && !interaction && idleFrames > 12) stop();
  }

  function applyQuality(value: Quality) {
    quality = value;
    const tier = TIERS[value];
    starGeometry.setDrawRange(0, tier.stars);
    clouds.forEach(({ sprite }, index) => { sprite.visible = index < tier.clouds; });
    const dpr = Math.min(window.devicePixelRatio || 1, tier.dpr, Math.sqrt(tier.pixels / (width * height)));
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    starMaterial.uniforms.uDpr.value = dpr;
    container.dataset.quality = value;
    invalidate();
  }

  function resize() {
    width = Math.max(1, container.clientWidth);
    height = Math.max(1, container.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    lineMaterials.forEach(material => material.resolution.set(width, height));
    applyQuality(quality);
  }

  function updateNodes() {
    personIds.length = eventIds.length = 0;
    const visible = new Set(graph.nodes.map(node => node.id));
    for (const [id, label] of labels) if (!visible.has(id)) { label.remove(); labels.delete(id); }
    graph.nodes.forEach((node, index) => {
      if (index >= 50 || !positions[node.id]) return;
      const isCenter = node.id === graph.centerId;
      const selected = node.id === graph.selectedId;
      const context = graph.contextIds.includes(node.id);
      const color = new THREE.Color(selected ? '#f6d69a' : COLORS[node.group]);
      if (context) color.multiplyScalar(.32);
      const size = isCenter ? 1.85 : selected ? 1.25 : 1;
      const collection = node.kind === 'person' ? people : events;
      const ids = node.kind === 'person' ? personIds : eventIds;
      const nodeIndex = ids.length;
      ids.push(node.id);
      point.fromArray(positions[node.id]);
      quaternion.setFromEuler(new THREE.Euler(.25, .4, node.kind === 'event' ? .15 : 0));
      matrix.compose(point, quaternion, scale.setScalar(size));
      collection.setMatrixAt(nodeIndex, matrix);
      collection.setColorAt(nodeIndex, color);
      matrix.compose(point, new THREE.Quaternion(), scale.setScalar(isCenter ? 31 : selected ? 24 : 18));
      glows.setMatrixAt(index, matrix);
      glows.setColorAt(index, color);
      let label = labels.get(node.id);
      if (!label) {
        label = document.createElement('button');
        label.className = 'nebula-label';
        label.type = 'button';
        label.dataset.nodeId = node.id;
        const name = document.createElement('strong');
        name.textContent = node.name;
        const subtitle = document.createElement('small');
        label.append(name, subtitle);
        label.addEventListener('click', event => { event.stopPropagation(); if (active && !contextLost) options.onSelect(node.id); });
        label.addEventListener('pointerenter', () => { hoverId = node.id; invalidate(); });
        label.addEventListener('pointerleave', () => { hoverId = null; invalidate(); });
        labels.set(node.id, label);
        labelsLayer.append(label);
      }
      label.querySelector('small')!.textContent = context ? '上下文' : isCenter ? '当前探索中心' : node.kind === 'event' ? '历史事件' : node.role.slice(0, 9);
      label.dataset.selected = String(selected);
      label.dataset.center = String(isCenter);
      label.dataset.context = String(context);
      label.setAttribute('aria-label', `${node.name}，${node.kind === 'event' ? '事件' : '人物'}，查看详情`);
      label.setAttribute('aria-pressed', String(selected));
    });
    people.count = personIds.length;
    events.count = eventIds.length;
    glows.count = Math.min(graph.nodes.length, 50);
    for (const mesh of [people, events, glows]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    centerRing.visible = orbitRing.visible = Boolean(positions[graph.centerId]);
    if (centerRing.visible) { centerRing.position.fromArray(positions[graph.centerId]); orbitRing.position.copy(centerRing.position); }
    selectedRing.visible = Boolean(graph.selectedId && graph.selectedId !== graph.centerId && positions[graph.selectedId]);
    if (selectedRing.visible) selectedRing.position.fromArray(positions[graph.selectedId!]);
  }

  function updateEdges() {
    edgeGroup.clear();
    lineMaterials.splice(0).forEach(material => material.dispose());
    edgeGeometries.splice(0).forEach(geometry => geometry.dispose());
    const batches = new Map<string, { dashed: boolean; bright: boolean; coordinates: number[]; colors: number[] }>();
    edges = [];
    let arrowIndex = 0;
    for (const relation of graph.relations) {
      if (!positions[relation.source] || !positions[relation.target]) continue;
      const start = new THREE.Vector3().fromArray(positions[relation.source]);
      const end = new THREE.Vector3().fromArray(positions[relation.target]);
      const middle = start.clone().add(end).multiplyScalar(.5);
      const delta = end.clone().sub(start);
      const normal = new THREE.Vector3(-delta.y, delta.x, 5).normalize();
      const direction = (hash(relation.id) & 1) ? 1 : -1;
      middle.addScaledVector(normal, Math.min(delta.length() * .15, 12) * direction);
      middle.z += 4;
      const curve = new THREE.QuadraticBezierCurve3(start, middle, end);
      const points = curve.getPoints(20);
      edges.push({ relation, points });
      const bright = relation.id === graph.relationId || Boolean(graph.selectedId && (relation.source === graph.selectedId || relation.target === graph.selectedId));
      const dashed = relation.evidence === 'interpretation' || Boolean(relation.uncertain);
      const key = `${dashed}/${bright}`;
      let batch = batches.get(key);
      if (!batch) { batch = { dashed, bright, coordinates: [], colors: [] }; batches.set(key, batch); }
      const entity = graph.nodes.find(node => node.id === relation.source);
      const color = new THREE.Color(bright ? '#dec291' : entity ? COLORS[entity.group] : '#93a9cd');
      for (let index = 0; index < points.length - 1; index++) {
        batch.coordinates.push(...points[index].toArray(), ...points[index + 1].toArray());
        batch.colors.push(...color.toArray(), ...color.toArray());
      }
      if (arrowIndex < 300) {
        const tangent = curve.getTangent(.76).normalize();
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
        matrix.compose(curve.getPoint(.76), quaternion, scale.setScalar(bright ? 1.25 : 1));
        arrows.setMatrixAt(arrowIndex, matrix);
        arrows.setColorAt(arrowIndex, color);
        arrowIndex++;
      }
    }
    for (const batch of batches.values()) {
      const geometry = new LineSegmentsGeometry();
      geometry.setPositions(batch.coordinates);
      geometry.setColors(batch.colors);
      const material = new LineMaterial({ color: 0xffffff, vertexColors: true, linewidth: batch.bright ? 1.35 : .85, transparent: true, opacity: batch.bright ? .64 : .23, dashed: batch.dashed, dashSize: 2.2, gapSize: 1.7, worldUnits: false, depthWrite: false });
      material.resolution.set(width, height);
      const lines = new LineSegments2(geometry, material);
      lines.computeLineDistances();
      edgeGroup.add(lines);
      edgeGeometries.push(geometry);
      lineMaterials.push(material);
    }
    arrows.count = arrowIndex;
    arrows.instanceMatrix.needsUpdate = true;
    if (arrows.instanceColor) arrows.instanceColor.needsUpdate = true;
  }

  function fittedCamera() {
    const bounds = new THREE.Box3();
    Object.values(positions).forEach(position => bounds.expandByPoint(new THREE.Vector3().fromArray(position)));
    if (bounds.isEmpty()) bounds.setFromCenterAndSize(new THREE.Vector3(), new THREE.Vector3(100, 90, 25));
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov * .5));
    const distance = Math.max(130, ((size.y + 33) / 2) / tangent, ((size.x + 38) / 2) / (tangent * camera.aspect)) + size.z / 2;
    return { center, distance: distance * 1.07 };
  }

  function setDefaultCamera() {
    const fitted = fittedCamera();
    assignCamera(fitted.center.clone().add(new THREE.Vector3(0, 0, fitted.distance)), fitted.center);
    invalidate();
  }

  function fitCurrentDirection() {
    const bounds = new THREE.Box3();
    Object.values(positions).forEach(position => bounds.expandByPoint(new THREE.Vector3().fromArray(position)));
    if (bounds.isEmpty()) { setDefaultCamera(); return; }
    const center = bounds.getCenter(new THREE.Vector3());
    const direction = camera.position.clone().sub(controls.target).normalize();
    const inverseOrientation = camera.quaternion.clone().invert();
    const verticalTangent = Math.tan(THREE.MathUtils.degToRad(camera.fov * .5));
    const horizontalTangent = verticalTangent * camera.aspect;
    let distance = 100;
    // Measure every point in the existing camera's basis, allowing space for labels.
    for (const position of Object.values(positions)) {
      const relative = new THREE.Vector3().fromArray(position).sub(center).applyQuaternion(inverseOrientation);
      distance = Math.max(distance, (Math.abs(relative.y) + 18) / verticalTangent + relative.z, (Math.abs(relative.x) + 20) / horizontalTangent + relative.z);
    }
    distance *= 1.05;
    controls.maxDistance = Math.max(700, distance * 1.25);
    camera.far = Math.max(1800, controls.maxDistance * 2);
    camera.updateProjectionMatrix();
    assignCamera(center.clone().addScaledVector(direction, distance), center);
    invalidate();
  }

  function assignCamera(position: THREE.Vector3, target: THREE.Vector3) {
    applying = true;
    // Drain old gesture momentum before restoring an exact historical camera.
    const damping = controls.enableDamping;
    controls.enableDamping = false;
    controls.update();
    controls.maxDistance = Math.max(700, position.distanceTo(target) * 1.25);
    camera.far = Math.max(1800, controls.maxDistance * 2);
    camera.updateProjectionMatrix();
    controls.target.copy(target);
    camera.position.copy(position);
    controls.update();
    controls.enableDamping = damping;
    applying = false;
  }

  function getSnapshot(): SpatialSnapshot {
    return { positions: Object.fromEntries(Object.entries(positions).map(([id, position]) => [id, [...position] as Vec3])), camera: { position: camera.position.toArray() as Vec3, target: controls.target.toArray() as Vec3 } };
  }

  function pickNode(x: number, y: number): string | null {
    raycaster.setFromCamera(new THREE.Vector2(x / width * 2 - 1, 1 - y / height * 2), camera);
    const exact = raycaster.intersectObjects([people, events], false)[0];
    if (exact && exact.instanceId !== undefined) return (exact.object === people ? personIds : eventIds)[exact.instanceId];
    const candidates = projectedNodes.filter(node => node.x >= 0 && node.x <= width && node.y >= 0 && node.y <= height && Math.hypot(node.x - x, node.y - y) <= node.radius + (window.matchMedia('(pointer:coarse)').matches ? 9 : 2));
    candidates.sort((a, b) => a.z - b.z || Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
    return candidates[0]?.id ?? null;
  }

  function pickRelations(x: number, y: number): Array<{ id: string; distance: number }> {
    const distances = new Map<string, number>();
    for (const edge of edges) for (let index = 0; index < edge.points.length - 1; index++) {
      const a = edge.points[index].clone().project(camera);
      const b = edge.points[index + 1].clone().project(camera);
      if (a.z <= -1 || a.z >= 1 || b.z <= -1 || b.z >= 1) continue;
      const ax = (a.x + 1) * width / 2, ay = (1 - a.y) * height / 2;
      const bx = (b.x + 1) * width / 2, by = (1 - b.y) * height / 2;
      const dx = bx - ax, dy = by - ay;
      const t = THREE.MathUtils.clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
      const distance = Math.hypot(x - ax - dx * t, y - ay - dy * t);
      if (distance < 7 && distance < (distances.get(edge.relation.id) ?? Infinity)) distances.set(edge.relation.id, distance);
    }
    return [...distances].map(([id, distance]) => ({ id, distance })).sort((a, b) => a.distance - b.distance);
  }

  function showRelationChoices(candidates: Array<{ id: string; distance: number }>, x: number, y: number) {
    pickMenu.replaceChildren();
    const heading = document.createElement('p');
    heading.textContent = '此处有多条关系，请选择';
    pickMenu.append(heading);
    for (const candidate of candidates.slice(0, 5)) {
      const relation = graph.relations.find(item => item.id === candidate.id)!;
      const source = graph.nodes.find(node => node.id === relation.source)?.name ?? '';
      const target = graph.nodes.find(node => node.id === relation.target)?.name ?? '';
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${source} → ${target} · ${relation.label}`;
      button.addEventListener('click', event => { event.stopPropagation(); pickMenu.hidden = true; options.onRelation(relation.id); });
      pickMenu.append(button);
    }
    pickMenu.hidden = false;
    pickMenu.style.left = `${THREE.MathUtils.clamp(x, 8, Math.max(8, width - 251))}px`;
    pickMenu.style.top = `${THREE.MathUtils.clamp(y, 8, Math.max(8, height - pickMenu.offsetHeight - 8))}px`;
    pickMenu.querySelector('button')?.focus();
  }

  function localPointer(event: PointerEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  function pointerDown(event: PointerEvent) {
    pickMenu.hidden = true;
    pointerIds.add(event.pointerId);
    if (pointerIds.size > 1) multitouch = true;
    if (event.button !== 0) return;
    const { x, y } = localPointer(event);
    pointerStart = { x, y, time: performance.now(), id: event.pointerId };
  }
  function pointerUp(event: PointerEvent) {
    pointerIds.delete(event.pointerId);
    if (!active || contextLost) return;
    const { x, y } = localPointer(event);
    if (pointerStart && pointerStart.id === event.pointerId && !multitouch && Math.hypot(x - pointerStart.x, y - pointerStart.y) < 6 && performance.now() - pointerStart.time < 600) {
      const node = pickNode(x, y);
      if (node) options.onSelect(node);
      else {
        const candidates = pickRelations(x, y);
        if (candidates.length > 1 && candidates[1].distance - candidates[0].distance < 2) showRelationChoices(candidates, x, y);
        else if (candidates[0]) options.onRelation(candidates[0].id);
      }
    }
    pointerStart = null;
    if (pointerIds.size === 0) multitouch = false;
  }
  function pointerCancel(event: PointerEvent) { pointerIds.delete(event.pointerId); pointerStart = null; if (!pointerIds.size) multitouch = false; }
  function pointerMove(event: PointerEvent) {
    if (!active || contextLost || pointerIds.size) return;
    const { x, y } = localPointer(event);
    const node = pickNode(x, y);
    const relation = node ? null : pickRelations(x, y)[0]?.id ?? null;
    renderer.domElement.style.cursor = node || relation ? 'pointer' : 'grab';
    if (hoverId !== node) { hoverId = node; invalidate(); }
    edgeHint.hidden = !relation;
    if (relation) {
      const edge = graph.relations.find(item => item.id === relation)!;
      edgeHint.textContent = `${edge.label}${edge.evidence === 'interpretation' ? ' · 历史解释' : ' · 史料记载'}`;
      edgeHint.style.left = `${THREE.MathUtils.clamp(x, 90, width - 90)}px`;
      edgeHint.style.top = `${Math.max(45, y)}px`;
    }
  }
  function pointerLeave() { hoverId = null; edgeHint.hidden = true; invalidate(); }
  function controlChange() { invalidate(); if (!applying) options.onCameraChange?.(); }
  function controlStart() { interaction = true; edgeHint.hidden = true; invalidate(); }
  function controlEnd() { interaction = false; invalidate(); }
  function visibilityChange() { if (document.hidden) stop(); else invalidate(); }
  function reducedMotionChange() { motion = motionRequested && !reducedMotion.matches; invalidate(); }
  function lost(event: Event) { event.preventDefault(); contextLost = true; controls.enabled = false; stop(); options.onError('3D 图形上下文已中断，探索记录已保留。请使用列表继续浏览，或重试 3D。'); }
  function restored() { contextLost = false; controls.enabled = active; applyQuality(quality === 'high' ? 'medium' : 'low'); invalidate(); options.onReady?.(); }

  renderer.debug.onShaderError = () => {
    if (shaderFailed || disposed) return;
    shaderFailed = true;
    stop();
    options.onError('当前设备无法编译 3D 效果，已保留探索记录。可使用列表继续浏览。');
  };

  function removeListeners() {
    document.removeEventListener('visibilitychange', visibilityChange);
    reducedMotion.removeEventListener('change', reducedMotionChange);
    renderer.domElement.removeEventListener('webglcontextlost', lost);
    renderer.domElement.removeEventListener('webglcontextrestored', restored);
    renderer.domElement.removeEventListener('pointerdown', pointerDown);
    renderer.domElement.removeEventListener('pointerup', pointerUp);
    renderer.domElement.removeEventListener('pointercancel', pointerCancel);
    renderer.domElement.removeEventListener('pointermove', pointerMove);
    renderer.domElement.removeEventListener('pointerleave', pointerLeave);
    controls.removeEventListener('change', controlChange);
    controls.removeEventListener('start', controlStart);
    controls.removeEventListener('end', controlEnd);
  }

  initializationCleanup.push(removeListeners);
  controls.addEventListener('change', controlChange);
  controls.addEventListener('start', controlStart);
  controls.addEventListener('end', controlEnd);
  renderer.domElement.addEventListener('pointerdown', pointerDown);
  renderer.domElement.addEventListener('pointerup', pointerUp);
  renderer.domElement.addEventListener('pointercancel', pointerCancel);
  renderer.domElement.addEventListener('pointermove', pointerMove);
  renderer.domElement.addEventListener('pointerleave', pointerLeave);
  renderer.domElement.addEventListener('webglcontextlost', lost);
  renderer.domElement.addEventListener('webglcontextrestored', restored);
  document.addEventListener('visibilitychange', visibilityChange);
  reducedMotion.addEventListener('change', reducedMotionChange);
  const observer = new ResizeObserver(resize);
  initializationCleanup.push(() => observer.disconnect());
  observer.observe(container);
  resize();
  queueMicrotask(() => { if (!disposed) options.onReady?.(); });
  initializationCleanup.length = 0;

  return {
    setGraph(view, spatial) {
      if (disposed) return;
      edgeHint.hidden = pickMenu.hidden = true;
      const changedCenter = graph.centerId !== view.centerId;
      graph = view;
      const previous = spatial ? spatial.positions : changedCenter ? {} : positions;
      positions = createLayout(view.nodes, view.centerId, previous);
      // Restores use the actual stored positions, including a panned center.
      if (spatial) for (const node of view.nodes) if (validVector(spatial.positions[node.id])) positions[node.id] = [...spatial.positions[node.id]];
      updateNodes();
      updateEdges();
      if (spatial && validVector(spatial.camera.position) && validVector(spatial.camera.target) && new THREE.Vector3().fromArray(spatial.camera.position).distanceTo(new THREE.Vector3().fromArray(spatial.camera.target)) >= controls.minDistance) {
        assignCamera(new THREE.Vector3().fromArray(spatial.camera.position), new THREE.Vector3().fromArray(spatial.camera.target));
      } else if (changedCenter) setDefaultCamera();
      invalidate();
    },
    getSnapshot,
    fit() { fitCurrentDirection(); options.onCameraChange?.(); },
    resetCamera() { setDefaultCamera(); options.onCameraChange?.(); },
    zoom(factor) {
      if (!Number.isFinite(factor) || factor <= 0) return;
      const direction = camera.position.clone().sub(controls.target);
      direction.setLength(THREE.MathUtils.clamp(direction.length() * factor, controls.minDistance, controls.maxDistance));
      camera.position.copy(controls.target).add(direction);
      applying = true;
      controls.update();
      applying = false;
      options.onCameraChange?.();
      invalidate();
    },
    focus(id) {
      if (!positions[id]) return;
      const direction = camera.position.clone().sub(controls.target);
      controls.target.fromArray(positions[id]);
      camera.position.copy(controls.target).add(direction);
      controls.update(); invalidate();
    },
    setQuality(value) { applyQuality(value); },
    setMotion(enabled) { motionRequested = enabled; motion = enabled && !reducedMotion.matches; invalidate(); },
    setRotateMode(enabled) { controls.touches.ONE = enabled ? THREE.TOUCH.ROTATE : THREE.TOUCH.PAN; },
    setActive(value) { active = value; controls.enabled = value && !contextLost; labelsLayer.style.pointerEvents = value ? '' : 'none'; if (!value) { stop(); edgeHint.hidden = true; labelsLayer.style.visibility = 'hidden'; } else { labelsLayer.style.visibility = ''; invalidate(); } },
    dispose() {
      if (disposed) return;
      disposed = true;
      stop(); observer.disconnect();
      removeListeners();
      controls.dispose();
      lineMaterials.forEach(material => material.dispose());
      edgeGeometries.forEach(geometry => geometry.dispose());
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      textures.forEach(texture => texture.dispose());
      people.dispose(); events.dispose(); glows.dispose(); arrows.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove(); labelsLayer.remove(); style.remove();
      labels.clear(); scene.clear(); background.clear();
      delete container.dataset.quality;
    },
  };
  } catch (error) {
    // Initialization can fail after DOM insertion or texture allocation. Release
    // only resources acquired by this attempt before allowing the UI to retry.
    for (const cleanup of initializationCleanup.reverse()) {
      try { cleanup(); } catch { /* Continue releasing the remaining resources. */ }
    }
    throw error;
  }
}
