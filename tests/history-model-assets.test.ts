import { readFileSync, existsSync } from 'node:fs';
import { expect, it } from 'vitest';

it('ships self-contained Blender models, named book bodies, cameras and fallback posters', () => {
  for (const name of ['history-scroll','history-books']) {
    const glb = readFileSync(`public/site/models/history/${name}.glb`);
    expect(glb.toString('ascii',0,4)).toBe('glTF');
    expect(glb.readUInt32LE(8)).toBe(glb.length);
    const json=JSON.parse(glb.toString('utf8',20,20+glb.readUInt32LE(12)));
    expect(json.cameras[0].type).toBe('orthographic');
    const camera=json.cameras[0].orthographic;
    expect(camera.xmag/camera.ymag).toBeCloseTo(name==='history-books' ? 1026/334 : 1256/364,2);
    expect(json.meshes.length).toBeGreaterThan(0);
    expect(json.images.every((image: {bufferView?: number; uri?: string}) => image.bufferView !== undefined && !image.uri)).toBe(true);
    if (name==='history-scroll') {
      // Alpha must survive Blender export, otherwise erased concept labels and
      // the surrounding rectangle reappear after WebGL replaces the poster.
      expect(json.materials[0].alphaMode).toBe('BLEND');
      expect(json.materials[0].extensions).toHaveProperty('KHR_materials_unlit');
    }
    if (name==='history-books') for (const book of ['shiji','hanshu','sanguozhi','jiutangshu','qingshigao']) {
      expect(json.nodes.some((node: {name: string}) => node.name === `book-${book}`)).toBe(true);
    }
    expect(existsSync(`public/site/models/history/${name}-poster.png`)).toBe(true);
    const blend = readFileSync(`assets/blender/${name}.blend`);
    expect(blend.length).toBeGreaterThan(10000);
    expect(blend.subarray(0,7).toString() === 'BLENDER' || blend.subarray(0,4).toString('hex') === '28b52ffd').toBe(true);
  }
});
