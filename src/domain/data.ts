import type { Action, Entity, Group, Guide, Relation, Source } from './types';
import { shijiEntities, shijiGuides, shijiRelations, shijiSources } from './shiji-data';

/** Local prototype material, not an editorially approved historical corpus. */
export const CONTENT_VERSION = 'topics-local-draft-2026-09-24';

const source = (id: string, section: string, volume: string, note: string): Source => ({
  id, title: '《三国志》', section,
  url: `https://zh.wikisource.org/zh-hans/三國志/卷${volume}`,
  note: `${note} 本页为公开原文转录，示例摘要与纪年尚待正式审校；正文与裴注应分别阅读。`,
});

const chibiSources: Source[] = [
  source('sgz-01', '卷一 · 武帝纪', '01', '用于曹操南征、赤壁退军及建安纪年。'),
  source('sgz-06', '卷六 · 刘表传', '06', '用于刘表、刘琦、刘琮与荆州形势。'),
  source('sgz-09', '卷九 · 曹仁传', '09', '用于南郡守军与曹仁。'),
  source('sgz-32', '卷三十二 · 先主传', '32', '用于刘备南撤、联合孙权与荆州交涉。'),
  source('sgz-35', '卷三十五 · 诸葛亮传', '35', '用于诸葛亮出使孙权；不引入借东风等文学情节。'),
  source('sgz-36', '卷三十六 · 关羽、张飞、赵云传', '36', '用于长坂行动与关羽在荆州的活动。'),
  source('sgz-47', '卷四十七 · 吴主传', '47', '用于孙权决策、孙策交接与建安二十年的荆州交涉。'),
  source('sgz-54-zhou', '卷五十四 · 周瑜传', '54', '用于作战部署、黄盖火攻建议及南郡战事；不同记载对作用的叙述有差异。'),
  source('sgz-54-lu', '卷五十四 · 鲁肃传', '54', '用于联络刘备、荆州交涉，以及未精确系年的赠粮记载。'),
  source('sgz-54-meng', '卷五十四 · 吕蒙传', '54', '用于乌林、南郡及建安二十四年的荆州战事。'),
  source('sgz-55', '卷五十五 · 程普、黄盖、甘宁传', '55', '用于各将参与的具体行动，避免把同阵营等同于私人关系。'),
];

const action = (id: string, title: string, eventId: string, year: number, role: string, description: string, sourceIds: string[]): Action =>
  ({ id, title, eventId, year, role, description, sourceIds });

