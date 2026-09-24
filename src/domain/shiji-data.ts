import type { Action, Entity, Group, Guide, Relation, Source } from './types';

/** 《史记》“楚汉之际”专题的本地示例数据；公元前年份用负整数表示。 */
const source = (id: string, section: string, volume: string, note: string): Source => ({
  id,
  topicId: 'shiji',
  title: '《史记》',
  section,
  url: `https://zh.wikisource.org/wiki/史記/卷${volume}`,
  note: `${note} 链接为维基文库原文转录；事件年份按公元前纪年概括，具体月日仍须结合原文历法核对。`,
});

export const shijiSources: Source[] = [
  source('sj-007', '卷七 · 项羽本纪', '007', '用于巨鹿、鸿门、彭城与垓下的项羽一方叙述。'),
  source('sj-008', '卷八 · 高祖本纪', '008', '用于刘邦一方的入关、楚汉争战与垓下叙述。'),
  source('sj-016', '卷十六 · 秦楚之际月表', '016', '用于前 209 至前 202 年间关键事件的纪年线索。'),
  source('sj-048', '卷四十八 · 陈涉世家', '048', '用于陈胜、吴广在大泽乡起事的记载。'),
  source('sj-055', '卷五十五 · 留侯世家', '055', '用于张良在入关、鸿门及楚汉争战中的行动。'),
  source('sj-092', '卷九十二 · 淮阴侯列传', '092', '用于韩信转投汉军、萧何推荐及拜将的记载。'),
  source('sj-095', '卷九十五 · 樊郦滕灌列传', '095', '用于樊哙进入鸿门宴帐中的记载。'),
];

const action = (
  id: string, title: string, eventId: string, year: number, role: string,
  description: string, sourceIds: string[],
): Action => ({ id, title, eventId, year, role, description, sourceIds });

// 人物与事件复用同一 Action 对象，避免两个视图对同一行动写出不同说法。
const actions: Record<string, Action[]> = {
  'shiji-chen-sheng': [
    action('sj-chen-uprising', '与吴广在大泽乡起事', 'shiji-dazexiang', -209, '起事', '陈胜与吴广率戍卒起事，随后陈胜在陈地称王。', ['sj-048', 'sj-016']),
  ],
  'shiji-wu-guang': [
    action('sj-wu-uprising', '与陈胜在大泽乡起事', 'shiji-dazexiang', -209, '起事', '吴广与陈胜共同组织戍卒起事，史传分别记述两人的行动。', ['sj-048']),
  ],
  'shiji-xiang-yu': [
    action('sj-xiang-julu', '率楚军救赵并在巨鹿破秦军', 'shiji-julu', -207, '统军', '项羽率军渡河救赵，巨鹿一役后诸侯将领归其统率。', ['sj-007', 'sj-016']),
    action('sj-xiang-hongmen', '在鸿门设宴接见刘邦', 'shiji-hongmen', -206, '决策', '项羽接见刘邦；席间范增与项庄的行动也见于项羽本纪。', ['sj-007', 'sj-008']),
    action('sj-xiang-pengcheng', '回师彭城击败汉军', 'shiji-pengcheng', -205, '统军', '刘邦进入彭城后，项羽回师并击败汉军。', ['sj-007', 'sj-008']),
    action('sj-xiang-gaixia', '在垓下战败后离开战场', 'shiji-gaixia', -202, '交战', '项羽在垓下与汉及诸侯军交战失利，之后突围东走。', ['sj-007', 'sj-008']),
  ],
  'shiji-liu-bang': [
    action('sj-liu-hongmen', '赴鸿门会见项羽', 'shiji-hongmen', -206, '会见', '刘邦赴鸿门解释入关后的行动，随后返回军中。', ['sj-007', 'sj-008']),
    action('sj-liu-appointment', '听取萧何推荐并拜韩信为大将', 'shiji-hanxin-appointment', -206, '任命', '进入汉中后，刘邦依萧何的推荐任命韩信为大将。', ['sj-092']),
    action('sj-liu-pengcheng', '进入彭城后遭楚军击败', 'shiji-pengcheng', -205, '交战', '刘邦率汉及诸侯军进入彭城，项羽回军后汉军败退。', ['sj-007', 'sj-008']),
    action('sj-liu-gaixia', '与诸侯军在垓下击楚', 'shiji-gaixia', -202, '统军', '刘邦与诸侯军会合，在垓下同项羽军决战。', ['sj-008']),
  ],
  'shiji-fan-zeng': [
    action('sj-fanzeng-hongmen', '在宴席上促请对刘邦采取行动', 'shiji-hongmen', -206, '进言', '范增在席间示意项羽，并安排项庄入席舞剑。', ['sj-007']),
  ],
  'shiji-zhang-liang': [
    action('sj-zhang-hongmen', '随刘邦赴宴并在席间联络樊哙', 'shiji-hongmen', -206, '周旋', '张良随刘邦赴鸿门，在军门告知樊哙席间情势；樊哙随后入帐。', ['sj-007', 'sj-055']),
  ],
  'shiji-fan-kuai': [
    action('sj-fankuai-hongmen', '闯入宴席护卫刘邦', 'shiji-hongmen', -206, '护卫', '樊哙持盾进入帐中，向项羽陈说刘邦入关后的情况。', ['sj-007', 'sj-095']),
  ],
  'shiji-han-xin': [
    action('sj-hanxin-appointment', '经萧何推荐受拜大将', 'shiji-hanxin-appointment', -206, '受命', '韩信转投汉军后，经萧何推荐，被刘邦拜为大将。', ['sj-092']),
    action('sj-hanxin-gaixia', '率军参加垓下之战', 'shiji-gaixia', -202, '统军', '高祖本纪记载韩信在垓下列阵，参与击败项羽军。', ['sj-008']),
  ],
  'shiji-xiao-he': [
    action('sj-xiaohe-appointment', '追还并推荐韩信', 'shiji-hanxin-appointment', -206, '推荐', '韩信离去后，萧何追还韩信，向刘邦力荐其为大将。', ['sj-092']),
  ],
  'shiji-xiang-zhuang': [
    action('sj-xiangzhuang-hongmen', '在宴席中舞剑', 'shiji-hongmen', -206, '参与', '范增安排项庄入席舞剑，项羽本纪写明其意在攻击刘邦。', ['sj-007']),
  ],
};

