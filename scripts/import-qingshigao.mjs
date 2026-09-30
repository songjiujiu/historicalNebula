import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { unzipSync, strFromU8 } from 'fflate';
import { Converter } from 'opencc-js';
import { readingBlocks, chapterHeading } from './history-epub.mjs';
const bytes=await readFile('data/modern-history/source/qingshigao.epub');
const zip=unzipSync(bytes), simplify=Converter({from:'tw',to:'cn'});
const root='public/data/modern/qingshigao'; await mkdir(root,{recursive:true});
const chapters=[],search=[];
for(let volume=1;volume<=529;volume++) {
  const key=Object.keys(zip).find(k=>k.endsWith(`_juan${volume}.xhtml`));
  if(!key) throw new Error(`Missing volume ${volume}`);
  const blocks=readingBlocks(strFromU8(zip[key])).filter(b=>!/^https:\/\/ctext\.org\/library\.pl\?/.test(b.text)).map((b,i)=>({...b,id:`p${i+1}`}));
  const characters=blocks.reduce((n,b)=>n+b.text.replace(/\s/g,'').length,0);
  if(characters<300 && ![29,30,31,32,33,34,35].includes(volume)) throw new Error(`Unexpected short volume ${volume}`);
  const header=chapterHeading(strFromU8(zip[key]));
  const topics=blocks.slice(0,2).map(b=>b.text.trim()).filter(t=>t.length<65&&!header.includes(t));
  const title=simplify([header,...topics].filter(Boolean).join(' · ')) || `卷${volume}`;
  const warning=volume===29?'本卷仅转录导言与少量星表行，表格不完整；请结合来源页及影印本核对。':volume>=30&&volume<=35?'来源仅录标题，正文缺录；本卷不计为可阅读正文。':'';
  const chapter={id:String(volume),volume,title,category:volume<=25?'本纪':volume<=160?'志':volume<=213?'表':'列传',characters,blocks:blocks.length,tables:blocks.filter(b=>b.kind==='table').length,sourceUrl:`https://zh.wikisource.org/wiki/清史稿/卷${volume}`,...(warning?{warning,coverage:volume===29?'partial':'missing'}:{})};
  chapters.push(chapter);
  await writeFile(`${root}/${volume}.json`,JSON.stringify({id:String(volume),blocks})+'\n');
  search.push({volume,blocks:blocks.map(b=>({id:b.id,text:simplify(b.text)}))});
}
const manifest={title:'清史稿',edition:'维基文库 EPUB · 2026-09-29',archiveSha256:createHash('sha256').update(bytes).digest('hex'),sourceUrl:'https://zh.wikisource.org/wiki/清史稿',license:'古代原作属公有领域；转录依 EPUB 元数据采用 CC BY-SA 3.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/3.0/',chapters};
await writeFile(`${root}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
await writeFile(`${root}/search.json`,JSON.stringify(search)+'\n');
console.log(JSON.stringify({volumes:chapters.length,characters:chapters.reduce((n,c)=>n+c.characters,0),tables:chapters.reduce((n,c)=>n+c.tables,0),shortest:chapters.toSorted((a,b)=>a.characters-b.characters).slice(0,5),sample:chapters.slice(0,4)},null,2));
