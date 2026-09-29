import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { shijiEntities, shijiRelations } from '../src/domain/shiji-data';
import { stories, storyById, type StorySource } from '../src/domain/stories';

const entities = new Map(shijiEntities.map(entity => [entity.id, entity]));
const relations = new Map(shijiRelations.map(relation => [relation.id, relation]));

describe('beginner Chu–Han stories', () => {
  it('offers an ordered route through six existing events with small, coherent scene graphs', () => {
    expect(stories.map(story => story.eventId)).toEqual([
      'shiji-dazexiang', 'shiji-julu', 'shiji-hongmen',
      'shiji-hanxin-appointment', 'shiji-pengcheng', 'shiji-gaixia',
    ]);
    expect(new Set(stories.map(story => story.id)).size).toBe(stories.length);
    for (const story of stories) {
      expect(entities.get(story.eventId)?.kind, story.eventId).toBe('event');
      expect(story.steps.length).toBeGreaterThanOrEqual(2);
      expect(story.steps.length).toBeLessThanOrEqual(3);
      const introducedPeople = new Set(story.people.map(person => person.id));
      for (const person of story.people) {
        expect(entities.get(person.id)?.kind, person.id).toBe('person');
        expect(person.role.length).toBeGreaterThan(5);
      }
      for (const step of story.steps) {
        // 巨鹿的人工资料只收录项羽：一人加中心事件即可表达，不能补造参战者。
        expect(step.personIds.length).toBeGreaterThanOrEqual(1);
        expect(step.personIds.length).toBeLessThanOrEqual(5);
        expect(new Set(step.personIds).size).toBe(step.personIds.length);
        const visibleIds = new Set([story.eventId, ...step.personIds]);
        for (const id of step.personIds) expect(introducedPeople.has(id), id).toBe(true);
        for (const id of step.relationIds) {
          const relation = relations.get(id);
          expect(relation, id).toBeDefined();
          expect(relation?.evidence, id).toBe('record');
          expect(visibleIds.has(relation!.source), `${story.id}: ${id} source`).toBe(true);
          expect(visibleIds.has(relation!.target), `${story.id}: ${id} target`).toBe(true);
          if (id.startsWith('shiji-action-')) expect(relation?.target).toBe(story.eventId);
        }
      }
    }
  });

  it('links every scene to real local original-text paragraphs and includes them in the story sources', () => {
    const volumes = new Map<number, { id: string; kind: string; text: string }[]>();
    const checkSource = (entry: StorySource) => {
      expect(Number.isInteger(entry.volume)).toBe(true);
      expect(entry.volume).toBeGreaterThanOrEqual(1);
      expect(entry.volume).toBeLessThanOrEqual(130);
      expect(entry.block).toMatch(/^p\d+$/);
      if (!volumes.has(entry.volume)) {
        const path = new URL(`../public/data/shiji/${String(entry.volume).padStart(3, '0')}.json`, import.meta.url);
        volumes.set(entry.volume, JSON.parse(readFileSync(path, 'utf8')).blocks);
      }
      const block = volumes.get(entry.volume)!.find(item => item.id === entry.block);
      expect(block, `${entry.volume}/${entry.block}`).toBeDefined();
      expect(block?.kind).toBe('paragraph');
      expect(block!.text.length).toBeGreaterThan(10);
      expect(entry.label.length).toBeGreaterThan(3);
    };
    for (const story of stories) {
      const sources = new Set(story.sources.map(entry => `${entry.volume}/${entry.block}`));
      expect(sources.size).toBeGreaterThan(0);
      story.sources.forEach(checkSource);
      for (const step of story.steps) {
        expect(step.sources.length).toBeGreaterThan(0);
        for (const entry of step.sources) {
          checkSource(entry);
          expect(sources.has(`${entry.volume}/${entry.block}`), `${story.id}: scene source`).toBe(true);
        }
      }
    }
  });

  it('resolves public story ids without falling back for invalid routes', () => {
    expect(storyById('hongmen')?.eventId).toBe('shiji-hongmen');
    expect(storyById('unknown')).toBeUndefined();
    expect(storyById(null)).toBeUndefined();
    expect(storyById({ id: 'hongmen' })).toBeUndefined();
  });
});