/** start/end 只指本专题所收录的活动年份，不是人物生卒年。 */
const person = (
  id: string, name: string, aliases: string[], group: Group, role: string,
  start: number, end: number, summary: string, description: string, sourceIds: string[],
): Entity => ({
  id, topicId: 'shiji', name, aliases, kind: 'person', group, role, start, end,
  period: `专题活动 · 公元前 ${-start === -end ? -start : `${-start}—${-end}`} 年`,
  summary, description, actions: actions[id] ?? [], sourceIds,
});

const people: Entity[] = [
  person('shiji-chen-sheng', '陈胜', ['陈涉', '陳勝', '陳涉'], 'neutral', '起事者', -209, -209,
    '与吴广在大泽乡率戍卒起事。',
    '陈涉世家详记大泽乡起事与陈胜在陈地称王的过程。此处展示史传中的行动，不用后世口号概括全部动因。', ['sj-048', 'sj-016']),
  person('shiji-wu-guang', '吴广', ['吴叔', '吳廣', '吳叔'], 'neutral', '共同起事者', -209, -209,
    '与陈胜共同组织大泽乡起事。',
    '陈涉世家将吴广列为共同起事者，记录其在戍卒中组织和行动的细节。', ['sj-048']),
  person('shiji-xiang-yu', '项羽', ['项籍', '西楚霸王', '項羽', '項籍'], 'chu', '楚军统帅', -207, -202,
    '从巨鹿救赵到垓下战败，是楚汉争战的关键人物。',
    '项羽本纪记述巨鹿、鸿门、彭城和垓下等阶段。不同事件中的军事胜负与政治决策需要分别阅读。', ['sj-007', 'sj-016']),
  person('shiji-liu-bang', '刘邦', ['沛公', '汉王', '高祖', '劉邦'], 'han', '汉军领袖', -206, -202,
    '赴鸿门会见项羽，随后与楚军持续争战。',
    '高祖本纪提供刘邦一方对鸿门、彭城、垓下的叙述；与项羽本纪并读，才能看出两种视角的差异。', ['sj-008', 'sj-007']),
  person('shiji-fan-zeng', '范增', ['亚父', '亞父'], 'chu', '项羽谋士', -206, -206,
    '在鸿门宴上主张对刘邦采取行动。',
    '项羽本纪记述范增在宴席上的催促与对项庄的安排。其行动是有记载的，不以传说补写心理动机。', ['sj-007']),
  person('shiji-zhang-liang', '张良', ['留侯', '子房', '張良'], 'han', '刘邦谋士', -206, -206,
    '在鸿门宴席中为刘邦周旋。',
    '留侯世家与项羽本纪记述张良在鸿门阶段的应对。本节点只标示已收录的宴席行动，不代表他的全部经历。', ['sj-055', 'sj-007']),
  person('shiji-fan-kuai', '樊哙', ['舞阳侯', '樊噲'], 'han', '刘邦部将', -206, -206,
    '在鸿门宴中进入帐内护卫刘邦。',
    '樊郦滕灌列传与项羽本纪均记其闯入宴席。将行动显示为史传记载，不替人物添加戏剧化台词。', ['sj-095', 'sj-007']),
  person('shiji-han-xin', '韩信', ['淮阴侯', '淮陰侯', '韓信'], 'han', '汉军将领', -206, -202,
    '经萧何推荐受拜大将，后来率军参与垓下决战。',
    '淮阴侯列传记述其转投汉军与受拜大将；高祖本纪提供垓下阵列中的记载。', ['sj-092', 'sj-008']),
  person('shiji-xiao-he', '萧何', ['酂侯', '蕭何'], 'han', '汉军决策参与者', -206, -206,
    '追还韩信并向刘邦举荐。',
    '淮阴侯列传对萧何追荐韩信有专门叙述。这里仅展示本专题所涉及的拜将阶段。', ['sj-092']),
  person('shiji-xiang-zhuang', '项庄', ['項莊'], 'chu', '项羽部下', -206, -206,
    '受范增安排在鸿门宴席中舞剑。',
    '项羽本纪记载项庄在宴席中的具体行动。其节点用于查看鸿门局势，不扩展为未经来源支持的长期关系。', ['sj-007']),
];

