import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { Converter } from 'opencc-js/t2cn';
import { dynasticBooks } from '../src/domain/dynastic-library';
import { historyBookGuides, historyGuideSteps, historyGuideLocation, historyGuideUrl, historyGuideSourceUrl, sourceHistoryGuide } from '../src/domain/history-guides';

const simplify = Converter({ from: 'tw', to: 'cn' });
it('gives every added history a distinct introduction and verified, book-specific original passages', () => {
  expect(historyBookGuides.map(item => item.book).sort()).toEqual(dynasticBooks.map(item => item.id).sort());
  expect(new Set(historyBookGuides.map(item => item.background)).size).toBe(23);
  for (const guide of historyBookGuides) {
    const steps = historyGuideSteps(guide.book);
    expect(steps.length, guide.book).toBeGreaterThan(0);
    expect(guide.question.length).toBeGreaterThan(12);
    expect(guide.connection.length).toBeGreaterThan(30);
    expect(guide.approach.length).toBeGreaterThan(30);
    expect(guide.terms.length).toBeGreaterThan(0);
    for (const id of guide.related) expect(id === 'shiji' || historyBookGuides.some(item => item.book === id)).toBe(true);
    for (const step of steps) for (const source of step.sources) {
      expect(source.book).toBe(guide.book);
      const chapter = JSON.parse(readFileSync(`public/data/histories/${guide.book}/${String(source.volume).padStart(3, '0')}.json`, 'utf8'));
      const block = chapter.blocks.find((item: { id: string }) => item.id === source.block);
      expect(block?.kind, `${guide.book}/${source.volume}/${source.block}`).toBe('paragraph');
      expect(simplify(block.text)).toContain(source.cue);
      const link = historyGuideSourceUrl(guide.book, step.event.id, source, 'https://example.com/read/?journey=old#old');
      expect(sourceHistoryGuide(link)).toEqual({ book: guide.book, event: step.event, source });
      expect(historyGuideLocation(historyGuideUrl(guide.book, step.event.id, link))).toEqual({ book: guide.book, step: step.event.id });
    }
  }
});
it('recovers malformed guide links and refuses unrelated original-return contexts', () => {
  expect(historyGuideLocation('https://example.com/?histories=bad&step=wenjing')).toEqual({ book: '', step: '' });
  expect(historyGuideLocation('https://example.com/?histories=mingshi&step=bad')).toEqual({ book: 'mingshi', step: 'ming-founded' });
  expect(historyGuideLocation('https://example.com/?histories=mingshi&step=wenjing').step).toBe('ming-founded');
  expect(sourceHistoryGuide('https://example.com/?library=mingshi&volume=24&guide=ming-falls#p1')).toBeNull();
  expect(sourceHistoryGuide('https://example.com/?library=songshi&volume=24&guide=ming-falls#p6')).toBeNull();
  expect(sourceHistoryGuide('https://example.com/?library=mingshi&volume=24&guide=bad#p6')).toBeNull();
  const otherSource = historyGuideSteps('songshi')[0].sources[0];
  expect(historyGuideSourceUrl('mingshi', 'ming-founded', otherSource, 'https://example.com/?library=old#p5')).toBe('https://example.com/?histories=mingshi&step=ming-founded');
});
