import { journeyEvent, type JourneyEvent } from './history-journey';

export const worldRegions = ['西亚与地中海', '欧洲', '南亚', '东亚', '东南亚', '非洲', '美洲', '跨地区与全球'] as const;
export type WorldRegion = typeof worldRegions[number];
export interface WorldEvent {
  id: string; start: number; year: string; title: string; region: WorldRegion;
  summary: string; significance: string; source: { title: string; url: string };
}
export interface ComparisonPeriod {
  id: string; title: string; years: string; start: number; end: number;
  chinaIds: string[]; question: string;
}
const p = (id: string, title: string, years: string, start: number, end: number, china: string, question: string): ComparisonPeriod =>
  ({ id, title, years, start, end, chinaIds: china.split(' '), question });

// Editorial bins, not universal historical stages. Events spanning bins appear
// once, at their beginning; their full date label remains visible on the card.
export const comparisonPeriods: ComparisonPeriod[] = [
  p('early', '先秦与古代诸国', '约前1100年 — 前222年', -1100, -222,
    'zhou east-zhou shangyang', '从周的诸侯格局、秦的变法，到波斯与孔雀王朝：不同国家怎样组织广阔的疆域？'),
  p('qin-han', '秦汉与罗马', '前221年 — 公元219年', -221, 219,
    'qin-unifies dazexiang hongmen han-founded wenjing wudi xin eastern-han yellow-turbans red-cliffs', '秦汉与罗马都面临治理大国的问题；比较权力如何集中，也要留意制度与社会背景的差别。'),
  p('division', '魏晋南北朝与拜占庭', '220 — 580年', 220, 580,
    'three-kingdoms jin-unifies eastern-jin liu-song southern-qi wei-capital hou-jing north-branches zhou-conquers-qi', '中国经历统一与南北分立时，罗马世界也在重组；两者的转折并不同步。'),
  p('sui-tang', '隋唐五代与亚洲交流', '581 — 959年', 581, 959,
    'sui-unifies sui-falls xuanwu an-lushan five-dynasties later-zhou', '把唐与阿拔斯、吴哥放在同一时段，观察亚洲不同地区的政治与城市中心。'),
  p('song-yuan', '宋辽金元与区域网络', '960 — 1367年', 960, 1367,
    'song-founded chanyuan jin-rises jingkang shaoxing mongols yuan-unifies', '视线从宋辽金元移向非洲：城市、区域政权与贸易并非只在欧亚大陆发展。'),
  p('ming', '明代与跨洋相遇', '1368 — 1643年', 1368, 1643,
    'ming-founded jingnan tumu qing-founded', '明朝的建立、皇位与边防变化，和地中海、跨大西洋的转折，各发生在什么时候？'),
  p('early-modern', '清前期与近代转折', '1644 — 1839年', 1644, 1839,
    'ming-falls qing-consolidation high-qing', '清朝巩固统治的同时，英国动力技术与北美政治制度正在变化；技术变化与政治革命是不同的比较维度。'),
  p('industrial', '晚清与制度改革', '1840 — 1913年', 1840, 1913,
    'opium-war taiping self-strengthening sino-japanese-war hundred-days boxer xinhai beiyang', '将洋务、戊戌与明治维新对照：改革涉及技术、财政还是政治制度？不要只用成败二字概括。'),
  p('world-wars', '民国与世界大战', '1914 — 1948年', 1914, 1948,
    'may-fourth first-united-front northern-expedition mukden war-resistance civil-war', '抗日战争属于世界反法西斯战争；同时看亚洲与欧洲，才能理解战争的不同起点及战后秩序。'),
  p('postwar', '新中国与战后世界', '1949 — 1977年', 1949, 1977,
    'prc-founded korean-war first-five-year great-leap cultural-revolution un-seat', '国家建设、亚非合作与太空探索同处一个时代；比较时同时关注普通人的生活与国际环境。'),
  p('reform', '改革开放与全球联系', '1978 — 2000年', 1978, 2000,
    'reform-opening tiananmen-1989 southern-tour hong-kong-return macao-return', '中国的改革与世界的通信、贸易规则变化如何先后展开？相近年份只是进一步追问的起点。'),
  p('contemporary', '21世纪与共同议题', '2001 — 2024年', 2001, 2024,
    'wto-entry wenchuan beijing-olympics constitution-2018 covid-pandemic change-six', '从加入世贸组织到气候合作、公共卫生与探月，把中国放回相互联系的世界中理解。'),
];
const w = (id: string, start: number, year: string, title: string, region: WorldRegion, summary: string, significance: string, sourceTitle: string, url: string): WorldEvent =>
  ({ id, start, year, title, region, summary, significance, source: { title: sourceTitle, url } });
