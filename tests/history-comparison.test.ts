import { expect, it } from 'vitest';
import { journeyEvents } from '../src/domain/history-journey';
import { comparisonFiltersFromUrl, comparisonPeriods, comparisonRows, comparisonUrl, worldEvents, worldRegions } from '../src/domain/world-history';

it('connects every dated Chinese event exactly once and keeps uncertain legends out of exact bins', () => {
  const ids = comparisonPeriods.flatMap(period => period.chinaIds);
  expect(new Set(ids).size).toBe(ids.length);
  expect([...ids].sort()).toEqual(journeyEvents.filter(event => event.id !== 'xia').map(event => event.id).sort());
  expect(comparisonRows().flatMap(row => row.china).map(event => event.id).sort()).toEqual([...ids].sort());
});
it('uses ordered continuous bins and sourced world events with unambiguous identities', () => {
  expect(new Set(worldEvents.map(event => event.id)).size).toBe(worldEvents.length);
  for (const [index, period] of comparisonPeriods.entries()) {
    if (index) expect(period.start).toBe(comparisonPeriods[index - 1].end + 1);
    expect(comparisonRows({ period: period.id })[0].world.length).toBeGreaterThan(0);
  }
  for (const event of worldEvents) {
    expect(comparisonPeriods.filter(period => event.start >= period.start && event.start <= period.end)).toHaveLength(1);
    expect(worldRegions).toContain(event.region);
    expect(new URL(event.source.url).protocol).toBe('https:');
    expect(event.source.title.length).toBeGreaterThan(4);
  }
  expect(comparisonRows({ period: 'qin-han' })[0].world.map(event => event.id)).toContain('rome');
  expect(comparisonRows({ period: 'division' })[0].china.map(event => event.id)).toContain('three-kingdoms');
});
it('finds either side while keeping contemporary context and applying region filters only to world events', () => {
  const roman = comparisonRows({ query: '屋大维' });
  expect(roman).toHaveLength(1);
  expect(roman[0].china.some(event => event.id === 'qin-unifies')).toBe(true);
  expect(comparisonRows({ query: '刘邦' })[0].world.some(event => event.id === 'rome')).toBe(true);
  const africa = comparisonRows({ region: '非洲' });
  expect(africa).toHaveLength(1);
  expect(africa[0].world.map(event => event.id)).toEqual(['great-zimbabwe']);
  expect(africa[0].china.some(event => event.id === 'song-founded')).toBe(true);
  expect(comparisonRows({ region: '非洲', query: '刘邦' })).toHaveLength(0);
});
it('shares filters safely and falls back from invalid period/region without preserving unrelated routes', () => {
  const url = comparisonUrl({ period: 'qin-han', region: '西亚与地中海', query: '罗马 & 汉' }, 'https://history.test/sub/?journey=x#shiji/6');
  expect(comparisonFiltersFromUrl(url)).toEqual({ period: 'qin-han', region: '西亚与地中海', query: '罗马 & 汉' });
  expect(new URL(url).pathname).toBe('/sub/');
  expect(new URL(url).hash).toBe('');
  expect(new URL(url).searchParams.has('journey')).toBe(false);
  expect(comparisonFiltersFromUrl('https://history.test/?compare=bad&region=bad')).toEqual({ period: '', region: '', query: '' });
});
