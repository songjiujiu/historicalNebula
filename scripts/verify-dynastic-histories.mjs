import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const manifest = JSON.parse(await readFile('src/domain/generated/dynastic-manifest.json', 'utf8'));
assert.equal(manifest.books.length, 23);
assert.equal(manifest.books.reduce((sum, book) => sum + book.volumes, 0), 3083);
let chapters = 0;
let blocks = 0;
const incomplete = [];
for (const book of manifest.books) {
  const expected = Array.from({ length: book.volumes }, (_, index) => index + 1);
  assert.deepEqual(book.chapters.filter(chapter => chapter.volume > 0).map(chapter => chapter.volume), expected, `${book.id}: consecutive volumes`);
  const search = JSON.parse(await readFile(`public/data/histories/${book.id}/search.json`, 'utf8'));
  assert.equal(search.length, book.chapters.length, `${book.id}: search coverage`);
  for (const [index, chapter] of book.chapters.entries()) {
    const volume = JSON.parse(await readFile(`public/data/histories/${book.id}/${String(chapter.volume).padStart(3, '0')}.json`, 'utf8'));
    assert.equal(volume.volume, chapter.volume, `${book.id}/${chapter.volume}: volume`);
    assert.equal(volume.blocks.length, chapter.blocks, `${book.id}/${chapter.volume}: block count`);
    assert.deepEqual(volume.blocks.map(block => block.id), volume.blocks.map((_, i) => `p${i + 1}`), `${book.id}/${chapter.volume}: anchors`);
    assert.ok(volume.blocks.every(block => block.text.length && block.html.length), `${book.id}/${chapter.volume}: text`);
    assert.equal(search[index].volume, chapter.volume, `${book.id}/${chapter.volume}: indexed volume`);
    assert.equal(search[index].blocks.length, chapter.blocks, `${book.id}/${chapter.volume}: indexed blocks`);
    if (chapter.incomplete) incomplete.push(`${book.id}/${chapter.volume}`);
    if (book.id === 'songshi' && (chapter.volume === 215 || chapter.volume >= 230 && chapter.volume <= 241)) {
      assert.ok(volume.blocks.every(block => block.kind === 'table' && block.html.includes('<table>') && block.text.length > 500), `${book.id}/${chapter.volume}: complete genealogy table`);
    }
    if (book.id === 'jiuwudaishi' && [11, 86, 122].includes(chapter.volume)) assert.ok(chapter.characters > 500, `${book.id}/${chapter.volume}: supplemented text`);
    chapters++;
    blocks += chapter.blocks;
  }
}
assert.deepEqual(incomplete.sort(), ['jinshu/18', 'songshi/83', 'songshi/84', 'jinshi/21', 'jinshi/22', 'mingshi/25', 'mingshi/32', 'mingshi/33', 'mingshi/34', 'mingshi/35', 'mingshi/36', 'mingshi/39'].sort());
console.log(`Verified ${manifest.books.length} histories, ${chapters} chapter files (${chapters - 1} standard volumes plus one preface), ${blocks} paragraph/table anchors, and ${incomplete.length} explicitly marked incomplete tables.`);
