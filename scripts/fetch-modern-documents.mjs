import { readFile, access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run=promisify(execFile), docs=JSON.parse(await readFile('data/modern-history/documents.json','utf8'));
let index=0;
await Promise.all(Array.from({length:3},async()=>{
  while(index<docs.length) {
    const d=docs[index++],path=`data/modern-history/source/${d.id}.epub`;
    try { await access(path); continue; } catch {}
    await run('curl.exe',['-f','-sS','-L','--retry','1','--max-time','120',`https://ws-export.wmcloud.org/?format=epub&lang=zh&page=${encodeURIComponent(d.page)}`,'-o',path]);
    console.log(d.id);
  }
}));
