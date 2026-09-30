import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { unzipSync, strFromU8 } from 'fflate';
import { readingBlocks, esc } from './history-epub.mjs';
const source=await readFile('src/domain/modern-history.ts','utf8');
// Read the literal metadata only; tests also compare every generated ID with the runtime domain.
const events=Array.from(source.matchAll(/^  e\('([^']+)', '([^']+)', '([^']+)', '([^']+)'/gm),([,id,era,year,title])=>({id,era,year,title}));
if(events.length!==34) throw new Error('Review changed modern event metadata before importing');
const root='public/data/modern', chapters=[],documents=[];
await mkdir(`${root}/chapters`,{recursive:true}); await mkdir(`${root}/documents`,{recursive:true});
const md=await readFile('data/modern-history/chapters.md','utf8');
for(const part of md.split(/^# /m).filter(Boolean)) {
  const lines=part.trim().split('\n'),id=lines.shift().trim(),event=events.find(e=>e.id===id);
  if(!event) throw new Error(`Unknown event ${id}`);
  // Markdown subset: section headings and plain paragraphs only, never arbitrary HTML.
  const result=[];
  for(const line of lines.map(l=>l.trim()).filter(Boolean)) {
    const heading=line.startsWith('## '),text=heading?line.slice(3):line;
    result.push({id:`p${result.length+1}`,kind:heading?'heading':'paragraph',html:`<${heading?'h2':'p'}>${esc(text)}</${heading?'h2':'p'}>`,text});
  }
  const characters=result.reduce((n,b)=>n+b.text.length,0);
  if(characters<400||result.filter(b=>b.kind==='heading').length<3) throw new Error(`Incomplete chapter ${id}`);
  chapters.push({id,title:event.title,date:event.year,era:event.era,characters,blocks:result.length,outline:result.filter(b=>b.kind==='heading').map(b=>({id:b.id,title:b.text}))});
  await writeFile(`${root}/chapters/${id}.json`,JSON.stringify({id,blocks:result})+'\n');
}
if(chapters.length!==events.length||new Set(chapters.map(c=>c.id)).size!==events.length) throw new Error('Event coverage mismatch');
const docs=JSON.parse(await readFile('data/modern-history/documents.json','utf8'));
for(const d of docs) {
  const bytes=await readFile(`data/modern-history/source/${d.id}.epub`),zip=unzipSync(bytes);
  const keys=Object.keys(zip).filter(k=>/\/c\d+_.*\.xhtml$/.test(k));
  if(keys.length!==1) throw new Error(`Review multi-page document ${d.id}`);
  let blocks=readingBlocks(strFromU8(zip[keys[0]]));
  if(d.id.startsWith('constitution-')) {
    const start=blocks.findIndex(b=>b.text.startsWith(d.id==='constitution-1993'?'第三条':'第三十二条'));
    if(start<0) throw new Error('Missing amendment body'); blocks=blocks.slice(start);
  }
  blocks=blocks.map((b,i)=>({...b,id:`p${i+1}`}));
  // Prefer a prose block to a title when resolving a document citation.
  const target=blocks.find(b=>b.kind!=='heading'&&b.text.includes(d.cue)&&b.text.length>30) ?? blocks.find(b=>b.kind!=='heading'&&b.text.includes(d.cue));
  if(!target||blocks.length<3) throw new Error(`Missing document text/cue ${d.id}`);
  documents.push({...d,block:target.id,characters:blocks.reduce((n,b)=>n+b.text.length,0),blocks:blocks.length,sourceUrl:`https://zh.wikisource.org/wiki/${encodeURIComponent(d.page.replaceAll(' ','_'))}`,archiveSha256:createHash('sha256').update(bytes).digest('hex'),license:'文献原作属公有领域或法律、行政文件；维基文库及贡献者转录，依 EPUB 元数据采用 CC BY-SA 3.0。',licenseUrl:'https://creativecommons.org/licenses/by-sa/3.0/'});
  await writeFile(`${root}/documents/${d.id}.json`,JSON.stringify({id:d.id,blocks})+'\n');
}
for(const {paragraphs,...d} of JSON.parse(await readFile('data/modern-history/extra-documents.json','utf8'))) {
  const blocks=paragraphs.map((text,i)=>({id:`p${i+1}`,kind:'paragraph',html:`<p>${esc(text)}</p>`,text}));
  const block=blocks.find(b=>b.text.includes(d.cue))?.id;
  if(!block) throw new Error(`Missing cue ${d.id}`);
  documents.push({...d,block,characters:blocks.reduce((n,b)=>n+b.text.length,0),blocks:blocks.length});
  await writeFile(`${root}/documents/${d.id}.json`,JSON.stringify({id:d.id,blocks})+'\n');
}
const qingLinks=JSON.parse(await readFile('data/modern-history/qing-links.json','utf8'));
for(const link of qingLinks) {
  const {blocks}=JSON.parse(await readFile(`${root}/qingshigao/${link.volume}.json`,'utf8'));
  const block=blocks.find(b=>b.text.includes(link.cue));
  if(!block) throw new Error(`Missing Qing cue ${link.event}: ${link.cue}`);
  link.block=block.id;
}
const manifest={checked:'2026-09-29',chapters,documents,qingLinks};
await writeFile('src/domain/generated/modern-texts-manifest.json',JSON.stringify(manifest,null,2)+'\n');
await writeFile(`${root}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({chapters:chapters.length,characters:chapters.reduce((n,c)=>n+c.characters,0),documents:documents.length,qingLinks:qingLinks.length}));
