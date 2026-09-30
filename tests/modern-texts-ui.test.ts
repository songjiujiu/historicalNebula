// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createModernTexts } from '../src/ui/modern-texts';
import { modernTextUrl, modernChapters } from '../src/domain/modern-texts';
const content = (path: string) => JSON.parse(readFileSync(`public/data/modern/${path}`, 'utf8'));
function setup(url: string) {
  history.replaceState(null, '', url);
  const host=document.createElement('div');document.body.append(host);
  const onJourney=vi.fn();const reader=createModernTexts(host,{onJourney});
  return {host,reader,onJourney};
}
beforeEach(() => {
  document.body.replaceChildren(); localStorage.clear();
  vi.spyOn(HTMLElement.prototype,'scrollIntoView').mockImplementation(()=>{});
  vi.stubGlobal('fetch',vi.fn(async (url: string) => new Response(JSON.stringify(content(url.split('data/modern/')[1])))));
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it('offers all prose chapters, filters without replacing focus, and highlights deep-linked sections', async () => {
  const {host,reader,onJourney}=setup('/?texts=chapters');await reader.showFromUrl();
  expect(host.querySelectorAll('.mt-card')).toHaveLength(modernChapters.length);
  const input=host.querySelector<HTMLInputElement>('[data-text-search]')!;input.focus();input.value='香港';input.dispatchEvent(new Event('input',{bubbles:true}));
  expect(host.querySelectorAll('.mt-card')).toHaveLength(2); // Macau's section also compares Hong Kong.
  expect(host.querySelector('.mt-card[href*="hong-kong-return"]')).toBeTruthy();expect(document.activeElement).toBe(input);
  history.pushState(null,'',modernTextUrl('chapters','hong-kong-return','hong-kong-return','p4'));await reader.showFromUrl();
  expect(host.querySelector('.mt-highlight')?.getAttribute('data-text-block')).toBe('p4');
  expect(host.querySelector('[data-text-body]')!.textContent).toContain('1842年');
  expect(host.querySelector('.mt-related a')!.getAttribute('href')).toContain('doc=hong-kong-declaration');
  host.querySelector<HTMLAnchorElement>('[data-text-journey]')!.click();expect(onJourney).toHaveBeenCalledWith('hong-kong-return');
});
it('renders actual documents, keeps their provenance, and finds words in the current text', async () => {
  const {host,reader}=setup('/?texts=documents&doc=macao-declaration&from=macao-return#p3');await reader.showFromUrl();
  expect(host.querySelector('.mt-highlight')?.textContent).toContain('1999年12月20日');
  expect(host.querySelector('.mt-provenance')?.textContent).toContain('CC BY-SA 3.0');
  const input=host.querySelector<HTMLInputElement>('[data-text-find]')!;input.value='联合联络小组';input.dispatchEvent(new Event('input',{bubbles:true}));
  expect(host.querySelectorAll('[data-text-matches] a').length).toBeGreaterThan(0);
  host.querySelector<HTMLAnchorElement>('[data-text-matches] a')!.click();
  expect(location.hash).toMatch(/^#p\d+$/);
});
it('marks absent Qing transcription and does not imply it contains a complete body', async () => {
  const {host,reader}=setup('/?texts=qingshigao&volume=30');await reader.showFromUrl();
  expect(host.querySelector('.mt-warning')?.textContent).toContain('正文缺录');
  history.replaceState(null,'','/?texts=qingshigao');await reader.showFromUrl();
  expect(host.querySelectorAll('.mt-volume')).toHaveLength(40);
  const input=host.querySelector<HTMLInputElement>('[data-text-search]')!;input.value='李鸿章';input.dispatchEvent(new Event('input',{bubbles:true}));
  expect(host.querySelector('.mt-volume')?.textContent).toContain('411');
});
it('evicts failed fetches so retry loads the same body successfully', async () => {
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(new Response('',{status:503})).mockResolvedValueOnce(new Response(JSON.stringify(content('chapters/korean-war.json')))));
  const {host,reader}=setup('/?texts=chapters&article=korean-war');await reader.showFromUrl();
  expect(host.textContent).toContain('正文暂时无法打开');
  await reader.showFromUrl();expect(host.querySelector('[data-text-body]')?.textContent).toContain('1953年');
  expect(fetch).toHaveBeenCalledTimes(2);
});
it('prevents a slow old request from overwriting a new route or hidden reader', async () => {
  let resolve!: (response:Response)=>void;
  vi.stubGlobal('fetch',vi.fn((url:string)=>url.endsWith('beiyang.json')?new Promise<Response>(r=>{resolve=r;}):Promise.resolve(new Response(JSON.stringify(content('chapters/may-fourth.json'))))));
  const {host,reader}=setup('/?texts=chapters&article=beiyang');const slow=reader.showFromUrl();
  history.replaceState(null,'','/?texts=chapters&article=may-fourth');await reader.showFromUrl();reader.hide();
  resolve(new Response(JSON.stringify(content('chapters/beiyang.json'))));await slow;
  expect(host.querySelector('h1')?.textContent).toContain('五四运动');
  expect(host.querySelector('[data-text-body]')?.textContent).toContain('巴黎和会');
});
