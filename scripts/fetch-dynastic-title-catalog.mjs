import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parse } from 'parse5';
const names = ['汉书','后汉书','三国志','晋书','宋书','南齐书','梁书','陈书','魏书','北齐书','周书','隋书','南史','北史','旧唐书','新唐书','旧五代史','新五代史','宋史','辽史','金史','元史','明史'];
const sources = JSON.parse(await readFile('data/dynastic-histories/sources.json', 'utf8'));
const tree = JSON.parse(await readFile('data/dynastic-histories/metadata/hunterhug-history-tree.json', 'utf8')).tree;
const run = promisify(execFile);
const output = {};
const child = node => node.childNodes ?? [];
const attr = (node, key) => node?.attrs?.find(a => a.name === key)?.value ?? '';
const text = node => node.nodeName === '#text' ? node.value : child(node).map(text).join('');
function collect(node, found = []) { if (node.tagName === 'p' && attr(node, 'class').split(' ').includes('chapter')) found.push(node); child(node).forEach(c => collect(c, found)); return found; }
function firstLink(node) { if (node.tagName === 'a') return node; return child(node).map(firstLink).find(Boolean); }
let cursor = 0;
async function worker() {
  while (cursor < sources.length) {
    const n = cursor++, source = sources[n], name = names[n];
    const entry = tree.find(item => item.path === `${name}/${name}.html`);
    if (!entry) { output[source.id] = []; continue; }
    const { stdout } = await run('curl.exe', ['-f', '-sS', '-L', entry.url], { maxBuffer: 2 * 1024 * 1024 });
    const html = Buffer.from(JSON.parse(stdout).content, 'base64').toString('utf8');
    const chapters = collect(parse(html));
    const titles = chapters.map(p => text(child(p).find(c => c.tagName === 'span') ?? p).trim().split('（')[0].trim().replace(/^第[一二三四五六七八九十百千〇零]+章[-－]/, ''));
    const categories = chapters.map(p => {
      const section = decodeURIComponent(attr(firstLink(p), 'href')).split('/')[1] ?? '';
      return ['本纪', '列传', '志', '表', '世家', '载记'].includes(section) ? section : '篇章';
    });
    output[source.id] = { source: `https://github.com/hunterhug/china-history/blob/master/${encodeURIComponent(name)}/${encodeURIComponent(name)}.html`, titles, categories };
    console.log(`${source.id}: ${titles.length} titles`);
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
await writeFile('data/dynastic-histories/catalog-titles.json', JSON.stringify(output, null, 2) + '\n');
