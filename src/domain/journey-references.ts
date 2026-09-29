/** External reading references, checked 2026-09-29. These are links, not a locally imported corpus. */
export interface JourneyReference {
  id: string; title: string; publisher: string; url: string; locator: string;
  kind: '博物馆资料' | '大学教学资料' | '机构史料' | '档案专题' | '文件原文' | '机构记录';
  language?: '英文'; format?: 'PDF';
}
const r = (id: string, title: string, publisher: string, url: string, locator: string, kind: JourneyReference['kind'], language?: '英文', format?: 'PDF'): JourneyReference => ({ id, title, publisher, url, locator, kind, language, format });
export const journeyReferences: JourneyReference[] = [
  r('qing-foundation', '顺治皇帝：清朝建立与入关', '故宫博物院', 'https://www.dpm.org.cn/court/lineage/226262.html', '建国号为大清', '博物馆资料'),
  r('qing-capital', '清廷迁都北京', '故宫博物院', 'https://www.dpm.org.cn/court/event/159873.html', '清朝开始迁都', '博物馆资料'),
  r('kangxi', '康熙皇帝：按年查看清初大事', '故宫博物院', 'https://www.dpm.org.cn/court/lineage/226256.html', '三藩之乱彻底平定', '博物馆资料'),
  r('qing-society', '清代国家与人口增长', '哥伦比亚大学 Asia for Educators', 'https://afe.easia.columbia.edu/qing/state.html', 'Population Growth During the Qing Dynasty and Its Effects', '大学教学资料', '英文'),
  r('opium', '第一次鸦片战争与条约体系', '美国国务院历史办公室', 'https://history.state.gov/milestones/1830-1860/china-1', 'Treaty of Nanjing', '机构史料', '英文'),
  r('taiping', '太平天国战争', '哥伦比亚大学 Asia for Educators', 'https://afe.easia.columbia.edu/special/china_1750_taiping.htm', 'Taiping Rebellion', '大学教学资料', '英文'),
  r('late-qing-reform', '从改革到革命，1842—1911', '哥伦比亚大学 Asia for Educators', 'https://afe.easia.columbia.edu/special/china_1750_reform.htm', 'self strengthening', '大学教学资料', '英文'),
  r('national-museum-modern', '近代中国的变革与探索', '中国国家博物馆', 'https://www.chnmuseum.cn/yj/xscg/xslw/201812/t20181224_36444.shtml', '马关条约', '博物馆资料'),
  r('boxer', '义和团战争与美国海军，1900—1901', '美国海军历史与遗产司令部', 'https://www.history.navy.mil/research/library/online-reading-room/title-list-alphabetically/b/boxer-rebellion-usnavy-1900-1901.html', '1901', '机构史料', '英文'),
  r('revolution-1911', '1911年中国革命', '美国国务院历史办公室', 'https://history.state.gov/milestones/1899-1913/chinese-rev', 'February of 1912', '机构史料', '英文'),
  r('may-fourth', '周恩来编写的《警厅拘留记》手稿', '中国国家博物馆', 'https://www.chnmuseum.cn/zp/zpml/gmww/202112/t20211208_252795.shtml', '1919年5月4日', '博物馆资料'),
  r('ccp-founded', '中国共产党第一次全国代表大会通过的党纲', '中国国家博物馆', 'https://www.chnmuseum.cn/zp/zpml/gmww/202112/t20211214_253216.shtml', '1921年7月23日', '博物馆资料'),
  r('united-front', '孙中山手批国民党一大各委员会名单', '中国国家博物馆', 'https://www.chnmuseum.cn/zp/zpml/gmww/202209/t20220907_257288.shtml', '第一次国共合作', '博物馆资料'),
  r('northern-expedition', '上海工人三次武装起义时用的空心铁棍', '中国国家博物馆', 'https://www.chnmuseum.cn/zp/zpml/gmww/202104/t20210407_249608.shtml', '1926年9月至1927年3月', '博物馆资料'),
  r('war-resistance', '抗日根据地的创建与发展', '中国人民抗日战争纪念馆', 'https://www.1937china.com/kzgdata/clzl/ztzl/qqzt2020/', '1931年9月18日', '博物馆资料'),
  r('revolution-1949', '1949年中国革命', '美国国务院历史办公室', 'https://history.state.gov/milestones/1945-1952/chinese-rev', 'On October 1, 1949', '机构史料', '英文'),
  r('prc-proclamation', '《中华人民共和国中央人民政府公告》', '中国国家博物馆', 'https://www.chnmuseum.cn/zp/zpml/gshww/202103/t20210331_249356.shtml', '1949年10月1日', '博物馆资料'),
  r('huaihai', '淮海战役捷报：1949年1月的战地报刊', '中国国家博物馆', 'https://www.chnmuseum.cn/zp/zpml/gmww/202104/t20210407_249594.shtml', '1949年1月11日', '博物馆资料'),
  r('war-documents', '侵华日军罪行及抗战胜利主题文物史料', '侵华日军南京大屠杀遇难同胞纪念馆', 'https://www.19371213.com.cn/sylm/xwzx/202509/t20250904_5642602.html', '1937年12月', '博物馆资料'),
  r('korean-armistice', '1953年朝鲜停战协定及背景', '美国国家档案馆', 'https://www.archives.gov/milestone-documents/armistice-agreement-restoration-south-korean-state', 'July 27, 1953', '文件原文', '英文'),
  r('first-plan', '社会主义革命和建设：第一个五年计划', '国家发展改革委', 'https://www.ndrc.gov.cn/fggz/fgjh/djzc/202206/t20220630_1329718.html', '1953年开始执行', '机构史料'),
  r('great-leap', '公社与大跃进', '哥伦比亚大学 Asia for Educators', 'https://afe.easia.columbia.edu/special/china_1950_commune.htm', 'Great Leap Forward', '大学教学资料', '英文'),
  r('cultural-revolution', '文化大革命：历史背景与个人经历', '哥伦比亚大学 Asia for Educators', 'https://afe.easia.columbia.edu/special/china_1950_son.htm', '1966-1976', '大学教学资料', '英文'),
  r('un-2758', '联合国大会第2758号决议', '联合国', 'https://static.un.org/zh/ga/26/res/ares2758.html', '唯一合法代表', '文件原文'),
  r('reform-chronicle', '党史百年·天天读：十一届三中全会', '中共中央党史和文献研究院', 'https://www.dswxyjy.org.cn/GB/434461/434473/434996/index.html', '1978年12月18日', '机构史料'),
  r('tiananmen-archive', '1989年天安门事件：解密档案专题', '乔治·华盛顿大学 国家安全档案馆', 'https://nsarchive.gwu.edu/news/china/2019-06-04/tiananmen-massacre-30th-anniversary-china-declassified', '1989', '档案专题', '英文'),
  r('market-reform', '创建社会主义市场经济体制', '国家发展改革委', 'https://www.ndrc.gov.cn/fggz/tzgg/byggdt/200812/t20081231_1021835_ext.html', '1992年', '机构史料'),
  r('hong-kong', '香港特别行政区回归周年纪事', '香港特别行政区政府', 'https://www.info.gov.hk/info/sar1/reunif.htm', 'July 1, 1997', '机构记录', '英文'),
  r('macao', '澳门政权交接仪式场馆的建筑设计', '澳门特别行政区政府新闻局', 'https://www.gcs.gov.mo/news/detail/zh-hans/M24LEWHe15', '1999年12月20日', '机构记录'),
  r('wto', '中国加入世贸组织20周年论坛', '世界贸易组织', 'https://www.wto.org/english/news_e/news21_e/acc_10dec21_e.htm', '11 December 2001', '机构记录', '英文'),
  r('wenchuan', '汶川抗震救灾进展与下一阶段工作任务', '国务院／生态环境部存档', 'https://www.mee.gov.cn/zcwj/gwywj/201811/t20181129_676448.shtml', '5月12日14时28分', '文件原文'),
  r('olympics', '中国奥委会2008年工作报告', '中国奥委会／国家体育总局', 'https://www.sport.gov.cn/n20001280/n20767351/n20767637/c20815224/content.html', '2008年8月24日', '机构记录'),
  r('constitution-2018', '中华人民共和国宪法修正案（2018）', '新华社受权发布', 'https://www.xinhuanet.com/politics/2018-03/11/c_1122521235.htm', '第四十五条', '文件原文'),
  r('covid-emergency', '2023年5月5日：新冠全球卫生紧急状态结束', '世界卫生组织', 'https://www.who.int/news-room/speeches/item/who-director-general-s-opening-remarks-at-the-media-briefing---5-may-2023', 'global health emergency', '机构记录', '英文'),
  r('change-six', '嫦娥六号实现月球背面采样返回', '国家航天局', 'https://www.cnsa.gov.cn/n6758823/n6758844/n10518102/n10518147/c10565180/content.html', '2024年6月25日', '机构记录'),
];
export const journeyReference = (id: string) => journeyReferences.find(reference => reference.id === id);
export function journeyReferenceUrl(reference: JourneyReference): string {
  const url = new URL(reference.url);
  // Text fragments are progressive enhancement; the keyword remains visible for other browsers.
  if (reference.format !== 'PDF') url.hash = `:~:text=${encodeURIComponent(reference.locator).replace(/-/g, '%2D')}`;
  return url.href;
}