// These objects are shared by the person and event views. Do not duplicate the prose.
const actions: Record<string, Action[]> = {
  'zhou-yu': [
    action('zhou-chibi', '与程普等领军迎战', 'chibi', 208, '统军', '孙权遣周瑜、程普等与刘备合力迎战曹操；周瑜传详载火攻部署。', ['sgz-54-zhou', 'sgz-32']),
    action('zhou-nanjun', '继续进攻南郡', 'nanjun', 209, '统军', '赤壁战后与曹仁相持，组织救援夷陵等行动。战事跨越 208—209 年，此处按结束年归入。', ['sgz-54-zhou']),
  ],
  'huang-gai': [action('huang-chibi', '建议并参与火攻', 'chibi', 208, '执行', '针对曹军船舰相连提出火攻，借诈降接近敌船。这里只采用史传中的行动，不加入苦肉计情节。', ['sgz-54-zhou', 'sgz-55'])],
  'cheng-pu': [
    action('cheng-chibi', '与周瑜协同领军', 'chibi', 208, '统军', '程普传记载与周瑜为左右督，在乌林击败曹军。', ['sgz-55']),
    action('cheng-nanjun', '参与南郡战事', 'nanjun', 209, '参与', '赤壁之后继续进攻南郡，与周瑜等共同作战。', ['sgz-55']),
  ],
  'lu-su': [
    action('lu-alliance', '联络刘备共商应对', 'sun-liu-alliance', 208, '联络', '奉孙权命赴荆州，途中与刘备会面，促成共同应对曹操的联络。', ['sgz-54-lu', 'sgz-32']),
    action('lu-dispute', '就荆州争议与关羽会谈', 'jingzhou-dispute', 215, '交涉', '孙刘争夺荆州郡县时，与关羽相约会谈。会谈内容须结合双方记载阅读。', ['sgz-54-lu']),
  ],
  'sun-quan': [
    action('sun-alliance', '决定联合刘备', 'sun-liu-alliance', 208, '决策', '在曹操南下的形势中接见使者，决定派军与刘备共同迎战。', ['sgz-35', 'sgz-47']),
    action('sun-chibi', '派周瑜、程普等领军', 'chibi', 208, '决策', '孙权负责决策与派遣；本样本不把他标作赤壁前线统帅。', ['sgz-47', 'sgz-32']),
    action('sun-dispute', '索取郡县并重新议定边界', 'jingzhou-dispute', 215, '交涉', '围绕荆州郡县与刘备发生争执，随后双方重新议定分界。', ['sgz-47', 'sgz-32']),
    action('sun-campaign', '部署向荆州进军', 'jingzhou-campaign', 219, '决策', '趁关羽北上之际部署攻取荆州，与赤壁时期的共同作战关系形成对照。', ['sgz-47', 'sgz-54-meng']),
  ],
  'liu-bei': [
    action('liu-changban', '长坂受追击后南撤', 'changban', 208, '撤退', '在当阳长坂遭曹军追击，后与关羽船队及刘琦部会合。', ['sgz-32']),
    action('liu-alliance', '遣诸葛亮出使孙权', 'sun-liu-alliance', 208, '决策', '在曹军南下时派遣诸葛亮与孙权联系，寻求共同抵御曹操。', ['sgz-32', 'sgz-35']),
    action('liu-chibi', '与孙权军共同作战', 'chibi', 208, '参与', '先主传记载刘备与孙权所遣水军合力作战，并在战后向南郡推进。', ['sgz-32']),
    action('liu-dispute', '与孙权交涉荆州分界', 'jingzhou-dispute', 215, '交涉', '在郡县争执与军事对峙后，与孙权重新划定双方控制范围。', ['sgz-32', 'sgz-47']),
  ],
  'zhuge-liang': [action('zhuge-alliance', '出使孙权商议联合', 'sun-liu-alliance', 208, '使者', '代表刘备向孙权陈说形势。史传中的外交行动与后世文学中的法术情节须分开。', ['sgz-35'])],
  'cao-cao': [
    action('cao-surrender', '南征并接受刘琮归降', 'jingzhou-surrender', 208, '进军', '南下荆州，接受刘琮归降，随后继续向南推进。', ['sgz-01', 'sgz-06']),
    action('cao-changban', '追击刘备至长坂', 'changban', 208, '追击', '率精骑追及刘备于当阳长坂，取得其部分人众与辎重。', ['sgz-32']),
    action('cao-chibi', '在赤壁交战后北撤', 'chibi', 208, '交战', '武帝纪记载赤壁交战不利与疾疫后撤；周瑜传侧重火攻经过，两者提供不同叙述视角。', ['sgz-01', 'sgz-54-zhou']),
  ],
  'guan-yu': [
    action('guan-changban', '率船队与刘备会合', 'changban', 208, '接应', '先主传记载刘备转向汉津，与关羽船队会合渡沔水。', ['sgz-32']),
    action('guan-dispute', '就荆州问题与鲁肃会谈', 'jingzhou-dispute', 215, '交涉', '在双方对峙的背景下参与会谈，不以这次行动推断长期私人交情。', ['sgz-54-lu']),
    action('guan-campaign', '北上作战时后方失守', 'jingzhou-campaign', 219, '受影响', '关羽北攻曹仁期间，孙权部进取其后方。该事件与樊城战场相互关联。', ['sgz-36', 'sgz-54-meng']),
  ],
  'zhang-fei': [action('zhang-changban', '在长坂断后', 'changban', 208, '掩护', '张飞传记载其率少量骑兵据水断桥，为刘备撤离争取条件。', ['sgz-36'])],
  'zhao-yun': [action('zhao-changban', '保护刘备家属脱险', 'changban', 208, '护卫', '赵云传记载其在当阳长坂保护幼主与甘夫人脱险。', ['sgz-36'])],
  'cao-ren': [action('caoren-nanjun', '在江陵抵御进攻', 'nanjun', 209, '守御', '南郡战事中与周瑜军相持。曹仁传与周瑜传分别保存交战双方的叙述。', ['sgz-09', 'sgz-54-zhou'])],
  'gan-ning': [action('gan-nanjun', '进据夷陵并等待援军', 'nanjun', 209, '先遣', '受周瑜派遣进入夷陵，被曹仁军围困后得到救援。', ['sgz-55', 'sgz-54-meng'])],
  'lv-meng': [
    action('meng-chibi', '与周瑜等攻破曹军', 'chibi', 208, '参与', '吕蒙传记载其与周瑜、程普等在乌林击败曹军，随后进攻南郡。', ['sgz-54-meng']),
    action('meng-nanjun', '提出分兵救援夷陵', 'nanjun', 209, '谋划', '建议留兵守后方，与周瑜救援甘宁。战事按 208—209 年整体阅读。', ['sgz-54-meng']),
    action('meng-campaign', '率军进取荆州', 'jingzhou-campaign', 219, '执行', '率军沿江推进，夺取关羽控制地区；具体部署见吕蒙传。', ['sgz-54-meng']),
  ],
  'liu-cong': [action('liucong-surrender', '继任后向曹操归降', 'jingzhou-surrender', 208, '归降', '刘表去世后继任，在曹军南下时向曹操归降。', ['sgz-06', 'sgz-01'])],
  'liu-qi': [action('liuqi-changban', '与南撤的刘备会合', 'changban', 208, '会合', '先主传记载刘备与江夏太守刘琦部会合，共同前往夏口。', ['sgz-32'])],
};