const event = (
  id: string, name: string, aliases: string[], role: string,
  start: number, end: number, summary: string, description: string, sourceIds: string[],
): Entity => ({
  id, topicId: 'shiji', name, aliases, kind: 'event', group: 'neutral', role, start, end,
  period: `公元前 ${-start === -end ? -start : `${-start}—${-end}`} 年 · 楚汉之际`,
  summary, description, sourceIds,
  actions: Object.values(actions).flat().filter(item => item.eventId === id),
});

export const shijiEntities: Entity[] = [
  event('shiji-hongmen', '鸿门宴', ['鸿门之会', '鴻門宴', '鴻門之會'], '入关后的会见与抉择', -206, -206,
    '刘邦赴鸿门会见项羽，范增、张良、樊哙等人的行动在同一宴席交汇。',
    '项羽本纪和高祖本纪从不同视角记述这次会见。这里把刘邦赴宴、范增进言、项庄舞剑、张良周旋、樊哙进入帐中拆成可追溯的行动，不把后世演绎混入史料。', ['sj-007', 'sj-008', 'sj-055', 'sj-095']),
  ...people,
  event('shiji-dazexiang', '大泽乡起义', ['陈胜吴广起义', '大澤鄉起義'], '秦末起事', -209, -209,
    '陈胜、吴广率戍卒起事，秦末局势由此出现新变化。',
    '陈涉世家记载戍卒遇雨、误期与陈胜吴广的起事。年表将陈涉起兵列在秦二世元年，即公元前 209 年。', ['sj-048', 'sj-016']),
  event('shiji-julu', '巨鹿之战', ['巨鹿', '鉅鹿之戰'], '楚军救赵', -207, -207,
    '项羽率楚军救赵，在巨鹿一带击破秦军。',
    '项羽本纪详记渡河救赵的行动；秦楚之际月表将巨鹿大破秦军列入公元前 207 年。此节点只概括这次军事行动。', ['sj-007', 'sj-016']),
  event('shiji-hanxin-appointment', '韩信拜将', ['萧何荐韩信', '蕭何月下追韓信', '韓信拜將'], '汉中用人', -206, -206,
    '萧何追回并推荐韩信，刘邦拜韩信为大将。',
    '淮阴侯列传保存韩信离开、萧何追还和刘邦任命的记载。该故事与鸿门之后的汉中阶段有关，年份为专题概括。', ['sj-092']),
  event('shiji-pengcheng', '彭城之战', ['彭城', '彭城之戰'], '楚汉正面交战', -205, -205,
    '刘邦进入彭城后，项羽回师击败汉军。',
    '项羽本纪、高祖本纪分别记述彭城战事。它发生在鸿门会见之后，不能把宴席关系直接延续为此时的合作或对抗标签。', ['sj-007', 'sj-008', 'sj-016']),
  event('shiji-gaixia', '垓下之战', ['垓下', '垓下決戰', '垓下之戰'], '楚汉决战', -202, -202,
    '刘邦与诸侯军会合，韩信率军参战，项羽在垓下战败。',
    '高祖本纪记阵列及战况，项羽本纪记项羽突围与后续。两篇并读可区分战场经过与人物结局。', ['sj-007', 'sj-008', 'sj-016']),
];

