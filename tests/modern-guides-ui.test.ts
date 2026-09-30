// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { createModernGuides } from '../src/ui/modern-guides';
import { createModernTexts } from '../src/ui/modern-texts';
import { modernGuideTextUrl, modernGuideLocation } from '../src/domain/modern-guide-location';
function setup(url='/?modern-guides=') {
  history.replaceState(null,'',url); const host=document.createElement('div');document.body.append(host);
  const onText=vi.fn(); const guide=createModernGuides(host,{onText});guide.showFromUrl();return {host,guide,onText};
}
beforeEach(()=>{document.body.replaceChildren();localStorage.clear();vi.spyOn(HTMLElement.prototype,'scrollIntoView').mockImplementation(()=>{});});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it('shows every guide and filters traditional search input without replacing focus or scrolling',()=>{
  const {host}=setup();expect(host.querySelectorAll('.mg-era-grid article')).toHaveLength(6);expect(host.querySelectorAll('.mg-question-list article')).toHaveLength(34);
  const input=host.querySelector<HTMLInputElement>('[data-mg-search]')!;input.focus();input.value='憲法';input.dispatchEvent(new Event('input',{bubbles:true}));
  expect(host.querySelector('.mg-question-list')?.textContent).toContain('任职条款');expect(document.activeElement).toBe(input);
  expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  input.value='没有这篇内容';input.dispatchEvent(new Event('input',{bubbles:true}));expect(host.querySelectorAll('.mg-question-list article')).toHaveLength(0);
});
it('switches steps in place and persists explicit completion and resume across reloads',()=>{
  const {host,guide}=setup('/?modern-guides=reform&step=hong-kong-return');
  const sidebar=host.querySelector('.mg-step-nav');const intro=host.querySelector('.mg-era-intro');
  host.querySelector<HTMLAnchorElement>('[data-mg-step=macao-return]')!.click();
  expect(host.querySelector('.mg-step-nav')).toBe(sidebar);expect(host.querySelector('.mg-era-intro')).toBe(intro);
  expect(host.querySelector('.mg-lesson h2')?.textContent).toContain('澳门回归');expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  host.querySelector<HTMLButtonElement>('[data-mg-complete]')!.click();guide.showFromUrl();
  expect(host.querySelector('[data-mg-complete]')?.getAttribute('aria-pressed')).toBe('true');expect(host.querySelector('[data-mg-progress]')?.textContent).toContain('1 / 34');
  history.replaceState(null,'','/?modern-guides=');guide.showFromUrl();expect(host.querySelector('.mg-hero')?.textContent).toContain('继续上次 · 澳门回归');
});
it('jumps to the requested body section and returns from prose and originals to the same guide',async()=>{
  const {host,onText}=setup('/?modern-guides=reform&step=hong-kong-return');
  host.querySelector<HTMLAnchorElement>('[data-mg-section=p4]')!.click();
  const href=onText.mock.calls[0][0];expect(new URL(href).hash).toBe('#p4');
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>new Response(readFileSync(`public/data/modern/${url.split('data/modern/')[1]}`,'utf8'))));
  history.replaceState(null,'',href);const readerHost=document.createElement('div');document.body.append(readerHost);
  const onGuide=vi.fn();const reader=createModernTexts(readerHost,{onJourney:vi.fn(),onGuide});await reader.showFromUrl();
  expect(readerHost.querySelector('.mt-highlight')?.getAttribute('data-text-block')).toBe('p4');
  readerHost.querySelector<HTMLAnchorElement>('[data-text-guide]')!.click();
  expect(modernGuideLocation(onGuide.mock.calls[0][0]).step).toBe('hong-kong-return');
  const original=readerHost.querySelector<HTMLAnchorElement>('.mt-related a')!;expect(new URL(original.href).searchParams.get('guide')).toBe('hong-kong-return');
  history.replaceState(null,'',original.href);await reader.showFromUrl();readerHost.querySelector<HTMLAnchorElement>('[data-text-guide]')!.click();
  expect(modernGuideLocation(onGuide.mock.calls[1][0]).step).toBe('hong-kong-return');
  history.replaceState(null,'',modernGuideTextUrl('qingshigao','24','hundred-days','p55'));await reader.showFromUrl();
  expect(readerHost.querySelector('[data-text-guide]')?.getAttribute('href')).toContain('step=hundred-days');
});
it('handles corrupted stored progress and invalid URLs without hiding valid reading routes',()=>{
  localStorage.setItem('historical-nebula:modern-guides:v1','{bad');const {host,guide}=setup('/?modern-guides=invalid&step=bad');
  expect(host.textContent).toContain('没有找到指定导读');expect(host.querySelectorAll('.mg-era-grid article')).toHaveLength(6);
  localStorage.setItem('historical-nebula:modern-guides:v1',JSON.stringify({completed:['wrong','macao-return','macao-return'],recent:'wrong'}));
  guide.showFromUrl();expect(host.querySelector('[data-mg-progress]')?.textContent).toContain('1 / 34');expect(host.querySelector('.mg-hero')?.textContent).not.toContain('继续上次');
});
