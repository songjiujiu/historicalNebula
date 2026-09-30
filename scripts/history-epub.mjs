import { parse } from 'parse5';
export const esc = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const attr = (n, k) => n.attrs?.find(a => a.name === k)?.value ?? '';
const children = n => n.childNodes ?? [];
const find = (n, fn) => fn(n) ? n : children(n).map(c => find(c, fn)).find(Boolean);
const drop = n => ['script','style','img','link','meta','iframe','object','input','button','noscript'].includes(n.tagName) || /(?:^|\s)(?:ws-header|ws-footer|header|footer|noprint|sistersitebox|mbox-small|mw-editsection|licenseContainer|licensetpl|catlinks)(?:\s|$)/.test(attr(n,'class')) || /^headerContainer/.test(attr(n,'id'));
const allowed = new Set(['p','div','span','h1','h2','h3','h4','h5','h6','table','thead','tbody','tfoot','tr','td','th','caption','b','i','em','strong','small','sup','sub','br','ul','ol','li','dl','dt','dd','blockquote','ruby','rt','rp']);
function variant(n) {
  const raw = attr(n,'data-mw-variant'); if (!raw) return null;
  const v = JSON.parse(raw), opts = v.twoway ?? v.oneway;
  return Array.isArray(opts) ? (opts.find(x=>x.l==='zh-hant') ?? opts.find(x=>x.l==='zh') ?? opts[0])?.t ?? '' : v.name ?? '';
}
function plain(n) {
  if (drop(n)) return ''; if (n.nodeName === '#text') return n.value;
  const v=variant(n); if(v!==null) return v;
  return n.tagName==='br' ? '\n' : children(n).map(plain).join(['tr','tbody','ul','ol'].includes(n.tagName)?'\n':'');
}
function html(n) {
  if(drop(n)) return ''; if(n.nodeName==='#text') return esc(n.value);
  const v=variant(n); if(v!==null) return esc(v);
  const content=children(n).map(html).join(''), tag=n.tagName;
  if(!allowed.has(tag)) return content;
  let attrs='';
  for(const key of ['colspan','rowspan']) { const val=attr(n,key); if(['td','th'].includes(tag)&&/^[1-9]\d{0,2}$/.test(val)) attrs+=` ${key}="${val}"`; }
  return tag==='br'?'<br>':`<${tag}${attrs}>${content}</${tag}>`;
}
export function readingBlocks(xhtml) {
  const doc=parse(xhtml.replace(/<([\w:-]+)(\s[^<>]*?)?\s*\/>/g,(all,tag,attrs='')=>['br','img','meta','link','hr','input'].includes(tag)?all:`<${tag}${attrs}></${tag}>`));
  const body=find(doc,n=>n.tagName==='body');
  if(!body) throw new Error('Missing EPUB body');
  const blocks=[];
  const add=n=> { const text=plain(n).trim(); if(text) blocks.push({id:`p${blocks.length+1}`,kind:n.tagName==='table'?'table':/^h[1-6]$/.test(n.tagName)?'heading':'paragraph',html:n.nodeName==='#text'?`<p>${esc(text)}</p>`:html(n),text}); };
  function collect(n) {
    if(drop(n)) return;
    if(['p','table','h1','h2','h3','h4','h5','h6','ul','ol','dl','blockquote'].includes(n.tagName)||n.nodeName==='#text') add(n);
    else children(n).forEach(collect);
  }
  collect(body);
  if(plain(body).replace(/\s/g,'')!==blocks.map(b=>b.text).join('').replace(/\s/g,'')) throw new Error('Uncollected text');
  return blocks;
}
export function chapterHeading(xhtml) {
  const doc=parse(xhtml);
  const td=find(doc,n=>n.tagName==='td'&&/width:\s*50%/.test(attr(n,'style')));
  return td ? plain(td).replace(/^清史稿\s*/,'').split('作者：')[0].trim() : '';
}
