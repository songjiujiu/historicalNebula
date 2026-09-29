import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Converter } from 'opencc-js/t2cn';

const simplify = Converter({ from: 'tw', to: 'cn' });
const clean = s => simplify(String(s ?? '').replace(/〖[=+;•%&@^*!?~]?([^〗]*)〗/g, '$1').replace(/[〖〗]/g, ''));
const normalized = s => clean(s).replace(/[^\p{Script=Han}\d]/gu, '');
const sourceId = v => `sj-${String(v).padStart(3, '0')}`;
const chapterId = v => `shiji-chapter-${String(v).padStart(3, '0')}`;
const eventId = id => `shiji-event-${id}`;
const personId = name => `shiji-person-${createHash('sha256').update(name).digest('hex').slice(0, 16)}`;
const provenance = { project: '史记知识库', author: '鲍捷及项目贡献者', url: 'https://github.com/baojie/shiji-kb', commit: '6b836e3fac1b900ccc6e9299fd6896c0e18ec132', license: 'CC BY-NC-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/', importedAt: '2026-09-29', files: {} };
const expectedHashes = {
  events: '26918f0501c7e762d7b49f709bde2c830491509851850b3fc1f828395bf6797b',
  entities: '3200fe390dedd2568e2dfa218e042111346f7e45e5188b971d983f8c3e41ada7',
  relations: '39212d8f9cd66b6f1411fc41da3042bb17bd8e0163088912a98a07d889070468',
};
async function input(name) {
  const bytes = await readFile(`data/shiji-graph/${name}.json`);
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== expectedHashes[name]) throw new Error(`Source checksum mismatch: ${name}`);
  provenance.files[name] = hash;
  return JSON.parse(bytes);
}
const metro = await input('events');
const index = await input('entities');
const eventRelations = await input('relations');
const manifest = JSON.parse(await readFile('src/domain/generated/shiji-manifest.json', 'utf8'));
const chapters = manifest.chapters;
const corpus = new Map(await Promise.all(chapters.map(async c => [c.volume, JSON.parse(await readFile(`public/data/shiji/${String(c.volume).padStart(3, '0')}.json`, 'utf8')).blocks.map(b => ({ id: b.id, normalized: normalized(b.text) }))])));
const existing = { '刘邦': 'shiji-liu-bang', '项羽': 'shiji-xiang-yu', '陈胜': 'shiji-chen-sheng', '吴广': 'shiji-wu-guang', '张良': 'shiji-zhang-liang', '韩信': 'shiji-han-xin', '萧何': 'shiji-xiao-he', '樊哙': 'shiji-fan-kuai', '范增': 'shiji-fan-zeng', '项庄': 'shiji-xiang-zhuang' };
// Only explicitly identified historical aliases are merged here; generic titles are not identities.
const canonical = { '陈涉': '陈胜', '嬴政': '秦始皇', '帝颛顼': '颛顼', '尧': '唐尧', '帝尧': '唐尧', '虞舜': '舜', '帝舜': '舜', '帝禹': '禹', '项籍': '项羽' };
const canonicalName = name => canonical[name] ?? name;
const people = new Map();
for (const [rawName, raw] of Object.entries(index.person)) {
  const name = canonicalName(rawName);
  const volumes = [...new Set(raw.refs.map(r => Number(r[0].slice(0, 3))).filter(v => v >= 1 && v <= 130))];
  if (!volumes.length) throw new Error(`Unreferenced person ${name}`);
  const person = people.get(name) ?? { id: existing[name] ?? personId(name), name, aliases: new Set([name]), volumes: new Set(), mentions: 0, years: [] };
  for (const alias of [rawName, ...raw.aliases]) person.aliases.add(alias);
  for (const volume of volumes) person.volumes.add(volume);
  person.mentions += raw.count;
  people.set(name, person);
}
const aliasTargets = new Map();
for (const person of people.values()) for (const alias of person.aliases) {
  const values = aliasTargets.get(alias) ?? new Set(); values.add(person.name); aliasTargets.set(alias, values);
}
let newPeople = 0;
function resolvePerson(raw, volume) {
  const name = canonicalName(raw);
  let person = people.get(name);
  const options = aliasTargets.get(name);
  if (!person && options?.size === 1) person = people.get([...options][0]);
  if (!person) {
    // An event's literal name is retained independently when disambiguation is unavailable.
    person = { id: personId(name), name, aliases: new Set([name]), volumes: new Set(), mentions: 0, years: [] };
    people.set(name, person); newPeople++;
  }
  person.volumes.add(volume);
  return person;
}
const nodes = [];
const edges = [];
const events = metro.lines.flatMap(line => line.stations);
if (metro.lines.length !== 130 || new Set(events.map(e => e.id)).size !== events.length) throw new Error('Incomplete or duplicate event input');
const eventById = new Map(events.map(e => [e.id, e]));
const relationTypes = { cross_ref: '跨篇互见', co_person: '共同提及人物', concurrent: '同期线索', co_location: '共同地点', sequel: '后续叙事', causal: '因果解释', opposition: '对立叙事', part_of: '事件包含', cross_causal: '跨篇因果解释' };
function yearOf(event) {
  // Upstream ancient dates are conventional estimates, not securely established years.
  return Number.isInteger(event.year) && event.year >= -841 && event.year < 0 ? event.year : null;
}
function uncertain(event) { return yearOf(event) === null || /约|推|估|\[/.test(event.time_raw); }
function addEdge(id, source, target, label, category, evidence, start, end, context, sourceIds, dateUncertain = false) {
  edges.push({ id, topicId: 'shiji', source, target, label, category, evidence, start, end, ...(dateUncertain ? { uncertain: true } : {}), context, sourceIds, imported: true });
}
for (const c of chapters) nodes.push({ id: chapterId(c.volume), topicId: 'shiji', name: c.title, aliases: [c.originalTitle, `卷${c.volume}`, `史记卷${c.volume}`], kind: 'chapter', group: 'neutral', role: `《史记》${c.category} · 卷 ${c.volume}`, period: '篇章索引 · 不对应单一年份', start: null, end: null, summary: `《史记》卷 ${c.volume}《${c.title}》，全文、人物与事件的共同入口。`, description: '篇章连线表示出处索引，不代表人物之间有历史互动。点击阅读全文可核对原文。', actions: [], sourceIds: [c.sourceId], imported: true });
let matchedQuotes = 0;
for (const event of events) {
  const volume = Number(event.chapter);
  const year = yearOf(event);
  const quote = clean(event.quote);
  const needle = normalized(quote);
  const matches = needle.length >= 12 ? corpus.get(volume).filter(b => b.normalized.includes(needle.slice(0, Math.min(36, needle.length)))) : [];
  const block = matches.length === 1 ? matches[0].id : undefined;
  if (block) matchedQuotes++;
  const date = year === null ? '时间待考' : `${uncertain(event) ? '约 ' : ''}公元前 ${-year} 年`;
  const personIds = [...new Set(event.people.map(n => resolvePerson(n, volume).id))];
  nodes.push({ id: eventId(event.id), topicId: 'shiji', name: clean(event.name), aliases: [event.id], kind: 'event', group: 'neutral', role: `${event.type} · 机器整理待审校`, period: date, start: year, end: year, summary: clean(event.description) || `《${event.chapter_name}》中的${event.type}条目，摘要尚待补充，请阅读原文。`, description: `知识库事件 ${event.id}，原索引段落 ${event.para_pos || '未提供'}。年代原标注：${event.time_raw || '未提供'}。${quote ? `原文摘录：${quote}` : '此条暂缺原文摘录，可打开对应卷核对。'}`, actions: [], sourceIds: [sourceId(volume)], imported: true, dateUncertain: uncertain(event), ...(block ? { readingBlock: block } : {}) });
  // People listed in an event are textual associations, not inferred participant actions.
  for (const id of personIds) addEdge(`sj-mention-${event.id}-${id}`, id, eventId(event.id), '事件提及', 'textual', 'index', year, year, `机器索引：在“${clean(event.name)}”的记录中提及此人；不据此推断其实际参与或立场。${quote ? `原文：${quote}` : '尚需核对原文。'}`, [sourceId(volume)], uncertain(event));
  addEdge(`sj-chapter-event-${event.id}`, chapterId(volume), eventId(event.id), '篇章收录事件', 'textual', 'index', null, null, '按事件索引建立的篇章出处，可打开本卷核对。', [sourceId(volume)]);
  if (year !== null) for (const raw of event.people) resolvePerson(raw, volume).years.push(year);
}
for (const person of people.values()) {
  const volumes = [...person.volumes].sort((a, b) => a - b);
  // Mentions in later retrospective chapters are not a person's lifespan; dates remain unknown.
  nodes.push({ id: person.id, topicId: 'shiji', name: person.name, aliases: [...person.aliases], kind: 'person', group: 'neutral', role: '全书人物词条 · 机器整理待审校', period: '活动年代待考 · 非生卒年', start: null, end: null, summary: `全书索引在 ${volumes.length} 卷中收录“${person.name}”的名称线索。`, description: `来自史记知识库人物索引，保留名称和别名供检索。异名、同名及称谓可能仍有歧义，应结合具体卷和原文辨认；不以提及年代推定人物生卒年。`, actions: [], sourceIds: volumes.map(sourceId), imported: true });
  for (const volume of volumes) addEdge(`sj-chapter-person-${volume}-${person.id}`, person.id, chapterId(volume), '篇章提及人物', 'textual', 'index', null, null, '人物名称在该篇章的机器索引中出现；篇章关联不是人物间的历史关系。', [sourceId(volume)]);
}
for (const [i, relation] of eventRelations.relations.entries()) {
  const from = eventById.get(relation.source); const to = eventById.get(relation.target);
  if (!from || !to || !relationTypes[relation.type]) throw new Error(`Unresolved event relation ${i}`);
  const a = yearOf(from); const b = yearOf(to);
  const textual = ['cross_ref', 'co_person', 'co_location', 'concurrent'].includes(relation.type);
  addEdge(`sj-kb-relation-${relation.type}-${relation.source}-${relation.target}`, eventId(from.id), eventId(to.id), relationTypes[relation.type], textual ? 'textual' : 'influence', textual ? 'index' : 'interpretation', a === null || b === null ? null : Math.min(a, b), a === null || b === null ? null : Math.max(a, b), `机器整理，待审校。${clean(relation.reason) || `依据${relationTypes[relation.type]}建立阅读线索，不能据此认定真实因果或互动。`}`, [...new Set([sourceId(Number(from.chapter)), sourceId(Number(to.chapter))])], uncertain(from) || uncertain(to));
}
// Deduplicate identical source/target/type IDs; fail on conflicting definitions.
const uniqueEdges = new Map();
for (const edge of edges) { const prev = uniqueEdges.get(edge.id); if (prev && JSON.stringify(prev) !== JSON.stringify(edge)) throw new Error(`Conflicting edge ${edge.id}`); uniqueEdges.set(edge.id, edge); }
const nodeIds = new Set(nodes.map(n => n.id));
if (nodeIds.size !== nodes.length || [...uniqueEdges.values()].some(e => !nodeIds.has(e.source) || !nodeIds.has(e.target))) throw new Error('Broken graph references');
const report = { chapters: 130, people: people.size, events: events.length, relations: uniqueEdges.size, matchedQuotes, eventsMissingQuotes: events.filter(e => !e.quote).length, additionalEventNames: newPeople, uncertainEvents: events.filter(uncertain).length, categories: Object.fromEntries(['military', 'political', 'family', 'influence', 'textual'].map(c => [c, [...uniqueEdges.values()].filter(e => e.category === c).length])) };
// Column encoding and a string pool keep the complete graph small on the wire.
const strings = []; const stringIds = new Map();
const intern = value => { if (!stringIds.has(value)) { stringIds.set(value, strings.length); strings.push(value); } return stringIds.get(value); };
const packedNodes = nodes.map(n => [intern(n.id), intern(n.name), n.aliases.map(intern), ['person','event','chapter'].indexOf(n.kind), intern(n.role), intern(n.period), n.start, n.end, intern(n.summary), intern(n.description), n.sourceIds.map(intern), n.dateUncertain ? 1 : 0, n.readingBlock ?? '']);
const packedEdges = [...uniqueEdges.values()].map(e => [intern(e.id), intern(e.source), intern(e.target), intern(e.label), ['military','political','family','influence','textual'].indexOf(e.category), ['record','interpretation','index'].indexOf(e.evidence), e.start, e.end, intern(e.context), e.sourceIds.map(intern), e.uncertain ? 1 : 0]);
await writeFile('src/domain/generated/shiji-graph.json', JSON.stringify({ strings, nodes: packedNodes, relations: packedEdges }) + '\n');
await writeFile('src/domain/generated/shiji-graph-report.json', JSON.stringify({ provenance, ...report }, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
