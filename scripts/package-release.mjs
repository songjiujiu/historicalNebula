import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync, zipSync } from 'fflate';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'artifacts/release');
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
  throw new Error('Release packages require a stable x.y.z package.json version.');
}
const tag = process.env.RELEASE_TAG || '';
if (tag && tag !== `v${version}`) {
  throw new Error(`Release tag ${tag} does not match package.json v${version}.`);
}
const revision = process.env.GITHUB_SHA || process.env.RELEASE_REVISION || 'local-build';
if (revision !== 'local-build' && !/^[a-f0-9]{40,64}$/i.test(revision)) {
  throw new Error('RELEASE_REVISION must be a full commit hash.');
}
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const encode = (value) => Buffer.from(value, 'utf8');
const fixedDate = new Date(2000, 0, 1);

function checkPath(name) {
  if (name.includes('\\') || name.startsWith('/') || name.split('/').some((part) => !part || part.startsWith('.'))) {
    throw new Error(`Unsafe release path: ${name}`);
  }
  if (/(^|\/)(node_modules|__pycache__|data|databases?|secrets?|credentials?)(\/|$)/i.test(name)
      || /\.(env|sql|sqlite3?|db|pem|key|p12|pfx|pyc)$/i.test(name)) {
    throw new Error(`Private, database or corpus files cannot enter release archives: ${name}`);
  }
}

async function safeStat(relative) {
  // Check every ancestor so an allowlisted file cannot escape via a symlink.
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    const info = await lstat(current);
    if (info.isSymbolicLink()) throw new Error(`Symlinks cannot enter release archives: ${relative}`);
  }
  return lstat(current);
}

async function addFile(files, source, destination = source) {
  checkPath(destination);
  const info = await safeStat(source);
  if (!info.isFile()) throw new Error(`Expected a regular file: ${source}`);
  if (Object.hasOwn(files, destination)) throw new Error(`Duplicate release path: ${destination}`);
  files[destination] = await readFile(path.join(root, source));
}

