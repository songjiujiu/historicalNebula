import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const corpusPath = /^(?:shiji\/(?:[0-9]{3}|search|manifest)|histories\/[a-z0-9-]+\/(?:[0-9]{3}|search)|modern\/(?:manifest|chapters\/[a-z0-9-]+|documents\/[a-z0-9-]+|qingshigao\/(?:[1-9][0-9]{0,2}|manifest|search)))\.json$/;
const corpusDirectory = /^(?:shiji|histories(?:\/[a-z0-9-]+)?|modern(?:\/(?:chapters|documents|qingshigao))?)$/;
const documents = [
  'LICENSE',
  'README.md',
  'CHANGELOG.md',
  'THIRD_PARTY_NOTICES.md',
  'docs/licensing.md',
  'docs/demo.md',
  'data/shiji/README.md',
  'data/dynastic-histories/README.md',
  'data/modern-history/README.md',
  'data/shiji-graph/README.md',
  'assets/blender/README.md',
];
const dependencyNotices = [
  ['node_modules/opencc-js/LICENSE', 'licenses/opencc-js/LICENSE'],
  ['node_modules/opencc-js/LICENSES/Apache-2.0.txt', 'licenses/opencc-js/LICENSES/Apache-2.0.txt'],
  ['node_modules/opencc-js/THIRD_PARTY_LICENSES.md', 'licenses/opencc-js/THIRD_PARTY_LICENSES.md'],
  ['node_modules/three/LICENSE', 'licenses/three/LICENSE'],
];

function inside(root, path) {
  const suffix = relative(resolve(root), resolve(path));
  if (!suffix || suffix === '..' || suffix.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(suffix)) {
    throw new Error('Demo output must be a directory inside the project.');
  }
}

async function regularFile(path) {
  if (!(await lstat(path)).isFile()) throw new Error(`Expected a regular file: ${path}`);
  return readFile(path);
}

// Bound memory while avoiding thousands of serial disk operations on Windows.
async function eachFile(items, visit) {
  let next = 0;
  let failure;
  await Promise.all(Array.from({ length: Math.min(items.length, 8) }, async () => {
    while (!failure && next < items.length) {
      const item = items[next++];
      try { await visit(item); } catch (error) { failure = error; }
    }
  }));
  if (failure) throw failure;
}

function validateJson(body, path) {
  let data;
  try { data = JSON.parse(body.toString('utf8')); }
  catch { throw new Error(`Invalid corpus JSON: ${path}`); }
  if (!data || typeof data !== 'object') throw new Error(`Invalid corpus document: ${path}`);
  if (path.endsWith('/search.json') && !Array.isArray(data)) {
    throw new Error(`Invalid search index: ${path}`);
  }
  const volume = path.match(/^(?:shiji|histories\/[a-z0-9-]+)\/([0-9]{3})\.json$/);
  const text = path.match(/^modern\/(?:chapters|documents|qingshigao)\/([^/]+)\.json$/);
  if (volume && (data.volume !== Number(volume[1]) || !Array.isArray(data.blocks))) {
    throw new Error(`Invalid chapter: ${path}`);
  }
  if (text && !['manifest', 'search'].includes(text[1]) && (data.id !== text[1] || !Array.isArray(data.blocks))) {
    throw new Error(`Invalid text document: ${path}`);
  }
}

/** Package only browser-readable snapshots and explicitly named public notices. */
export async function packageDemo(root, output, { minimumDocuments = 3800 } = {}) {
  inside(root, output);
  const source = join(root, 'public', 'data');
  if (!(await lstat(source)).isDirectory()) throw new Error('Missing regular corpus directory.');
  const files = [];
  async function collect(folder = '') {
    for (const entry of await readdir(join(source, folder), { withFileTypes: true })) {
      const path = folder ? `${folder}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) throw new Error(`Symbolic links are not allowed in demo data: ${path}`);
      if (entry.isDirectory() && corpusDirectory.test(path)) await collect(path);
      else if (entry.isFile() && (corpusPath.test(path) || path === 'shiji/NOTICE.md')) files.push(path);
    }
  }
  await collect();
  files.sort();
  const jsonCount = files.filter(path => path.endsWith('.json')).length;
  if (jsonCount < minimumDocuments) throw new Error(`Incomplete corpus: ${jsonCount} documents; expected at least ${minimumDocuments}.`);

  // Validate the full payload and required notices before writing any corpus file.
  await eachFile(files, async path => {
    const body = await regularFile(join(source, path));
    if (path.endsWith('.json')) validateJson(body, path);
  });
  await regularFile(join(source, 'shiji/NOTICE.md'));
  for (const path of documents) await regularFile(join(root, path));
  for (const [path] of dependencyNotices) await regularFile(join(root, path));

  const entries = [];
  async function copy(path, destination) {
    const body = await regularFile(path);
    const target = join(output, destination);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, body);
    entries.push({ path: destination, bytes: body.length, sha256: createHash('sha256').update(body).digest('hex') });
  }
  await eachFile(files, path => copy(join(source, path), `data/${path}`));
  for (const path of documents) await copy(join(root, path), path);
  for (const [path, destination] of dependencyNotices) await copy(join(root, path), destination);
  // Preserve the source-tree link used by THIRD_PARTY_NOTICES.md without copying
  // a second corpus or the source snapshots into the public artifact.
  await copy(join(source, 'shiji/NOTICE.md'), 'public/data/shiji/NOTICE.md');
  const manifest = {
    format: 1,
    corpusDocuments: jsonCount,
    bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
    files: entries.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0),
  };
  await writeFile(join(output, 'demo-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(join(output, '.nojekyll'), '');
  return manifest;
}

function run(script, args) {
  const result = spawnSync(process.execPath, [join(projectRoot, script), ...args], { cwd: projectRoot, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Demo build failed: ${script} (exit ${result.status ?? result.signal}).`);
}

async function main() {
  run('node_modules/typescript/bin/tsc', ['--noEmit']);
  run('node_modules/vite/bin/vite.js', ['build', '--mode', 'demo']);
  const manifest = await packageDemo(projectRoot, join(projectRoot, 'dist-demo'));
  console.log(`Static demo: ${manifest.corpusDocuments} JSON documents, ${(manifest.bytes / 1024 / 1024).toFixed(1)} MiB of corpus and notices. No backend or source download is required.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
