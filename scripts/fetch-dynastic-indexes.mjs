import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// Bibliographic labels only; the full text is imported from the pinned OSF corpus.
const names = ['漢書','後漢書','三國志','晉書','宋書','南齊書','梁書','陳書','魏書','北齊書','周書','隋書','南史','北史','舊唐書','新唐書','舊五代史','新五代史','宋史','遼史','金史','元史','明史'];
const sources = JSON.parse(await readFile('data/dynastic-histories/sources.json', 'utf8'));
const tree = JSON.parse(await readFile('data/dynastic-histories/metadata/yuanshiming-tree.json', 'utf8')).tree;
const run = promisify(execFile);
const result = {};
let cursor = 0;
async function worker() {
  while (cursor < sources.length) {
    const n = cursor++;
    const source = sources[n];
    const name = names[n];
    const entry = tree.find(item => item.path === `${name}/${name}.tex`);
    if (!entry) { result[source.id] = { source: null, titles: [] }; console.log(`${source.id}: no index`); continue; }
    const url = `https://api.github.com/repos/yuanshiming/Twenty-Four-Histories/git/blobs/${entry.sha}`;
    const { stdout } = await run('curl.exe', ['-f', '-sS', '-L', url], { maxBuffer: 3 * 1024 * 1024 });
    const body = JSON.parse(stdout);
    const latex = Buffer.from(body.content, 'base64').toString('utf8');
    const titles = [...latex.matchAll(/\\input\{[^/]+\/([^}]+)\.tex\}/g)].map(match => match[1]);
    result[source.id] = { source: `https://github.com/yuanshiming/Twenty-Four-Histories/blob/master/${encodeURIComponent(name)}/${encodeURIComponent(name)}.tex`, titles };
    console.log(`${source.id}: ${titles.length} titles`);
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
await writeFile('data/dynastic-histories/indexes.json', JSON.stringify(result, null, 2) + '\n');