export const worldEvents: WorldEvent[] = [
  w('persia', -550, '公元前550年起', '阿契美尼德波斯帝国兴起', '西亚与地中海', '居鲁士击败米底，波斯逐步发展为跨越西亚及周边地区的大帝国。', '可比较不同语言、地域与传统之下的帝国治理，不把波斯制度直接等同于中国的郡县制。', '大都会艺术博物馆 · 波斯帝国', 'https://www.metmuseum.org/essays/the-achaemenid-persian-empire-550-330-b-c'),
  w('maurya', -321, '约公元前321 — 前185年', '孔雀王朝与南亚的政治整合', '南亚', '孔雀王朝统治印度次大陆的广阔地区；阿育王时期积极支持佛教。', '南亚是古代世界的重要中心。王朝疆域与宗教传播范围并不完全重合。', '大都会艺术博物馆 · The Year One（南亚章节，PDF）', 'https://resources.metmuseum.org/resources/metpublications/pdf/The_Year_One_Art_of_the_Ancient_World_East_and_West.pdf'),
  w('rome', -27, '公元前27年', '奥古斯都与罗马帝国', '西亚与地中海', '屋大维获得奥古斯都称号，罗马政治进入通常所说的帝国时期。', '罗马保留了一些共和时代的名义与机构。秦汉与罗马可作同期比较，但不是完全相同的制度。', '大都会艺术博物馆 · 罗马帝国', 'https://www.metmuseum.org/essays/the-roman-empire-27-b-c-393-a-d'),
  w('constantinople', 330, '公元330年', '君士坦丁堡成为帝国新都', '西亚与地中海', '君士坦丁将新都设在古拜占庭，后来成为东罗马帝国的政治与文化中心。', '东罗马延续了罗马传统；“拜占庭”是后世常用的历史称呼。', '大都会艺术博物馆 · 拜占庭', 'https://www.metmuseum.org/essays/byzantium-ca-330-1453'),
  w('western-rome', 476, '公元476年', '西罗马皇帝被废黜', '欧洲', '奥多亚塞废黜罗慕路斯·奥古斯都，通常被视作西罗马帝国终结的标志。', '东罗马仍然延续，罗马世界并没有在这一年全部消失。', '大都会艺术博物馆 · 罗马帝国', 'https://www.metmuseum.org/essays/the-roman-empire-27-b-c-393-a-d'),
  w('abbasids', 750, '公元750年起', '阿拔斯王朝与巴格达', '西亚与地中海', '阿拔斯取代倭马亚，政治文化中心向伊拉克移动，762年建立新都巴格达。', '理解唐代的世界，也可以关注亚洲西部的都城、文化与知识活动。', '大都会艺术博物馆 · 阿拔斯时期', 'https://www.metmuseum.org/essays/the-art-of-the-abbasid-period-750-1258'),
  w('angkor', 801, '9 — 15世纪', '吴哥地区的高棉都城', '东南亚', '今天吴哥的遗址群保留了高棉帝国不同时期的都城、寺庙与大型水利设施。', '这是持续数百年的城市发展过程；不能把整片吴哥遗址的建造归到同一年。', '联合国教科文组织 · 吴哥', 'https://whc.unesco.org/en/list/668/'),
  w('great-zimbabwe', 1001, '11 — 15世纪', '大津巴布韦发展为区域中心', '非洲', '绍纳人建设的石构建筑群，见证了非洲南部重要的政治与贸易中心。', '非洲有自身的城市与国家发展历史；遗址不是欧洲人到来之后才出现的。', '联合国教科文组织 · 大津巴布韦', 'https://whc.unesco.org/en/list/364/'),
  w('ottomans', 1453, '1453年', '奥斯曼攻占君士坦丁堡', '西亚与地中海', '奥斯曼军队攻占君士坦丁堡，东罗马帝国结束。', '这是地中海与西亚政治格局的转折，距离西罗马皇帝被废黜已近千年。', '大都会艺术博物馆 · 拜占庭', 'https://www.metmuseum.org/essays/byzantium-ca-330-1453'),
  w('atlantic', 1492, '1492年', '哥伦布抵达加勒比地区', '美洲', '哥伦布的航行把欧洲与加勒比地区带入持续接触，那里原本就有泰诺人等原住民社会。', '跨洋接触伴随殖民征服与深刻的社会变迁；“发现”不能抹去原住民的历史。', '美国国会图书馆 · 1492年的持续影响', 'https://www.loc.gov/exhibits/1492/'),
  w('steam', 1769, '1769年', '瓦特获得分离冷凝器专利', '欧洲', '分离冷凝器减少蒸汽机的燃料消耗，成为蒸汽动力改进的重要一步。', '工业化涉及长期的技术与生产组织变化；瓦特并不是蒸汽机的最初发明者。', '英国科学博物馆 · 瓦特与分离冷凝器', 'https://blog.sciencemuseum.org.uk/james-watt-and-the-separate-condenser/'),
  w('independence', 1776, '1776年', '北美十三殖民地发表独立宣言', '美洲', '大陆会议通过《独立宣言》，宣告脱离英国统治。', '宣告独立和战争结束是不同节点；政治原则的提出也不等于所有人立即获得平等权利。', '美国国家档案馆 · 独立宣言', 'https://www.archives.gov/milestone-documents/declaration-of-independence'),
  w('meiji', 1868, '1868年起', '日本明治维新', '东亚', '幕府统治结束前后，日本建立明治政府，逐步重组国家政治与社会制度。', '与晚清改革对照时，可以分别观察中央与地方关系、军事、财政和教育，而不是把改革当成一个瞬间。', '日本国立国会图书馆 · 近代日本的形成', 'https://www.ndl.go.jp/modern/e/cha1/index.html'),
  w('ww1', 1914, '1914 — 1918年', '第一次世界大战', '跨地区与全球', '由欧洲危机升级的大规模战争，牵动多个大陆的军队、殖民地与社会。', '大战后的国际安排，是理解1919年中国外交争议与五四运动的背景之一。', '帝国战争博物馆 · 第一次世界大战', 'https://www.iwm.org.uk/history/first-world-war'),
  w('ww2', 1939, '1939 — 1945年（欧洲战事起点）', '第二次世界大战全面展开', '跨地区与全球', '德国入侵波兰后欧洲大战爆发；亚洲的侵略与抵抗在此前已经开始，最终汇入全球战争。', '不能用1939年抹去中国此前的抗战。不同战场的起点、经历与代价需要分别理解。', '美国国家二战博物馆 · 二战年表（PDF）', 'https://www.nationalww2museum.org/sites/default/files/2017-07/timeline-full-lesson.pdf'),
  w('un', 1945, '1945年', '联合国成立', '跨地区与全球', '《联合国宪章》于6月签署、10月24日生效，联合国正式成立。', '战后的多边合作为各国提供新的外交平台；其后的冷战仍带来深刻分歧。', '联合国 · 联合国历史', 'https://www.un.org/en/about-us/history-of-the-un'),
  w('partition', 1947, '1947年', '印度、巴基斯坦独立与印巴分治', '南亚', '英国在印度的殖民统治结束，印度与巴基斯坦独立，分治伴随大规模迁徙与暴力。', '去殖民化既是国家独立的过程，也改变了边界、社群与普通人的生活。', '英国国家档案馆 · 英属印度分治', 'https://www.nationalarchives.gov.uk/education/teaching-resources/partition-of-british-india/'),
  w('bandung', 1955, '1955年', '万隆会议：亚非国家的共同发声', '跨地区与全球', '亚非国家代表在印度尼西亚万隆会面，讨论合作、和平与反殖民等问题。', '国际关系不只有大国竞争；新独立国家也在主动组织合作与表达自身诉求。', '联合国教科文组织 · 亚非会议档案（PDF）', 'https://media.unesco.org/sites/default/files/webform/mow001/indonesia_conference_eng.pdf'),
  w('apollo', 1969, '1969年', '阿波罗11号首次载人登月', '美洲', '美国阿波罗11号任务把宇航员送上月球，并带回月球样品。', '这是长期科研与工程协作的成果，也处在冷战时期的太空竞争背景之中。', 'NASA · 阿波罗11号任务', 'https://www.nasa.gov/history/apollo-11-mission-overview/'),
  w('web', 1989, '1989年', '万维网在CERN诞生', '欧洲', '蒂姆·伯纳斯-李在CERN提出万维网，让不同计算机上的信息通过链接相互连接。', '万维网与互联网不是同义词；前者是一种建立在网络之上的信息访问方式。', 'CERN · 万维网的诞生', 'https://home.cern/science/computing/the-birth-of-the-web/'),
  w('wto', 1995, '1995年', '世界贸易组织成立', '跨地区与全球', '世界贸易组织于1月1日成立，接续关贸总协定框架下的贸易合作。', '先读1995年的组织成立，再读中国2001年的加入，可以辨清两个不同节点。', '世界贸易组织 · 25年时间线', 'https://www.wto.org/english/thewto_e/25y_e/25ytimeline_e.htm'),
  w('paris', 2015, '2015年', '《巴黎协定》获通过', '跨地区与全球', '各方在巴黎气候大会上通过协定，围绕共同应对气候变化开展合作。', '全球历史也包括环境与公共议题；协定通过、正式生效和各国落实是不同阶段。', '联合国气候变化框架公约 · 巴黎协定', 'https://www.unfccc.int/process-and-meetings/the-paris-agreement'),
];

