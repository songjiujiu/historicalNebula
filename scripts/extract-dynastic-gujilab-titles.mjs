import { readFile, writeFile } from 'node:fs/promises';

const output = {};
for (const id of ['weishu', 'zhoushu']) {
  const records = JSON.parse(await readFile(`data/dynastic-histories/metadata/${id}-gujilab.json`, 'utf8'));
  const titles = {};
  for (const item of records) {
    if (titles[item.volume]) continue;
    let label = '';
    if (id === 'weishu') label = item.chapter.replace(/^魏书‧卷\S+\s*/, '').trim();
    else {
      const category = item.chapter.replace(/^周书卷\S+\s*/, '').trim();
      const heading = item.content.split('\n').map(line => line.trim()).find(Boolean) ?? '';
      label = heading.length <= 46 && !/[。！？；]/.test(heading) ? `${category} · ${heading}` : category;
    }
    if (label) titles[item.volume] = label;
  }
  output[id] = { source: `https://github.com/gujilab/chinese-classical-corpus/blob/main/output/histories/${id}.json`, titles };
}
await writeFile('data/dynastic-histories/gujilab-titles.json', JSON.stringify(output, null, 2) + '\n');
console.log(Object.fromEntries(Object.entries(output).map(([id, item]) => [id, Object.keys(item.titles).length])));