/** start/end are coverage years for this topic, NOT a person's life dates. */
const person = (id: string, name: string, aliases: string[], group: Group, role: string, start: number, end: number, summary: string, description: string, sourceIds: string[]): Entity => ({
  id, name, aliases, kind: 'person', group, role, start, end,
  period: `专题活动 · ${start === end ? start : `${start}—${end}`} 年`,
  summary, description, actions: actions[id] ?? [], sourceIds,
});

const people: Entity[] = [
  person('zhou-yu', '周瑜', ['公瑾', '周郎'], 'wu', '孙权军统帅', 198, 210, '统领水军，在赤壁与刘备军合力迎战曹操。', '从军事部署看赤壁：周瑜与程普等领军，黄盖参与火攻，战后继续争夺南郡。胜负需要结合联合决策、兵力状态与作战条件理解。', ['sgz-54-zhou']),
  person('huang-gai', '黄盖', ['公覆'], 'wu', '火攻建议与执行者', 208, 208, '提出火攻方案，参与赤壁作战。', '周瑜传记载黄盖观察曹军船舰相连，提出火攻并利用诈降接近。苦肉计等文学叙事不作为本样本的史实行动。', ['sgz-54-zhou', 'sgz-55']),
  person('cheng-pu', '程普', ['德谋', '程公'], 'wu', '与周瑜协同领军', 208, 209, '与周瑜为左右督，参与乌林及南郡战事。', '程普传保存了他的协同统军记录。观察同一战事中不同人物的职责，可以避免把集体行动归于一人。', ['sgz-55']),
  person('lu-su', '鲁肃', ['子敬'], 'wu', '联络与交涉者', 208, 215, '联络刘备，推动联合；后来参与荆州交涉。', '鲁肃的行动贯穿结盟与争议两个阶段。208 年联络刘备、215 年与关羽会谈应作为不同情境阅读。', ['sgz-54-lu']),
  person('sun-quan', '孙权', ['仲谋', '孙仲谋'], 'wu', '江东决策者', 200, 219, '在曹操南下时决定与刘备共同迎战。', '孙权决定派遣周瑜等领军。此后的荆州争执与战事显示，合作是具体时期的政治选择，不能等同于永久阵营。', ['sgz-47']),
  person('liu-bei', '刘备', ['玄德', '刘玄德', '先主'], 'shu', '联盟参与者', 208, 219, '长坂南撤后联络孙权，共同抵御曹操。', '由长坂到赤壁，刘备的行动从撤退、寻求联合转为共同作战。战后双方围绕荆州的关系继续变化。', ['sgz-32']),
  person('zhuge-liang', '诸葛亮', ['孔明', '诸葛孔明'], 'shu', '刘备使者', 208, 208, '出使孙权，说明形势并寻求联合。', '在本专题中，诸葛亮的可追踪行动主要是外交出使。依据诸葛亮传阅读其陈说，避免用后世故事代替史料。', ['sgz-35']),
  person('cao-cao', '曹操', ['孟德', '曹孟德', '武帝'], 'wei', '南征军统帅', 208, 219, '南下荆州，在赤壁与孙刘军交战后撤退。', '武帝纪突出交战不利与疾疫，周瑜传详述火攻。两种记载应并读，不能只用一个因素解释全局。', ['sgz-01', 'sgz-54-zhou']),
  person('guan-yu', '关羽', ['云长', '关云长'], 'shu', '刘备部将', 208, 219, '由汉津接应到荆州交涉，连接多个阶段。', '关羽在刘备南撤时率船会合，后来参与荆州交涉，219 年又面临后方失守。这里按行动展示，不把关系固定为好友或敌人。', ['sgz-36', 'sgz-32']),
  person('zhang-fei', '张飞', ['益德', '张益德', '翼德'], 'shu', '长坂断后者', 208, 208, '在长坂撤退中率骑兵断后。', '张飞传记载据水断桥与阻拦追兵。其行动属于刘备撤退过程中的一环，不等同于赤壁战场上的前线行动。', ['sgz-36']),
  person('zhao-yun', '赵云', ['子龙', '赵子龙'], 'shu', '长坂护卫者', 208, 208, '在当阳长坂保护刘备家属脱险。', '赵云传对这次保护行动有简短记载；本样本不加入七进七出等后世扩写。', ['sgz-36']),
  person('cao-ren', '曹仁', ['子孝'], 'wei', '江陵守将', 208, 209, '在赤壁后续的南郡战事中抵御周瑜。', '南郡战事是赤壁之后另一个持续作战阶段。曹仁传和周瑜传可对照阅读，区分各自叙述的重点。', ['sgz-09', 'sgz-54-zhou']),
  person('gan-ning', '甘宁', ['兴霸'], 'wu', '夷陵先遣将领', 208, 209, '在南郡战事中进据夷陵，得到周瑜等救援。', '夷陵行动使南郡战事呈现前进、围困与救援的协同过程，适合继续展开周瑜与吕蒙的行动。', ['sgz-55', 'sgz-54-meng']),
  person('lv-meng', '吕蒙', ['子明', '吕子明'], 'wu', '孙权部将', 208, 219, '参与乌林与南郡战事，后领军进取荆州。', '吕蒙在 208—209 年与周瑜等共同作战，219 年参与对关羽后方的进军。两段活动所属的联盟局面不同。', ['sgz-54-meng']),
  person('liu-biao', '刘表', ['景升'], 'neutral', '荆州牧', 208, 208, '其去世后的荆州交接，是南征局势的重要背景。', '刘表在 208 年去世，刘琮继任。父子身份、地方政权交接与归降曹操是三种不同事实，不应合并成一种关系。', ['sgz-06']),
  person('liu-cong', '刘琮', [], 'neutral', '荆州继任者', 208, 208, '在曹军南下时向曹操归降。', '刘琮继承刘表的荆州势力后归降曹操，影响了刘备南撤与孙权的决策环境。此处保持中性描述，不替历史人物判定动机。', ['sgz-06', 'sgz-01']),
  person('liu-qi', '刘琦', [], 'neutral', '江夏太守', 208, 208, '与从长坂南撤的刘备部会合。', '刘琦是刘表之子。先主传记载刘备在汉津会合关羽船队后，又与刘琦部一道前往夏口。', ['sgz-06', 'sgz-32']),
  person('sun-ce', '孙策', ['伯符', '孙伯符'], 'wu', '江东前任领袖', 198, 200, '与周瑜合作，去世后由孙权承接其事业。', '通过孙策可以回看周瑜与孙权所处的前史。该节点不是赤壁参战者，时间筛选应把前史关系与 208 年的行动分开。', ['sgz-54-zhou', 'sgz-47']),
];