async function addTree(files, source, destination) {
  const info = await safeStat(source);
  if (!info.isDirectory()) throw new Error(`Expected a directory: ${source}`);
  for (const entry of (await readdir(path.join(root, source), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const nextSource = `${source}/${entry.name}`;
    const nextDestination = destination ? `${destination}/${entry.name}` : entry.name;
    checkPath(nextDestination);
    if (entry.isDirectory()) await addTree(files, nextSource, nextDestination);
    else await addFile(files, nextSource, nextDestination);
  }
}

async function addNotices(files) {
  for (const name of ['LICENSE', 'THIRD_PARTY_NOTICES.md', 'docs/licensing.md']) {
    await addFile(files, name);
  }
  for (const name of ['shiji', 'shiji-graph', 'dynastic-histories', 'modern-history']) {
    await addFile(files, `data/${name}/README.md`, `docs/sources/${name}.md`);
  }
}

async function archive(kind, files) {
  files['release.json'] = encode(`${JSON.stringify({
    name: pkg.name,
    version,
    revision,
    package: kind,
    corpusIncluded: false,
    databaseIncluded: false,
    runtime: kind === 'frontend' ? 'Static assets; same-origin Flask API required for reading bodies.' : 'Python 3.12+, Flask and MySQL; import reviewed corpus separately.',
  }, null, 2)}\n`);
  const names = Object.keys(files).sort();
  files.SHA256SUMS = encode(names.map((name) => `${sha256(files[name])}  ${name}\n`).join(''));
  const zipFiles = Object.fromEntries(Object.keys(files).sort().map((name) => [name, [files[name], { mtime: fixedDate }]]));
  const bytes = zipSync(zipFiles, { level: 6 });
  // Inspect the final ZIP bytes, rather than trusting only the input inventory.
  const unpacked = unzipSync(bytes);
  if (Object.keys(unpacked).length !== Object.keys(files).length) throw new Error('ZIP inventory mismatch.');
  for (const [name, expected] of Object.entries(files)) {
    checkPath(name);
    if (!unpacked[name] || sha256(unpacked[name]) !== sha256(expected)) throw new Error(`ZIP content mismatch: ${name}`);
  }
  const filename = `historical-nebula-${version}-${kind}.zip`;
  await writeFile(path.join(output, filename), bytes);
  console.log(`${filename}: ${Object.keys(files).length} files, ${bytes.length} bytes; license and checksums verified`);
  return `${sha256(bytes)}  ${filename}\n`;
}

const frontend = {};
await addTree(frontend, 'dist', '');
if (!frontend['index.html']) throw new Error('dist/index.html is missing; run npm run build first.');
await addNotices(frontend);
await addFile(frontend, 'docs/releasing.md');
await addFile(frontend, 'node_modules/opencc-js/LICENSE', 'licenses/opencc-js/LICENSE');
await addFile(frontend, 'node_modules/opencc-js/THIRD_PARTY_LICENSES.md', 'licenses/opencc-js/THIRD_PARTY_LICENSES.md');
await addTree(frontend, 'node_modules/opencc-js/LICENSES', 'licenses/opencc-js/LICENSES');
await addFile(frontend, 'node_modules/three/LICENSE', 'licenses/three/LICENSE');

const backend = {};
for (const name of ['__init__.py', 'app.py', 'corpus.py', 'import_corpus.py', 'requirements.txt']) {
  await addFile(backend, `backend/${name}`);
}
await addNotices(backend);
await addFile(backend, 'docs/releasing.md');
await addFile(backend, 'deploy/README.md', 'docs/deployment.md');

// Repeated local builds may replace this version's own outputs, never silently
// upload old-version ZIPs or follow an output directory symlink.
for (const relative of ['artifacts', 'artifacts/release']) {
  try {
    const info = await safeStat(relative);
    if (!info.isDirectory()) throw new Error(`Expected an output directory: ${relative}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await mkdir(path.join(root, relative));
  }
}
const expectedOutputs = new Set([
  `historical-nebula-${version}-frontend.zip`,
  `historical-nebula-${version}-backend.zip`,
  'SHA256SUMS', 'RELEASE_NOTES.md',
]);
for (const name of await readdir(output)) {
  if (!expectedOutputs.has(name)) throw new Error(`Unexpected existing release output: ${name}; use a clean artifacts/release directory.`);
  const info = await safeStat(`artifacts/release/${name}`);
  if (!info.isFile()) throw new Error(`Expected a regular release output file: ${name}`);
}
const sums = await archive('frontend', frontend) + await archive('backend', backend);
await writeFile(path.join(output, 'SHA256SUMS'), sums);

// Release notes describe exactly these packages; the maintained changelog is linked.
const sourceUrl = `https://github.com/songjiujiu/historicalNebula/tree/v${version}`;
const notes = `# Historical Nebula v${version}\n\n`
  + (version === '0.1.0' ? 'First published GitHub release of Historical Nebula. This early 0.x release does not promise a stable API.\n\n' : '')
  + `- [Changes](${sourceUrl}/CHANGELOG.md)\n`
  + `- [Deployment and release instructions](${sourceUrl}/docs/releasing.md)\n`
  + `- [License scope and source attributions](${sourceUrl}/docs/licensing.md)\n\n`
  + 'The frontend ZIP contains built web assets. Reading bodies and search indexes require the same-origin Flask/MySQL API. The backend ZIP contains Python source and dependency requirements; install dependencies separately. Neither ZIP includes a database, corpus JSON, environment files, secrets or a standalone offline reader.\n\n'
  + 'Both packages include the project license, third-party notices, source attribution documents and internal SHA-256 manifests. Download SHA256SUMS to verify the ZIP files. Corpus snapshots in the GitHub source archive retain their separate licenses and attribution requirements.\n\n'
  + `Source revision: \`${revision}\`.\n`;
await writeFile(path.join(output, 'RELEASE_NOTES.md'), notes);
console.log('Release artifacts are in artifacts/release/. No deployment or publishing was performed.');