const politicalEvents = new Set(['shiji-hongmen', 'shiji-hanxin-appointment']);
const participation: Relation[] = people.flatMap(person => person.actions.map(item => ({
  id: `shiji-action-${item.id}`,
  topicId: 'shiji' as const,
  source: person.id,
  target: item.eventId,
  label: item.role,
  category: (politicalEvents.has(item.eventId) ? 'political' : 'military') as Relation['category'],
  evidence: 'record' as const,
  start: item.year,
  end: item.year,
  context: item.description,
  sourceIds: item.sourceIds,
})));

export const shijiRelations: Relation[] = [
  ...participation,
  { id: 'shiji-chen-wu-209', topicId: 'shiji', source: 'shiji-chen-sheng', target: 'shiji-wu-guang', label: '共同起事', category: 'political', evidence: 'record', start: -209, end: -209, context: '陈胜与吴广共同组织大泽乡戍卒起事。这里只指这次共同行动。', sourceIds: ['sj-048'] },
  { id: 'shiji-fan-xiang-206', topicId: 'shiji', source: 'shiji-fan-zeng', target: 'shiji-xiang-yu', label: '席间进言', category: 'political', evidence: 'record', start: -206, end: -206, context: '范增在鸿门宴上向项羽示意，要求对刘邦采取行动。', sourceIds: ['sj-007'] },
  { id: 'shiji-fan-zhuang-206', topicId: 'shiji', source: 'shiji-fan-zeng', target: 'shiji-xiang-zhuang', label: '安排舞剑', category: 'political', evidence: 'record', start: -206, end: -206, context: '范增安排项庄在席间舞剑。', sourceIds: ['sj-007'] },
  { id: 'shiji-zhang-fankuai-206', topicId: 'shiji', source: 'shiji-zhang-liang', target: 'shiji-fan-kuai', label: '告知席间情势', category: 'political', evidence: 'record', start: -206, end: -206, context: '鸿门宴形势紧张时，张良在军门告知樊哙，樊哙随后主动进入帐中。', sourceIds: ['sj-007', 'sj-095'] },
  { id: 'shiji-xiao-han-206', topicId: 'shiji', source: 'shiji-xiao-he', target: 'shiji-han-xin', label: '追还举荐', category: 'political', evidence: 'record', start: -206, end: -206, context: '萧何追还韩信并向刘邦力荐其为大将。', sourceIds: ['sj-092'] },
  { id: 'shiji-liu-han-206', topicId: 'shiji', source: 'shiji-liu-bang', target: 'shiji-han-xin', label: '拜为大将', category: 'political', evidence: 'record', start: -206, end: -206, context: '刘邦听取萧何推荐后拜韩信为大将。', sourceIds: ['sj-092'] },
  { id: 'shiji-xiang-liu-206', topicId: 'shiji', source: 'shiji-xiang-yu', target: 'shiji-liu-bang', label: '鸿门会见', category: 'political', evidence: 'record', start: -206, end: -206, context: '刘邦赴鸿门与项羽会见；该边只表示这次会见，不概括后续关系。', sourceIds: ['sj-007', 'sj-008'] },
  { id: 'shiji-xiang-liu-205', topicId: 'shiji', source: 'shiji-xiang-yu', target: 'shiji-liu-bang', label: '彭城交战', category: 'military', evidence: 'record', start: -205, end: -205, context: '项羽回师彭城击败刘邦所率汉军；与鸿门会见分开建边。', sourceIds: ['sj-007', 'sj-008'] },
  { id: 'shiji-hongmen-pengcheng-context', topicId: 'shiji', source: 'shiji-hongmen', target: 'shiji-pengcheng', label: '局势继续变化', category: 'influence', evidence: 'interpretation', start: -206, end: -205, context: '编辑解释：鸿门会见和彭城交战属于不同时段，叙事上可以前后阅读，不能仅由先后关系推断直接因果。', sourceIds: ['sj-007', 'sj-008'] },
  { id: 'shiji-appointment-gaixia-context', topicId: 'shiji', source: 'shiji-hanxin-appointment', target: 'shiji-gaixia', label: '任将后的行动', category: 'influence', evidence: 'interpretation', start: -206, end: -202, context: '编辑解释：拜将和垓下参战显示韩信在汉军中的不同阶段；中间还有长期战事，不能把两个节点当作连续的一场行动。', sourceIds: ['sj-092', 'sj-008'] },
  { id: 'shiji-pengcheng-gaixia-context', topicId: 'shiji', source: 'shiji-pengcheng', target: 'shiji-gaixia', label: '战局延续', category: 'influence', evidence: 'interpretation', start: -205, end: -202, context: '编辑解释：彭城失利与垓下决战之间跨越多年，本边提示继续沿时间探索，不声称单一事件决定最终结果。', sourceIds: ['sj-007', 'sj-008'] },
];