const event = (id: string, name: string, aliases: string[], role: string, start: number, end: number, summary: string, description: string, sourceIds: string[]): Entity => ({
  id, name, aliases, kind: 'event', group: 'neutral', role, start, end,
  period: `${start === end ? start : `${start}—${end}`} 年 · 东汉建安年间`,
  summary, description, sourceIds,
  actions: Object.values(actions).flat().filter(item => item.eventId === id),
});

const chibiEntities: Entity[] = [
  event('chibi', '赤壁之战', ['赤壁', '乌林之战', '烏林之戰'], '联合、决策与作战', 208, 208,
    '公元 208 年，孙权、刘备联合抵御曹操。一次战役，连接起不同的选择。',
    '曹操取得荆州后继续南进，孙权派周瑜、程普等与刘备合力迎战。周瑜传详述黄盖所提火攻，武帝纪记载交战不利与疾疫。曹军撤退后，南郡争夺继续。兵力数字、战役地点与各方贡献须结合不同材料讨论。', ['sgz-01', 'sgz-32', 'sgz-54-zhou', 'sgz-55']),
  ...people,
  event('sun-liu-alliance', '孙刘联合', ['孙刘联盟', '孫劉聯合'], '外交与联合决策', 208, 208,
    '鲁肃联络、诸葛亮出使，促成双方共同应对曹操。',
    '刘备南撤后，鲁肃与其会面，诸葛亮出使孙权。双方由外交接触走向共同出兵。本事件范围限于 208 年的联合行动，不宣称此后合作始终不变。', ['sgz-32', 'sgz-35', 'sgz-54-lu']),
  event('changban', '长坂之战', ['长坂', '長坂', '当阳长坂', '长阪'], '追击与撤退', 208, 208,
    '曹操追击刘备，南撤队伍经历分散与重新会合。',
    '长坂发生在赤壁之前。由刘备、张飞、赵云、关羽与刘琦的行动，可以分别看到追击、断后、护卫和水路会合；不要把这些地点与赤壁混为一场战斗。', ['sgz-32', 'sgz-36']),
  event('jingzhou-surrender', '刘琮归降', ['荆州归降', '荊州歸降'], '地方势力交接', 208, 208,
    '刘表去世后，刘琮继任，并向南下的曹操归降。',
    '荆州的权力交接改变了各方所处条件。归降与随后的长坂、赤壁属于彼此关联但各有参与者与时间范围的事件。', ['sgz-06', 'sgz-01']),
  event('nanjun', '南郡之战', ['江陵之战', '南郡争夺', '南郡之戰'], '赤壁之后的持续作战', 208, 209,
    '周瑜等与曹仁在南郡相持，战事延续到次年。',
    '赤壁后周瑜继续进攻曹仁。甘宁先据夷陵，吕蒙提出救援安排。南郡争夺表明赤壁不是全部战事的终点；事件按 208—209 年标示，人物行动按材料归入相关年份。', ['sgz-54-zhou', 'sgz-54-meng', 'sgz-09', 'sgz-55']),
  event('jingzhou-dispute', '荆州交涉', ['湘水划界', '荆州争议', '荊州交涉'], '郡县争执与重新议定', 215, 215,
    '孙刘双方围绕荆州郡县发生争执，随后重新议定分界。',
    '孙权索取郡县，刘备与关羽参与应对，鲁肃与关羽会谈。争执、军事对峙与重新议定可以同时存在，不能只用友好或敌对概括整年。', ['sgz-32', 'sgz-47', 'sgz-54-lu']),
  event('jingzhou-campaign', '荆州战事', ['吕蒙袭荆州', '白衣渡江', '荊州戰事'], '联盟关系的变化', 219, 219,
    '关羽北攻期间，孙权派军进取荆州后方。',
    '吕蒙等沿江进军，关羽控制的后方地区失守。与 208 年共同迎战曹操相比，各方行动关系已明显变化；该节点只呈现这一阶段，完整过程仍需进一步扩充材料。', ['sgz-54-meng', 'sgz-36', 'sgz-47']),
];

