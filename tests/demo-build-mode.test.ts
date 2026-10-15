import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import config from '../vite.config';
import { corpusApiUrl } from '../src/domain/corpus-api';

const { packageDemo } = await import(new URL('../scripts/build-demo.mjs', import.meta.url).href) as {
  packageDemo(root: string, output: string, options: { minimumDocuments: number }): Promise<{
    corpusDocuments: number;
    files: { path: string; sha256: string; bytes: number }[];
  }>;
};

afterEach(() => vi.unstubAllEnvs());

describe('independent static demo', () => {
  it('keeps the production API while serving demo content under its own base path', () => {
    vi.stubEnv('BASE_URL', '/historicalNebula/');
    vi.stubEnv('MODE', 'production');
    expect(corpusApiUrl('shiji/001.json')).toBe('/historicalNebula/api/v1/data/shiji/001.json');
    vi.stubEnv('MODE', 'demo');
    expect(corpusApiUrl('histories/hanshu/search.json')).toBe('/historicalNebula/data/histories/hanshu/search.json');
    vi.stubEnv('BASE_URL', '/');
    expect(corpusApiUrl('modern/chapters/qing-founded.json')).toBe('/data/modern/chapters/qing-founded.json');
  });

  it('builds and previews a demo without an API proxy and accepts a root deployment', async () => {
    vi.stubEnv('HISTORICAL_DEMO_BASE', '');
    const demo = await config({ command: 'build', mode: 'demo' });
    expect(demo.base).toBe('/historicalNebula/');
    expect(demo.build?.outDir).toBe('dist-demo');
    expect(demo.publicDir).toBe('public/site');
    expect(demo.server?.proxy).toBeUndefined();
    expect(demo.preview?.proxy).toBeUndefined();
    vi.stubEnv('HISTORICAL_DEMO_BASE', '/');
    expect((await config({ command: 'build', mode: 'demo' })).base).toBe('/');
    vi.stubEnv('HISTORICAL_DEMO_BASE', 'https://external.example/');
    expect(() => config({ command: 'build', mode: 'demo' })).toThrow('HISTORICAL_DEMO_BASE');
  });

  it('packages public content and notices with hashes, excludes private inputs, and refuses broken snapshots', async () => {
    const root = await mkdtemp(join(tmpdir(), 'historical-nebula-demo-'));
    const output = join(root, 'dist-demo');
    const write = async (path: string, body: string) => {
      const parts = path.split('/');
      await mkdir(join(root, ...parts.slice(0, -1)), { recursive: true });
      await writeFile(join(root, ...parts), body);
    };
    try {
      for (const path of [
        'LICENSE', 'README.md', 'CHANGELOG.md', 'THIRD_PARTY_NOTICES.md',
        'docs/licensing.md', 'docs/demo.md', 'data/shiji/README.md',
        'data/dynastic-histories/README.md', 'data/modern-history/README.md', 'data/shiji-graph/README.md',
        'assets/blender/README.md', 'node_modules/opencc-js/LICENSE',
        'node_modules/opencc-js/LICENSES/Apache-2.0.txt', 'node_modules/opencc-js/THIRD_PARTY_LICENSES.md',
        'node_modules/three/LICENSE',
      ]) await write(path, `Public notice: ${path}\n`);
      await write('public/data/shiji/001.json', '{"volume":1,"blocks":[]}\n');
      await write('public/data/shiji/NOTICE.md', 'Corpus notice\n');
      await write('public/data/.env', 'private fixture');
      await write('public/data/source/snapshot.epub', 'excluded source fixture');
      await write('public/data/credentials.json', '{"private":true}');
      await write('deploy/private.txt', 'excluded deployment fixture');
      const manifest = await packageDemo(root, output, { minimumDocuments: 1 });
      expect(manifest.corpusDocuments).toBe(1);
      expect(await readFile(join(output, 'data/shiji/001.json'), 'utf8')).toBe('{"volume":1,"blocks":[]}\n');
      expect((await readdir(join(output, 'data/shiji'))).sort()).toEqual(['001.json', 'NOTICE.md', 'README.md']);
      expect(manifest.files.some(file => /env|source\/|credentials|deploy\//.test(file.path))).toBe(false);
      expect(await readFile(join(output, 'licenses/opencc-js/LICENSES/Apache-2.0.txt'), 'utf8')).toContain('Public notice:');
      expect(manifest.files.every(file => /^[a-f0-9]{64}$/.test(file.sha256))).toBe(true);
      expect(JSON.parse(await readFile(join(output, 'demo-manifest.json'), 'utf8'))).toEqual(manifest);
      await expect(packageDemo(root, join(root, 'incomplete'), { minimumDocuments: 2 })).rejects.toThrow('Incomplete corpus');
      await write('public/data/shiji/001.json', '{broken');
      await expect(packageDemo(root, join(root, 'broken'), { minimumDocuments: 1 })).rejects.toThrow('Invalid corpus JSON');
      await expect(readdir(join(root, 'broken'))).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      // mkdtemp created this exact task-owned directory beneath the OS temp directory.
      await rm(root, { recursive: true, force: true });
    }
  });
});