export const shijiGuides: Guide[] = [
  { id: 'shiji-intro', topicId: 'shiji', title: '从鸿门走进《史记》', subtitle: '同一宴席，不同人物的行动', duration: '约 4 分钟', steps: [
    { title: '先看会见', question: '鸿门宴上有哪些独立行动？', entityId: 'shiji-hongmen', description: '先看事件，再展开人物与关系；同一宴席不等于所有人目的相同。' },
    { title: '观察项羽', question: '决策者与进言者的行动有什么区别？', entityId: 'shiji-xiang-yu', description: '项羽接见刘邦，范增与项庄另有行动，逐条查看来源。' },
    { title: '追踪张良', question: '张良如何应对宴席局势？', entityId: 'shiji-zhang-liang', description: '看他与樊哙的联系，再打开留侯世家并读。' },
    { title: '看后续变化', question: '鸿门会见能说明后来的战局吗？', entityId: 'shiji-pengcheng', description: '切换到前 205 年的彭城，比较会见与交战的不同关系。' },
    { title: '抵达垓下', question: '谁在最后一场战事中承担什么行动？', entityId: 'shiji-gaixia', description: '结合刘邦、韩信和项羽的记载阅读垓下，不把结局压缩成单一人物的故事。' },
  ] },
  { id: 'shiji-timeline', topicId: 'shiji', title: '七年间的局势转折', subtitle: '由起事、救赵到楚汉决战', duration: '约 3 分钟', steps: [
    { title: '前 209 年', question: '故事为何从陈胜与吴广开始？', entityId: 'shiji-dazexiang', description: '陈涉世家和秦楚之际月表提供秦末起事的两类线索。' },
    { title: '前 207 年', question: '巨鹿改变了项羽怎样的处境？', entityId: 'shiji-julu', description: '观察救赵战事，并注意它与鸿门宴不在同一年。' },
    { title: '前 206 年', question: '汉中又出现了怎样的用人决策？', entityId: 'shiji-hanxin-appointment', description: '对照萧何推荐与韩信受拜的行动。' },
    { title: '前 205 年', question: '彭城反映了哪一阶段的关系？', entityId: 'shiji-pengcheng', description: '项羽与刘邦之间建立的是当年交战边，不覆盖此前的鸿门会见。' },
    { title: '前 202 年', question: '最后还需要哪些人物和军队？', entityId: 'shiji-gaixia', description: '读垓下与双方本纪，理解楚汉争战的收束。' },
  ] },
];
