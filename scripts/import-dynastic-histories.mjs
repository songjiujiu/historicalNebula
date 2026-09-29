import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parse } from 'parse5';
import { Converter } from 'opencc-js';
import { unzipSync } from 'fflate';

const folder = 'data/dynastic-histories';
const sources = JSON.parse(await readFile(`${folder}/sources.json`, 'utf8'));
const books = JSON.parse(await readFile(`${folder}/books.json`, 'utf8'));
const latexIndexes = JSON.parse(await readFile(`${folder}/indexes.json`, 'utf8'));
const catalogIndexes = JSON.parse(await readFile(`${folder}/catalog-titles.json`, 'utf8'));
const gujilabTitles = JSON.parse(await readFile(`${folder}/gujilab-titles.json`, 'utf8'));
const simplify = Converter({ from: 'tw', to: 'cn' });
// OpenCC can leave an unmatched surrogate for rare historic glyphs. Keep
// original text intact; make only the derived UI label valid Unicode.
const wellFormed = value => value.replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '�');
const esc = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const child = node => node.childNodes ?? [];
const body = node => node.tagName === 'body' ? node : child(node).map(body).find(Boolean);
const plain = node => node.nodeName === '#text' ? node.value : node.tagName === 'br' ? '\n' : child(node).map(plain).join('');
const descendants = (node, tag, result = []) => { if (node.tagName === tag) result.push(node); child(node).forEach(item => descendants(item, tag, result)); return result; };
const safeTags = new Set(['table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'p', 'b', 'strong', 'i', 'em', 'sup', 'sub', 'br']);
function safeTableHtml(node) {
  if (node.nodeName === '#text') return esc(node.value);
  if (['script', 'style', 'template'].includes(node.tagName)) return '';
  const children = child(node).map(safeTableHtml).join('');
  if (!safeTags.has(node.tagName)) return children;
  if (node.tagName === 'br') return '<br>';
  const spans = ['rowspan', 'colspan'].map(key => {
    const value = node.attrs?.find(attr => attr.name === key)?.value;
    return value && /^\d{1,3}$/.test(value) ? ` ${key}="${value}"` : '';
  }).join('');
  return `<${node.tagName}${spans}>${children}</${node.tagName}>`;
}
function tableText(node) {
  if (node.nodeName === '#text') return node.value;
  const content = child(node).map(tableText).join('');
  return node.tagName === 'tr' ? `${content}\n` : node.tagName === 'td' || node.tagName === 'th' ? `${content}\t` : content;
}
const normalize = text => text.replace(/\r/g, '').replace(/\uFEFF/g, '').trim();
function fromMirror(file) {
  const blob = JSON.parse(file);
  const html = Buffer.from(blob.content, 'base64').toString('utf8');
  const nodes = child(body(parse(html)));
  const start = nodes.findIndex(node => node.tagName === 'h1');
  const paragraphs = nodes.slice(start + 1).filter(node => node.tagName === 'p').map(node => normalize(plain(node))).filter(Boolean);
  if (paragraphs.join('').length < 500) throw new Error('Supplemental mirror page too short');
  return paragraphs;
}
const houhanMirror = JSON.parse(await readFile(`${folder}/houhanshu-supplement.json`, 'utf8'));
const houhanTitles = new Map([...houhanMirror].reverse().map(item => [item.volume, normalize(item.content.split('\n')[1] ?? '')]).filter(([, title]) => title && title.length <= 40));
const supplements = {
  houhanshu: {
    50: houhanMirror.find(item => item.volume === 50)?.content.split(/\n+/).map(normalize).filter(Boolean),
    51: houhanMirror.find(item => item.volume === 51)?.content.split(/\n+/).map(normalize).filter(Boolean),
  },
  xintangshi: { 54: fromMirror(await readFile(`${folder}/xintangshi-054-hunterhug.json`, 'utf8')) },
  songshi: { 69: fromMirror(await readFile(`${folder}/songshi-069.json`, 'utf8')) },
};
const supplementSource = {
  'houhanshu/50': 'https://github.com/gujilab/chinese-classical-corpus/blob/main/output/histories/houhanshu.json',
  'houhanshu/51': 'https://github.com/gujilab/chinese-classical-corpus/blob/main/output/histories/houhanshu.json',
  'xintangshi/54': 'https://github.com/hunterhug/china-history/blob/master/%E6%96%B0%E5%94%90%E4%B9%A6/%E5%BF%97/%E7%AC%AC%E5%9B%9B%E5%8D%81%E5%9B%9B%E7%AB%A0-%E5%8D%B7%E5%9B%9B%E5%8D%81%E5%9B%9B-%E5%8E%9F%E6%96%87.html',
  'songshi/69': 'https://github.com/hunterhug/china-history/blob/master/%E5%AE%8B%E5%8F%B2/%E5%BF%97/%E7%AC%AC%E4%BA%8C%E5%8D%81%E4%BA%8C%E7%AB%A0-%E5%8D%B7%E4%BA%8C%E5%8D%81%E4%BA%8C-%E5%8E%9F%E6%96%87.html',
};
const supplementTitles = {
  'houhanshu/50': '銚王祭列傳第十',
  'houhanshu/51': '任李萬邳劉耿列傳第十一',
  'xintangshi/54': '食貨四',
  'songshi/69': '應天、乾元、儀天曆',
};
const supplementCategories = { 'houhanshu/50': '列传', 'houhanshu/51': '列传', 'xintangshi/54': '志', 'songshi/69': '志' };
const knownIncompleteTables = new Set([
  'jinshu/18', 'songshi/83', 'songshi/84', 'jinshi/21', 'jinshi/22',
  'mingshi/25', 'mingshi/32', 'mingshi/33', 'mingshi/34', 'mingshi/35', 'mingshi/36', 'mingshi/39',
]);
const wikiPages = JSON.parse(await readFile(`${folder}/supplements/wikisource-pages.json`, 'utf8'));
const wikiReplacements = {};
for (const { id, volume, page } of wikiPages) {
  const bytes = await readFile(`${folder}/supplements/${id}-${String(volume).padStart(3, '0')}.epub`);
  const files = unzipSync(bytes);
  const pages = Object.entries(files).filter(([name]) => name.endsWith('.xhtml') && !/(?:nav|title|about)\.xhtml$/.test(name));
  const document = parse(pages.map(([, data]) => Buffer.from(data).toString('utf8')).join(''));
  const sourceUrl = `https://zh.wikisource.org/wiki/${encodeURIComponent(page).replaceAll('%2F', '/')}`;
  const edition = id === 'jiuwudaishi' ? '维基文库《旧五代史》四库全书本' : '维基文库单卷 EPUB 转录';
  if (id === 'songshi' && (volume === 215 || volume >= 230)) {
    const tables = descendants(document, 'table').filter(table => descendants(table, 'tr').length > 100);
    if (!tables.length) throw new Error(`Wikisource table missing: ${id}/${volume}`);
    const blocks = tables.map((table, index) => ({ id: `p${index + 1}`, kind: 'table', html: safeTableHtml(table), text: normalize(tableText(table)) }));
    wikiReplacements[`${id}/${volume}`] = { blocks, sourceUrl, edition, title: `表第${volume - 209} · 宗室世系${volume - 214}`, category: '表', incomplete: false };
  } else if (id === 'jiuwudaishi') {
    const first = descendants(document, 'p').map(plain).find(value => value.includes('欽定四庫全書'));
    const paragraphs = first?.split(/\n+/).map(normalize).filter(value => value && !/^(?:欽定四庫全書|舊五代史[巻卷]|宋門下侍郎|[梁晉周]書第)/.test(value)) ?? [];
    if (paragraphs.join('').length < 500) throw new Error(`Wikisource volume too short: ${id}/${volume}`);
    const blocks = paragraphs.map((paragraph, index) => ({ id: `p${index + 1}`, kind: 'paragraph', html: esc(paragraph), text: paragraph }));
    wikiReplacements[`${id}/${volume}`] = { blocks, sourceUrl, edition, title: { 11: '后妃列传一', 86: '晋后妃列传一', 122: '宗室列传二' }[volume], category: '列传', incomplete: false };
  } else {
    // These source pages themselves say “表格略”; do not imply full transcription.
    wikiReplacements[`${id}/${volume}`] = { comparisonUrl: sourceUrl, incomplete: true };
  }
}
const category = title => /(?:本[纪紀]|帝[纪紀]|后[纪紀]|後[紀纪]|后妃[纪紀])/.test(title) ? '本纪' : /(?:列[传傳]|[传傳]$)/.test(title) ? '列传' : /世家/.test(title) ? '世家' : /[载載]記|[载載]记/.test(title) ? '载记' : /表/.test(title) ? '表' : /(?:志|[书書]$)/.test(title) ? '志' : '篇章';
const generated = [];
for (const [index, source] of sources.entries()) {
  const bytes = await readFile(`${folder}/source/${source.file}`);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (bytes.length !== source.bytes || sha256 !== source.sha256) throw new Error(`Source checksum mismatch: ${source.id}`);
  const text = bytes.toString('utf8').replaceAll('\r\n', '\n');
  const markers = [...text.matchAll(/^\*(\d{2})-(\d{3})\*$/gm)];
  if (!markers.length || Number(markers[0][1]) !== index + 2) throw new Error(`Incorrect book markers: ${source.id}`);
  const volumes = new Map();
  for (const [position, marker] of markers.entries()) {
    const volume = Number(marker[2]);
    if (volumes.has(volume)) throw new Error(`Duplicate ${source.id} volume ${volume}`);
    const slice = text.slice(marker.index + marker[0].length, markers[position + 1]?.index ?? text.length);
    const paragraphs = slice.split('\n').map(normalize).filter(Boolean);
    if (!paragraphs.length) throw new Error(`Empty ${source.id} volume ${volume}`);
    volumes.set(volume, { paragraphs, sourceUrl: source.url, edition: 'CCDH 2019 · 据维基文库整理' });
  }
  for (const [key, paragraphs] of Object.entries(supplements[source.id] ?? {})) {
    const volume = Number(key);
    if (!paragraphs?.length || volumes.has(volume)) throw new Error(`Unexpected supplement ${source.id}/${volume}`);
    volumes.set(volume, { paragraphs, sourceUrl: supplementSource[`${source.id}/${volume}`], edition: '公开转录补卷' });
  }
  for (const [key, replacement] of Object.entries(wikiReplacements)) {
    const [bookId, volumeNumber] = key.split('/');
    if (bookId !== source.id) continue;
    const volume = Number(volumeNumber);
    if (!volumes.has(volume)) throw new Error(`Unexpected Wikisource replacement ${key}`);
    volumes.set(volume, { ...volumes.get(volume), ...replacement });
  }
  const maximum = Math.max(...volumes.keys());
  for (let volume = 1; volume <= maximum; volume++) if (!volumes.has(volume)) throw new Error(`Missing ${source.id} volume ${volume}`);
  const originalIndex = latexIndexes[source.id]?.titles ?? [];
  const mirrorIndex = catalogIndexes[source.id]?.titles ?? [];
  const titles = originalIndex.length === maximum ? originalIndex : mirrorIndex.length === maximum ? mirrorIndex : [];
  const mirrorCategories = mirrorIndex.length === maximum ? catalogIndexes[source.id]?.categories ?? [] : [];
  const chapters = [];
  const search = [];
  let characters = 0;
  await mkdir(`public/data/histories/${source.id}`, { recursive: true });
  for (const volume of [...volumes.keys()].sort((a, b) => a - b)) {
    const entry = volumes.get(volume);
    const [opening] = entry.paragraphs;
    const heading = !entry.blocks && opening.length <= 30 && !/[。？！；]/.test(opening) ? opening : null;
    const indexTitle = volume && titles[volume - 1];
    const originalTitle = entry.title ?? supplementTitles[`${source.id}/${volume}`] ?? (source.id === 'houhanshu' ? houhanTitles.get(volume) : undefined) ?? gujilabTitles[source.id]?.titles[volume] ?? (indexTitle && !/^卷[一二三四五六七八九十百千〇零\d]+$/.test(indexTitle) ? indexTitle : heading);
    const title = volume === 0 ? '序' : originalTitle ? wellFormed(simplify(originalTitle)) : `卷 ${volume}`;
    const houhanCategory = source.id === 'houhanshu' && volume > 0 ? volume <= 10 ? '本纪' : volume <= 40 ? '志' : '列传' : undefined;
    const blocks = entry.blocks ?? entry.paragraphs.map((paragraph, i) => ({ id: `p${i + 1}`, kind: i === 0 && heading ? 'heading' : 'paragraph', html: esc(paragraph).replaceAll('\n', '<br>'), text: paragraph }));
    const count = blocks.map(block => block.text).join('').replace(/\s/g, '').length;
    characters += count;
    chapters.push({ volume, title, originalTitle: wellFormed(originalTitle ?? title), category: entry.category ?? supplementCategories[`${source.id}/${volume}`] ?? houhanCategory ?? (mirrorCategories[volume - 1] && mirrorCategories[volume - 1] !== '篇章' ? mirrorCategories[volume - 1] : category(originalTitle ?? '')), characters: count, blocks: blocks.length, sourceUrl: entry.sourceUrl, comparisonUrl: entry.comparisonUrl ?? null, edition: entry.edition, incomplete: entry.incomplete ?? knownIncompleteTables.has(`${source.id}/${volume}`), excerpt: wellFormed(simplify(blocks.map(block => block.text).find(p => p.length > 50) ?? opening).replace(/\s+/g, ' ').slice(0, 95)) });
    search.push({ volume, blocks: blocks.map(({ id, text }) => ({ id, text: wellFormed(simplify(text)) })) });
    await writeFile(`public/data/histories/${source.id}/${String(volume).padStart(3, '0')}.json`, JSON.stringify({ volume, blocks }) + '\n');
  }
  await writeFile(`public/data/histories/${source.id}/search.json`, JSON.stringify(search) + '\n');
  generated.push({ ...books[index], volumes: maximum, characters, sourceUrl: source.url, sha256, chapters });
  console.log(`${source.id}: ${maximum} volumes, ${characters} characters`);
}
if (generated.length !== 23 || generated.reduce((sum, book) => sum + book.volumes, 0) !== 3083) throw new Error('The 23-history corpus is incomplete');
await mkdir('src/domain/generated', { recursive: true });
await writeFile('src/domain/generated/dynastic-manifest.json', JSON.stringify({ version: 'ccdh-2019-plus-4-supplements', books: generated }, null, 2) + '\n');
console.log('Imported 23 histories and 3,083 standard volumes.');
