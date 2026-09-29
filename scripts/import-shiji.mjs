import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { unzipSync, strFromU8 } from 'fflate';
import { parse } from 'parse5';
import { Converter } from 'opencc-js';

// Reproducible, offline import. Download the pinned archive documented in data/shiji/README.md first.
const input = process.argv[2] ?? 'data/shiji/source.epub';
const bytes = await readFile(input);
const sha256 = createHash('sha256').update(bytes).digest('hex');
const EXPECTED_SHA256 = '8d2344521fd3e55cb280def477a7c9f87226af8ada1f64ecde00f3e7bd768bca';
if (sha256 !== EXPECTED_SHA256) throw new Error(`Unexpected archive SHA-256: ${sha256}`);
const zip = unzipSync(bytes);
const simplify = Converter({ from: 'tw', to: 'cn' });
const esc = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const attr = (node, key) => node.attrs?.find(a => a.name === key)?.value ?? '';
const children = node => node.childNodes ?? [];
const find = (node, fn) => fn(node) ? node : children(node).map(c => find(c, fn)).find(Boolean);
const droppedTags = new Set(['script', 'style', 'img', 'link', 'meta', 'iframe', 'object', 'input', 'button']);
const droppedClasses = /(?:^|\s)(?:ws-header|ws-footer|header|footer|noprint|sistersitebox|mbox-small|mw-editsection|licenseContainer|licensetpl)(?:\s|$)/;
const allowed = new Set(['p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'b', 'i', 'em', 'strong', 'small', 'sup', 'sub', 'br', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'blockquote', 'ruby', 'rt', 'rp']);
function variant(node) {
  const raw = attr(node, 'data-mw-variant');
  if (!raw) return null;
  const value = JSON.parse(raw);
  const choices = value.twoway ?? value.oneway;
  return Array.isArray(choices) ? (choices.find(v => v.l === 'zh-hant') ?? choices.find(v => v.l === 'zh') ?? choices[0])?.t ?? '' : value.name ?? '';
}
function removed(node) { return droppedTags.has(node.tagName) || droppedClasses.test(attr(node, 'class')) || /^headerContainer/.test(attr(node, 'id')); }
function plain(node) {
  if (removed(node)) return '';
  if (node.nodeName === '#text') return node.value;
  const v = variant(node); if (v !== null) return v;
  if (node.tagName === 'br') return '\n';
  return children(node).map(plain).join(['tr', 'tbody', 'ul', 'ol'].includes(node.tagName) ? '\n' : '');
}
function html(node) {
  if (removed(node)) return '';
  if (node.nodeName === '#text') return esc(node.value);
  const v = variant(node); if (v !== null) return esc(v);
  const content = children(node).map(html).join('');
  const tag = node.tagName;
  if (tag === 'a') {
    // Local note anchors stay local; external editorial links retain a safe URL.
    const href = attr(node, 'href');
    if (href.startsWith('#')) return `<a href="${esc(href)}">${content}</a>`;
    if (/^https:\/\/(?:zh\.wikisource\.org|zh\.wikipedia\.org)\//.test(href)) return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${content}</a>`;
    return content;
  }
  if (!allowed.has(tag)) return content;
  let attrs = '';
  const id = attr(node, 'id'); if (id) attrs += ` id="${esc(id)}"`;
  for (const key of ['colspan', 'rowspan']) { const val = attr(node, key); if (/^[1-9]\d{0,2}$/.test(val) && ['td', 'th'].includes(tag)) attrs += ` ${key}="${val}"`; }
  return tag === 'br' ? '<br>' : `<${tag}${attrs}>${content}</${tag}>`;
}
const groups = [[12, '本纪'], [22, '表'], [30, '书'], [60, '世家'], [130, '列传']];
const output = 'public/data/shiji';
await mkdir(output, { recursive: true });
await mkdir('src/domain/generated', { recursive: true });
const chapters = [];
const search = [];
const titles = JSON.parse(await readFile('data/shiji/titles.json', 'utf8'));
for (let volume = 1; volume <= 130; volume++) {
  const key = Object.keys(zip).find(k => k.endsWith(`_juan${String(volume).padStart(3, '0')}.xhtml`));
  if (!key) throw new Error(`Missing chapter ${volume}`);
  // EPUB is XHTML. Expand self-closing non-void elements before HTML parsing.
  const xhtml = strFromU8(zip[key]).replace(/<([\w:-]+)(\s[^<>]*?)?\s*\/>/g, (all, tag, attrs = '') => ['br', 'img', 'meta', 'link', 'hr', 'input'].includes(tag) ? all : `<${tag}${attrs}></${tag}>`);
  const doc = parse(xhtml);
  const body = find(doc, n => n.tagName === 'body');
  const title = titles[volume - 1];
  if (!title) throw new Error(`Missing title ${volume}`);
  const blocks = [];
  function collect(node) {
    if (removed(node)) return;
    if (['p', 'table', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'dl', 'blockquote'].includes(node.tagName)) {
      const text = plain(node).trim();
      if (!text) return;
      const id = `p${blocks.length + 1}`;
      const kind = node.tagName === 'table' && !attr(node, 'class').includes('ombox') ? 'table' : /^h[1-6]$/.test(node.tagName) ? 'heading' : 'paragraph';
      blocks.push({ id, kind, html: html(node), text });
    } else children(node).forEach(collect);
  }
  collect(body);
  const bodyText = plain(body).replace(/\s/g, '');
  const collectedText = blocks.map(b => b.text).join('').replace(/\s/g, '');
  if (bodyText !== collectedText) {
    let at = 0; while (bodyText[at] === collectedText[at] && at < bodyText.length) at++;
    throw new Error(`Text outside reading blocks in chapter ${volume}: ${bodyText.slice(at, at + 150)}`);
  }
  if (blocks.reduce((sum, b) => sum + b.text.length, 0) < 700) throw new Error(`Suspiciously short chapter ${volume}`);
  const tables = blocks.filter(b => b.kind === 'table').length;
  if (volume >= 13 && volume <= 22 && !tables) throw new Error(`Missing historical tables in ${volume}`);
  const chapter = { volume, title: simplify(title), originalTitle: title, category: groups.find(([max]) => volume <= max)[1], sourceId: `sj-${String(volume).padStart(3, '0')}`, sourceUrl: `https://zh.wikisource.org/wiki/史記/卷${String(volume).padStart(3, '0')}`, characters: blocks.reduce((sum, b) => sum + b.text.replace(/\s/g, '').length, 0), blocks: blocks.length, tables };
  chapters.push(chapter);
  await writeFile(`${output}/${String(volume).padStart(3, '0')}.json`, JSON.stringify({ volume, blocks }) + '\n');
  search.push({ volume, blocks: blocks.map(({ id, text }) => ({ id, text: simplify(text) })) });
}
const manifest = { version: 'shiji-wikisource-2026-03-15', archiveSha256: sha256, archiveUrl: 'https://raw.githubusercontent.com/baojie/shiji-kb/6b836e3fac1b900ccc6e9299fd6896c0e18ec132/corpus/shiji/%E5%8F%B2%E8%A8%98.%E7%B9%81%E4%BD%93.epub', edition: '维基文库《史记》繁体 EPUB · 2026-03-15', license: 'CC BY-SA 3.0（依 EPUB 元数据）；古代原作属公有领域', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/', chapters };
await writeFile('src/domain/generated/shiji-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
await writeFile(`${output}/search.json`, JSON.stringify(search) + '\n');
await writeFile(`${output}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ chapters: chapters.length, characters: chapters.reduce((n, c) => n + c.characters, 0), tables: chapters.reduce((n, c) => n + c.tables, 0), sha256 }, null, 2));
