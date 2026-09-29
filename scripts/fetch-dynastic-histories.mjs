import { readFile, mkdir, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// Fixed OSF release metadata is kept in the repository. This command only fetches
// the 23 original-language histories added after the existing Shiji edition.
const run = promisify(execFile);
const sources = JSON.parse(await readFile('data/dynastic-histories/sources.json', 'utf8'));
const output = 'data/dynastic-histories/source';
await mkdir(output, { recursive: true });
let cursor = 0;
let completed = 0;
async function worker() {
  while (cursor < sources.length) {
    const source = sources[cursor++];
    const target = `${output}/${source.file}`;
    try {
      if ((await stat(target)).size === source.bytes) { completed++; continue; }
    } catch { /* Download missing file. */ }
    if (!/^https:\/\/osf\.io\/download\/[a-z0-9]+\/$/.test(source.url)) throw new Error(`Unexpected source URL for ${source.id}`);
    await run('curl.exe', ['-f', '-sS', '-L', '--retry', '3', '--max-time', '180', source.url, '-o', target], { maxBuffer: 1024 * 1024 });
    const size = (await stat(target)).size;
    if (size !== source.bytes) throw new Error(`${source.id}: expected ${source.bytes} bytes, got ${size}`);
    completed++;
    console.log(`${completed}/${sources.length} ${source.id}: ${size} bytes`);
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
console.log(`Downloaded and checked ${completed} histories.`);