const participation: Relation[] = people.flatMap(person => person.actions.map(item => ({
  id: `action-${item.id}`, source: person.id, target: item.eventId, label: item.role,
  category: (['sun-liu-alliance', 'jingzhou-dispute', 'jingzhou-surrender'].includes(item.eventId) ? 'political' : 'military') as Relation['category'],
  evidence: 'record' as const, start: item.year, end: item.year, context: item.description, sourceIds: item.sourceIds,
})));

const chibiRelations: Relation[] = [
  ...participation,
  { id: 'sun-liu-208', source: 'sun-quan', target: 'liu-bei', label: '联合迎敌', category: 'political', evidence: 'record', start: 208, end: 208, context: '208 年共同应对曹操南征。此日期表示本次有记载的行动，不将合作默认为全年或永久有效。', sourceIds: ['sgz-32', 'sgz-47'] },
  { id: 'sun-liu-215', source: 'sun-quan', target: 'liu-bei', label: '争议与议定', category: 'political', evidence: 'record', start: 215, end: 215, context: '围绕荆州郡县争执后重新议定分界。与 208 年的联军行动分别建边。', sourceIds: ['sgz-32', 'sgz-47'] },
  { id: 'sun-guan-219', source: 'sun-quan', target: 'guan-yu', label: '进攻后方', category: 'military', evidence: 'record', start: 219, end: 219, context: '孙权在关羽北上作战时，派吕蒙等向其控制地区进军。', sourceIds: ['sgz-47', 'sgz-54-meng'] },
  { id: 'sun-zhou-208', source: 'sun-quan', target: 'zhou-yu', label: '派遣统军', category: 'military', evidence: 'record', start: 208, end: 208, context: '孙权遣周瑜、程普等与刘备共同迎战曹操。方向表示派遣者指向领军者。', sourceIds: ['sgz-32', 'sgz-47'] },
  { id: 'zhou-huang-208', source: 'huang-gai', target: 'zhou-yu', label: '提出火攻', category: 'military', evidence: 'record', start: 208, end: 208, context: '黄盖向周瑜提出火攻方案。提案、同意与执行属于协同过程。', sourceIds: ['sgz-54-zhou'] },
  { id: 'zhou-cheng-208', source: 'zhou-yu', target: 'cheng-pu', label: '协同统军', category: 'military', evidence: 'record', start: 208, end: 209, context: '程普传记载二人为左右督，共同参与乌林和南郡战事；本边是这两段记载的范围汇总，不意味着每天持续共同行动。', sourceIds: ['sgz-55'] },
  { id: 'liu-zhuge-208', source: 'liu-bei', target: 'zhuge-liang', label: '遣使联络', category: 'political', evidence: 'record', start: 208, end: 208, context: '刘备派诸葛亮出使孙权。', sourceIds: ['sgz-32', 'sgz-35'] },
  { id: 'lu-liu-208', source: 'lu-su', target: 'liu-bei', label: '商议联合', category: 'political', evidence: 'record', start: 208, end: 208, context: '鲁肃途中与刘备会面，商议共同应对南下曹军。', sourceIds: ['sgz-54-lu', 'sgz-32'] },
  { id: 'cao-liu-208', source: 'cao-cao', target: 'liu-bei', label: '长坂追击', category: 'military', evidence: 'record', start: 208, end: 208, context: '曹军追及刘备于当阳长坂。本边只指该次军事行动。', sourceIds: ['sgz-32'] },
  { id: 'zhou-caoren-209', source: 'zhou-yu', target: 'cao-ren', label: '南郡交战', category: 'military', evidence: 'record', start: 208, end: 209, context: '赤壁之后在南郡持续作战，最终曹仁撤离。', sourceIds: ['sgz-54-zhou', 'sgz-09'] },
  { id: 'lu-guan-215', source: 'lu-su', target: 'guan-yu', label: '会谈交涉', category: 'political', evidence: 'record', start: 215, end: 215, context: '在荆州争议中相约会谈，关系标签不推断私人友谊。', sourceIds: ['sgz-54-lu'] },
  { id: 'ce-zhou-198', source: 'sun-ce', target: 'zhou-yu', label: '授职领兵', category: 'political', evidence: 'record', start: 198, end: 198, context: '建安三年，孙策迎周瑜归吴，授建威中郎将并给兵。该边属于赤壁之前的关系。', sourceIds: ['sgz-54-zhou'] },
  { id: 'ce-quan-200', source: 'sun-ce', target: 'sun-quan', label: '交接事务', category: 'political', evidence: 'record', start: 200, end: 200, context: '吴主传记建安五年孙策去世，以事授权。', sourceIds: ['sgz-47'] },
  { id: 'biao-cong-family', source: 'liu-biao', target: 'liu-cong', label: '父子', category: 'family', evidence: 'record', start: null, end: null, uncertain: true, context: '刘表与刘琮的父子关系有记载，但本样本未提供完整起止日期，因此进入日期待考分组，不用于证明某年的政治合作。', sourceIds: ['sgz-06'] },
  { id: 'biao-qi-family', source: 'liu-biao', target: 'liu-qi', label: '父子', category: 'family', evidence: 'record', start: null, end: null, uncertain: true, context: '刘琦为刘表长子。关系本身有记载，样本未收录可供年份筛选的完整起止日期。', sourceIds: ['sgz-06', 'sgz-32'] },
  { id: 'lu-zhou-grain', source: 'lu-su', target: 'zhou-yu', label: '赠粮相助', category: 'political', evidence: 'record', start: null, end: null, uncertain: true, context: '鲁肃传记周瑜任居巢长时求粮，鲁肃赠粮。此处未把记载强行系于单一年份；待考指日期，不否认文本中有该记载。', sourceIds: ['sgz-54-lu'] },
  { id: 'alliance-chibi-context', source: 'sun-liu-alliance', target: 'chibi', label: '联合提供条件', category: 'influence', evidence: 'interpretation', start: 208, end: 208, context: '编辑解释：联络与共同出兵为联合迎战提供条件，但不能据此断言联盟是胜负的唯一原因。', sourceIds: ['sgz-32', 'sgz-35', 'sgz-54-zhou'] },
  { id: 'chibi-nanjun-context', source: 'chibi', target: 'nanjun', label: '后续战事', category: 'influence', evidence: 'interpretation', start: 208, end: 209, context: '编辑解释：两段战事在叙事上连续，但南郡有自己的地点、参与行动与持续时间，不能被压缩为赤壁火攻的一瞬。', sourceIds: ['sgz-54-zhou', 'sgz-55'] },
  { id: 'surrender-changban-context', source: 'jingzhou-surrender', target: 'changban', label: '南撤背景', category: 'influence', evidence: 'interpretation', start: 208, end: 208, context: '编辑解释：荆州权力交接是理解刘备南撤的背景之一；时间先后本身不证明唯一因果。', sourceIds: ['sgz-01', 'sgz-32'] },
];

