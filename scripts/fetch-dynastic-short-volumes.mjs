import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { unzipSync } from 'fflate';

const run = promisify(execFile);
const targets = [
  ...[84, 215, ...Array.from({ length: 12 }, (_, i) => 230 + i)].map(volume => ({ id: 'songshi', volume, page: `宋史/卷${String(volume).padStart(3, '0')}` })),
  ...[11, 86, 122].map(volume => ({ id: 'jiuwudaishi', volume, page: `舊五代史_(四庫全書本)/卷${String(volume).padStart(3, '0')}` })),
  { id: 'mingshi', volume: 39, page: '明史/卷39' },
];
await mkdir('data/dynastic-histories/supplements', { recursive: true });
let cursor = 0;
async function worker() {
  while (cursor < targets.length) {
    const { id, volume, page } = targets[cursor++];
    const file = `data/dynastic-histories/supplements/${id}-${String(volume).padStart(3, '0')}.epub`;
    let bytes;
    try { bytes = await readFile(file); } catch { /* Download below. */ }
    if (!bytes) {
      const url = new URL('https://ws-export.wmcloud.org/');
      url.searchParams.set('format', 'epub'); url.searchParams.set('lang', 'zh'); url.searchParams.set('page', page);
      await run('curl.exe', ['-f', '-sS', '-L', '--retry', '2', '--retry-all-errors', '--max-time', '90', url.toString(), '-o', file]);
      bytes = await readFile(file);
    }
    const entries = unzipSync(bytes);
    const pageText = Object.entries(entries).filter(([name]) => /\.xhtml$/.test(name)).map(([, data]) => Buffer.from(data).toString('utf8')).join('');
    if (!pageText.includes('卷') || pageText.length < 2000) throw new Error(`Unexpected export ${id}/${volume}`);
    console.log(`${id}/${volume}: ${bytes.length} bytes`);
  }
}
await Promise.all(Array.from({ length: 3 }, worker));
await writeFile('data/dynastic-histories/supplements/wikisource-pages.json', JSON.stringify(targets, null, 2) + '\n');