export interface ComparisonFilters { period: string; region: string; query: string }
export const defaultComparisonFilters: ComparisonFilters = { period: '', region: '', query: '' };
export function normalizeComparisonFilters(filters: Partial<ComparisonFilters>): ComparisonFilters {
  return {
    period: comparisonPeriods.some(p => p.id === filters.period) ? filters.period! : '',
    region: worldRegions.some(r => r === filters.region) ? filters.region! : '',
    query: (filters.query ?? '').trim().slice(0, 120),
  };
}
export function comparisonFiltersFromUrl(href: string): ComparisonFilters {
  const params = new URL(href).searchParams;
  return normalizeComparisonFilters({ period: params.get('compare') ?? '', region: params.get('region') ?? '', query: params.get('q') ?? '' });
}
export function comparisonUrl(filters: Partial<ComparisonFilters> = {}, base = location.href): string {
  const url = new URL(base), state = normalizeComparisonFilters(filters);
  url.search = ''; url.hash = ''; url.searchParams.set('compare', state.period);
  if (state.region) url.searchParams.set('region', state.region);
  if (state.query) url.searchParams.set('q', state.query);
  return url.href;
}
export function matchesComparisonQuery(event: JourneyEvent | WorldEvent, query: string): boolean {
  const text = [event.year, event.title, event.summary, 'people' in event ? event.people.join(' ') : `${event.region} ${event.significance}`].join(' ').toLocaleLowerCase();
  return text.includes(query.trim().toLocaleLowerCase());
}
export function comparisonRows(filters: Partial<ComparisonFilters> = {}) {
  const { period, region, query } = normalizeComparisonFilters(filters);
  return comparisonPeriods.filter(p => !period || p.id === period).map(period => ({
    period,
    china: period.chinaIds.flatMap(id => { const event = journeyEvent(id); return event ? [event] : []; }),
    world: worldEvents.filter(event => event.start >= period.start && event.start <= period.end && (!region || event.region === region)),
  })).filter(row => (!region || row.world.length > 0) && (!query || [...row.china, ...row.world].some(event => matchesComparisonQuery(event, query))));
}
