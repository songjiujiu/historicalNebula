import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';

type Gltf = {
  buffers: { byteLength: number; uri?: string }[];
  bufferViews: { byteOffset?: number; byteLength: number; byteStride?: number }[];
  accessors: { bufferView: number; byteOffset?: number; componentType: number; count: number; type: string; min?: number[]; max?: number[] }[];
  nodes: { name: string; mesh?: number; children?: number[] }[];
  meshes: { primitives: { attributes: { POSITION: number }; material: number; targets?: { POSITION: number }[] }[] }[];
  materials: { pbrMetallicRoughness?: { baseColorTexture?: { index: number } } }[];
  textures: { source: number }[];
  images: { name: string; bufferView: number; mimeType: string; uri?: string }[];
  animations: { name: string; channels: { sampler: number; target: { node: number; path: string } }[];
    samplers: { input: number; output: number; interpolation: string }[] }[];
};

function loadBook(id: string) {
  const file = readFileSync(`public/site/models/opening/${id}.glb`);
  expect(file.toString('ascii', 0, 4)).toBe('glTF');
  expect(file.readUInt32LE(8)).toBe(file.length);
  const jsonLength = file.readUInt32LE(12);
  const json = JSON.parse(file.toString('utf8', 20, 20 + jsonLength)) as Gltf;
  const binOffset = 20 + jsonLength + 8;
  function accessor(index: number) {
    const attribute = json.accessors[index], view = json.bufferViews[attribute.bufferView];
    expect(attribute.componentType).toBe(5126);
    const width = ({ SCALAR: 1, VEC3: 3, VEC4: 4 } as Record<string, number>)[attribute.type];
    expect(width).toBeDefined();
    const stride = view.byteStride ?? width! * 4;
    const offset = binOffset + (view.byteOffset ?? 0) + (attribute.byteOffset ?? 0);
    return Array.from({ length: attribute.count }, (_, row) => Array.from({ length: width! }, (_, col) =>
      file.readFloatLE(offset + row * stride + col * 4)));
  }
  return { file, json, binOffset, accessor };
}

const books = ['shiji', 'hanshu', 'sanguozhi', 'jiutangshu', 'qingshigao'];

it.each(books)('exports %s with a thick bound cover, actual printed faces and a finite opening animation', id => {
  const { file, json, binOffset, accessor } = loadBook(id);
  expect(json.buffers).toHaveLength(1);
  expect(json.buffers[0].uri).toBeUndefined();
  expect(file.length - binOffset - json.buffers[0].byteLength).toBeGreaterThanOrEqual(0);
  expect(file.length - binOffset - json.buffers[0].byteLength).toBeLessThan(4);
  for (const image of json.images) {
    expect(image.uri).toBeUndefined();
    expect(json.bufferViews[image.bufferView].byteLength).toBeGreaterThan(1000);
  }
  for (const page of [0, 1]) expect(json.images.some(image => image.name === `${id}-page-${page}`)).toBe(true);
  const cover = json.nodes.find(node => node.name === 'Front cloth board')!;
  expect(cover.mesh).toBeDefined();
  const coverPoints = accessor(json.meshes[cover.mesh!].primitives[0].attributes.POSITION);
  for (let axis = 0; axis < 3; axis++) {
    const positions = coverPoints.map(point => point[axis]);
    expect(Math.max(...positions) - Math.min(...positions)).toBeGreaterThan(.005);
  }
  const animation = json.animations.find(clip => clip.name === 'BookOpen')!;
  expect(animation).toBeDefined();
  const rotating = animation.channels.filter(channel => channel.target.path === 'rotation');
  expect(rotating.some(channel => json.nodes[channel.target.node].name === 'Front cover hinge')).toBe(true);
  expect(rotating.filter(channel => json.nodes[channel.target.node].name.startsWith('Turning printed leaf'))).toHaveLength(4);
  for (const channel of rotating) {
    const sampler = animation.samplers[channel.sampler];
    const time = accessor(sampler.input).flat();
    expect(time.at(-1)! - time[0]).toBeGreaterThan(1);
    expect(time.at(-1)! - time[0]).toBeLessThan(4);
    expect(time.every((value, index) => index === 0 || value > time[index - 1])).toBe(true);
    const rotation = accessor(sampler.output);
    expect(rotation).toHaveLength(time.length);
    const first = rotation[0], last = rotation.at(-1)!;
    const dot = Math.abs(first.reduce((sum, value, axis) => sum + value * last[axis], 0));
    // The book must reach a spread, rather than leave a page standing in front of its text.
    expect(2 * Math.acos(Math.min(1, dot)) * 180 / Math.PI).toBeGreaterThan(170);
    expect(last.reduce((sum, value) => sum + value * value, 0)).toBeCloseTo(1, 5);
  }
  for (const channel of animation.channels.filter(channel => channel.target.path === 'weights')) {
    const leaf = json.nodes[channel.target.node], mesh = json.meshes[leaf.mesh!];
    const texturedImages = new Set(mesh.primitives.flatMap(primitive => {
      const texture = json.materials[primitive.material].pbrMetallicRoughness?.baseColorTexture;
      return texture ? [json.textures[texture.index].source] : [];
    }));
    expect(texturedImages.size).toBeGreaterThanOrEqual(2);
    expect(mesh.primitives.some(primitive => primitive.targets?.length)).toBe(true);
    const weights = accessor(animation.samplers[channel.sampler].output).flat();
    // Intermediate curl keyframes must survive export and then flatten back down.
    expect(Math.max(...weights)).toBeGreaterThan(.2);
    expect(weights[0]).toBeCloseTo(0, 5);
    expect(weights.at(-1)).toBeCloseTo(0, 5);
  }
  expect(animation.channels.filter(channel => channel.target.path === 'weights')).toHaveLength(4);
});

it('embeds different reading text for each selected book rather than reusing one generic page', () => {
  const pages = books.map(id => {
    const { file, json, binOffset } = loadBook(id);
    const image = json.images.find(candidate => candidate.name === `${id}-page-0`)!;
    const view = json.bufferViews[image.bufferView], start = binOffset + (view.byteOffset ?? 0);
    return createHash('sha256').update(file.subarray(start, start + view.byteLength)).digest('hex');
  });
  expect(new Set(pages).size).toBe(books.length);
});