const chibiGuides: Guide[] = [
  { id: 'chibi-intro', title: '一场赤壁，六种选择', subtitle: '由战役进入人物的具体行动', duration: '约 4 分钟', steps: [
    { title: '先看全局', question: '一场战役，只有一位主角吗？', entityId: 'chibi', description: '从统军、外交、执行和退军等行动开始。选中节点先读摘要，展开关系可以保留当前中心。' },
    { title: '联合的决定', question: '孙权为什么需要作出选择？', entityId: 'sun-quan', description: '查看派军与联合的记录。孙权负责决策，不等于亲自在前线指挥每个行动。' },
    { title: '统军与协同', question: '周瑜与哪些人共同完成作战？', entityId: 'zhou-yu', description: '观察程普、黄盖及后续南郡行动，把协同过程分开阅读。' },
    { title: '火攻的行动', question: '史传中的黄盖做了什么？', entityId: 'huang-gai', description: '打开来源看火攻提案与诈降记载，区别后世文学中的苦肉计。' },
    { title: '换一个记载视角', question: '曹操一方的记录强调了什么？', entityId: 'cao-cao', description: '并读武帝纪与周瑜传，留意疾疫、退军和火攻的不同叙述重点。' },
  ] },
  { id: 'alliance-path', title: '联盟是如何形成的', subtitle: '跟随联络、使者与共同出兵', duration: '约 3 分钟', steps: [
    { title: '从撤退开始', question: '刘备是在什么处境下寻求联合？', entityId: 'changban', description: '看追击与南撤，以及人物分别承担的接应和护卫行动。' },
    { title: '联络的桥梁', question: '鲁肃如何把两方联系起来？', entityId: 'lu-su', description: '只依据会面与商议的记载建立联系，不因立场接近推断私人关系。' },
    { title: '使者的职责', question: '诸葛亮在这个阶段的角色是什么？', entityId: 'zhuge-liang', description: '从诸葛亮传的出使记录理解其外交行动。' },
    { title: '决策者', question: '联络之后，谁决定派军？', entityId: 'sun-quan', description: '查看孙权派遣周瑜、程普等领军的关系。' },
    { title: '走向共同作战', question: '一次联合意味着永久合作吗？', entityId: 'sun-liu-alliance', description: '此事件只覆盖 208 年。继续沿时间探索，了解荆州争议如何改变双方行动。' },
  ] },
  { id: 'changing-relations', title: '关系会随时间改变', subtitle: '从 208 年的联合走向荆州局势', duration: '约 4 分钟', steps: [
    { title: '208 年的合作', question: '这一年的合作指向什么目标？', entityId: 'sun-liu-alliance', description: '合作标签有具体事项和日期，不能代替长期关系的全部。' },
    { title: '战后的继续', question: '赤壁之后，战事结束了吗？', entityId: 'nanjun', description: '南郡战事跨越 208—209 年，展示事件区间与人物行动年份的区别。' },
    { title: '215 年的交涉', question: '同一对人物怎样同时争执和谈判？', entityId: 'jingzhou-dispute', description: '查看孙刘郡县争执、鲁肃与关羽会谈以及重新议定分界。' },
    { title: '行动的变化', question: '吕蒙在不同年份扮演了哪些角色？', entityId: 'lv-meng', description: '比较与周瑜共同作战和向荆州进军，避免把人物颜色理解为永久关系。' },
    { title: '219 年的新局面', question: '为什么要给每条关系保留日期？', entityId: 'jingzhou-campaign', description: '先按 208 年，再按 219 年应用筛选。同一人物仍可阅读完整经历，活动网络则随日期改变。' },
  ] },
];

export const entities: Entity[] = [...chibiEntities, ...shijiEntities];
export const relations: Relation[] = [...chibiRelations, ...shijiRelations];
export const sources: Source[] = [...chibiSources, ...shijiSources];
export const guides: Guide[] = [...chibiGuides, ...shijiGuides];
