/**
 * 给第一次读《史记》的人准备的白话导读。
 * 叙事依据随每一幕附上的本地原文段落；图上只复用已有的记载关系。
 * 日期沿用项目中的楚汉事件纪年，是阅读定位，不将阴历月日换算成公历。
 */
export interface StorySource { volume: number; block?: string; label: string }
export interface StoryPerson { id: string; role: string }
export interface StoryStep {
  title: string;
  body: string;
  takeaway: string;
  personIds: string[];
  relationIds: string[];
  sources: StorySource[];
}
export interface HistoryStory {
  id: string;
  eventId: string;
  title: string;
  question: string;
  era: string;
  duration: string;
  background: string;
  people: StoryPerson[];
  steps: StoryStep[];
  outcome: string;
  recap: string[];
  terms: { word: string; definition: string }[];
  sources: StorySource[];
}

const source = (volume: number, block: string, label: string): StorySource => ({ volume, block, label });
const xiang = 'shiji-xiang-yu';
const liu = 'shiji-liu-bang';
const han = 'shiji-han-xin';
const xiao = 'shiji-xiao-he';
const zhang = 'shiji-zhang-liang';

export const stories: HistoryStory[] = [
  {
    id: 'dazexiang', eventId: 'shiji-dazexiang',
    title: '大泽乡：一队戍卒为什么起事？',
    question: '陈胜和吴广，怎样从带队赶路变成起兵反秦？',
    era: '公元前 209 年 · 秦二世时期', duration: '约 4 分钟',
    background: '先把时间放在秦朝末年。此时秦朝还在，陈胜和吴广也还不是国王。他们带领一队被征发的人前往边地服役，途中停在大泽乡。故事从一次大雨开始。',
    people: [
      { id: 'shiji-chen-sheng', role: '又叫陈涉。与吴广一起带领戍卒，后来称王。' },
      { id: 'shiji-wu-guang', role: '与陈胜共同带队、商议并组织起事的人。' },
    ],
    steps: [
      {
        title: '第一幕：雨挡住了路',
        body: '《陈涉世家》记载，这支队伍遇上大雨，道路不通，估计已经赶不上规定的到达时间。书中说他们面临“失期当斩”的处境；陈胜、吴广于是商议起兵，并讨论用谁的名号号召众人。这是《史记》对这次起事背景的叙述。',
        takeaway: '先记住两个人：陈胜和吴广。他们是在赶路服役途中共同谋划起事。',
        personIds: ['shiji-chen-sheng', 'shiji-wu-guang'], relationIds: [],
        sources: [source(48, 'p2', '陈涉世家 · 遇雨误期与商议起事')],
      },
      {
        title: '第二幕：从商议到行动',
        body: '吴广与押送队伍的军官发生冲突，陈胜相助，两人杀死了两名军官。随后他们召集队伍，提出起兵，借秦朝公子扶苏、楚国将领项燕的名号号召大家，打出“大楚”的旗号。陈胜任将军，吴广任都尉，队伍开始攻打附近城邑。',
        takeaway: '图中的“共同起事”，说的是这次两人一起组织和采取行动。',
        personIds: ['shiji-chen-sheng', 'shiji-wu-guang'],
        relationIds: ['shiji-chen-wu-209', 'shiji-action-sj-chen-uprising', 'shiji-action-sj-wu-uprising'],
        sources: [source(48, 'p3', '陈涉世家 · 杀尉、聚众与攻城')],
      },
      {
        title: '第三幕：起事扩大了',
        body: '队伍一路招兵，攻到陈地后，陈胜称王，国号“张楚”。《史记》接着记载，一些不满秦朝官吏的郡县起而响应，吴广则受命带兵向西进攻。局面已经从一支戍卒队伍的行动，扩大为多地反秦的战争。',
        takeaway: '这里的变化是“反秦力量扩大”，秦朝还没有在这一幕里灭亡。',
        personIds: ['shiji-chen-sheng', 'shiji-wu-guang'],
        relationIds: ['shiji-chen-wu-209'],
        sources: [source(48, 'p3', '陈涉世家 · 陈胜称王'), source(48, 'p4', '陈涉世家 · 各地响应与分兵')],
      },
    ],
    outcome: '陈胜称王，反秦起事扩展到更多地方。随后出现多支反秦力量，战事仍在继续。下一篇跳到两年后的巨鹿，看项羽怎样在战场上取得重要地位。',
    recap: ['陈胜、吴广原本在带领服役队伍赶路。', '两人共同起事，陈胜随后在陈地称王。', '秦末战争涉及多支力量，不能把整个过程当成一次起义就结束了。'],
    terms: [
      { word: '戍卒', definition: '被征发去驻守边地、承担军事服役的人。' },
      { word: '屯长', definition: '当时带领一队戍卒的小头领；陈胜和吴广都担任这一职务。' },
      { word: '起事', definition: '在这里指组织人马、起兵反抗秦朝统治。' },
      { word: '公元前', definition: '公元纪年开始以前的年份。公元前 209 年早于公元前 207 年，数字越小，时间越靠后。' },
    ],
    sources: [source(48, 'p2', '陈涉世家 · 起事背景'), source(48, 'p3', '陈涉世家 · 起事与称王'), source(48, 'p4', '陈涉世家 · 起事扩大')],
  },
  {
    id: 'julu', eventId: 'shiji-julu',
    title: '巨鹿：项羽怎样成为重要统帅？',
    question: '一次救援，怎样改变了项羽在各路军队中的地位？',
    era: '公元前 207 年 · 反秦战争中', duration: '约 3 分钟',
    background: '秦末起事之后，战争并未很快结束。秦军在定陶击败楚军，随后进攻赵地，把赵王等人围在巨鹿。楚方派军救赵，项羽在这支援军中，后来取得统帅职位。此时争战的一方仍是秦军。',
    people: [{ id: xiang, role: '率楚军救援巨鹿的将领；这时还没有成为“西楚霸王”。' }],
    steps: [
      {
        title: '第一幕：渡河救援',
        body: '项羽先派部分军队渡河，随后亲率主力前进。《项羽本纪》记载，楚军沉船、砸破炊具，只带三天口粮，以此表示决战的决心。这就是后来“破釜沉舟”故事的出处。',
        takeaway: '项羽率领的是救援赵地的楚军。图中的“统军”表示他指挥这次行动。',
        personIds: [xiang], relationIds: ['shiji-action-sj-xiang-julu'],
        sources: [source(7, 'p13', '项羽本纪 · 渡河与破釜沉舟')],
      },
      {
        title: '第二幕：胜利改变地位',
        body: '楚军攻击秦军，切断运粮通道，击败围城部队，俘获秦将王离。《史记》记述，战后项羽召见各路救援军的将领，他们归其统率。项羽由此取得了更大的指挥权，但秦将章邯的军队仍在，后面还有交战与受降。',
        takeaway: '这场胜利既是军事上的突破，也让项羽在诸侯军中取得重要地位。',
        personIds: [xiang], relationIds: ['shiji-action-sj-xiang-julu'],
        sources: [source(7, 'p13', '项羽本纪 · 巨鹿破秦与诸侯归属'), source(7, 'p14', '项羽本纪 · 战后继续交战'), source(7, 'p15', '项羽本纪 · 章邯受降')],
      },
    ],
    outcome: '项羽在巨鹿击败秦军，并取得对诸侯军的统率地位。后续进军中，刘邦先进入关中；等项羽也到达，两人如何相处成了新的问题。下一篇就讲鸿门宴。',
    recap: ['巨鹿之战发生在反秦战争期间，是楚军救赵。', '项羽取得胜利后，统率的不再只是原来的楚军。', '巨鹿之后仍有战事；刘邦与项羽也还没有在这里完成最后的较量。'],
    terms: [
      { word: '救赵', definition: '前往赵地救援被秦军围困的力量。当时的赵是秦末重新建立的诸侯势力。' },
      { word: '诸侯军', definition: '这里指来自不同反秦势力的军队，并不是一支始终统一行动的军队。' },
      { word: '破釜沉舟', definition: '砸破做饭的锅、沉掉船。原文用这些行动表现楚军决战的决心。' },
      { word: '关中', definition: '以今天陕西中部为核心的地区，秦朝都城咸阳就在这里。' },
    ],
    sources: [source(7, 'p9', '项羽本纪 · 楚军定陶失利'), source(7, 'p10', '项羽本纪 · 秦军围赵'), source(7, 'p12', '项羽本纪 · 楚军救赵与统帅更替'), source(7, 'p13', '项羽本纪 · 巨鹿之战'), source(7, 'p14', '项羽本纪 · 后续交战'), source(7, 'p15', '项羽本纪 · 章邯受降'), source(7, 'p17', '项羽本纪 · 项羽入关')],
  },
  {
    id: 'hongmen', eventId: 'shiji-hongmen',
    title: '鸿门宴：一顿饭为何如此紧张？',
    question: '刘邦去见项羽时，席间每个人分别在做什么？',
    era: '公元前 206 年 · 秦亡前后', duration: '约 5 分钟',
    background: '刘邦先进入关中，项羽随后率军到来。有人向项羽报告刘邦想在关中称王，项羽准备攻打刘邦。《史记》记载，经过项羽的叔父项伯、刘邦身边的张良等人的沟通，刘邦决定亲自到鸿门解释。先记住：这是一场带着军事压力的会见。',
    people: [
      { id: liu, role: '书中也称“沛公”。先入关中的反秦领袖，这次是赴宴的一方。' },
      { id: xiang, role: '率军到关中的统帅，在自己的营地接见刘邦。' },
      { id: 'shiji-fan-zeng', role: '项羽一方的谋士，书中也叫“亚父”，主张对刘邦采取行动。' },
      { id: 'shiji-xiang-zhuang', role: '项羽的部下，受范增安排入席舞剑。' },
      { id: zhang, role: '随刘邦赴宴、在席间周旋的人。' },
      { id: 'shiji-fan-kuai', role: '刘邦的部将，得知席间情况后进入帐中。' },
    ],
    steps: [
      {
        title: '第一幕：刘邦前来解释',
        body: '刘邦带人来到鸿门，对项羽解释自己入关的行动，表示并无与项羽对抗之意。项羽把告密者告诉了刘邦，随后留他饮酒。两人坐到了一起，军事上的紧张局势却没有让这场会面变成一顿普通的饭。',
        takeaway: '先看清主线：刘邦来见项羽。“鸿门会见”只描述这次见面。',
        personIds: [liu, xiang],
        relationIds: ['shiji-xiang-liu-206', 'shiji-action-sj-liu-hongmen', 'shiji-action-sj-xiang-hongmen'],
        sources: [source(7, 'p19', '项羽本纪 · 刘邦赴宴与席间行动')],
      },
      {
        title: '第二幕：舞剑背后有行动目标',
        body: '范增多次示意项羽，项羽没有回应。范增便叫项庄入席舞剑，原文明说他的安排是趁机攻击刘邦。项羽的叔父项伯也起身舞剑，用身体遮护刘邦，使项庄未能下手。这里要分清：范增安排、项庄舞剑、项羽未响应，是不同人的行动。',
        takeaway: '图中“安排舞剑”连接范增和项庄；它不是泛泛的“认识”，而是一项具体安排。',
        personIds: ['shiji-fan-zeng', 'shiji-xiang-zhuang', liu, xiang],
        relationIds: ['shiji-fan-xiang-206', 'shiji-fan-zhuang-206', 'shiji-action-sj-fanzeng-hongmen', 'shiji-action-sj-xiangzhuang-hongmen'],
        sources: [source(7, 'p19', '项羽本纪 · 范增示意、项庄舞剑')],
      },
      {
        title: '第三幕：樊哙入帐，刘邦离开',
        body: '张良在军门把席间情况告诉樊哙，樊哙随即带剑持盾入帐，并向项羽陈说刘邦的功劳。之后刘邦借离席的机会出来，在樊哙等人陪同下回到军中，留下张良向项羽辞谢。这次会见至此结束。',
        takeaway: '把过程连起来：张良传达情况，樊哙入帐，刘邦随后离开。',
        personIds: [zhang, 'shiji-fan-kuai', liu],
        relationIds: ['shiji-zhang-fankuai-206', 'shiji-action-sj-zhang-hongmen', 'shiji-action-sj-fankuai-hongmen', 'shiji-action-sj-liu-hongmen'],
        sources: [source(7, 'p19', '项羽本纪 · 张良与樊哙的行动'), source(7, 'p20', '项羽本纪 · 刘邦离席与张良辞谢')],
      },
    ],
    outcome: '刘邦离开鸿门回到军中。后来项羽分封诸侯，刘邦成为汉王，前往巴、蜀和汉中一带。宴会结束并不等于双方今后一直和平；接下来先看刘邦在汉中如何任用韩信。',
    recap: ['刘邦是在军事压力下前去会见项羽。', '范增、项庄、张良、樊哙各有具体行动，不能合成一条笼统的“人物关系”。', '刘邦脱身之后，局势继续变化；楚汉胜负还没有在宴会上决定。'],
    terms: [
      { word: '沛公', definition: '刘邦在这一阶段的称呼。读到“沛公”时，可以先在心里换成“刘邦”。' },
      { word: '亚父', definition: '书中对范增的尊称，这里指的还是范增这个人。' },
      { word: '分封', definition: '把地区分给诸侯治理，并给予王或侯等称号。' },
    ],
    sources: [source(7, 'p17', '项羽本纪 · 入关后的冲突'), source(7, 'p18', '项羽本纪 · 赴宴前的沟通'), source(7, 'p19', '项羽本纪 · 鸿门宴'), source(7, 'p20', '项羽本纪 · 刘邦离去'), source(7, 'p22', '项羽本纪 · 分封诸侯')],
  },
  {
    id: 'hanxin', eventId: 'shiji-hanxin-appointment',
    title: '韩信拜将：一个人怎样被看见？',
    question: '韩信为何离开，又怎样成为刘邦的大将？',
    era: '公元前 206 年 · 刘邦进入汉中后', duration: '约 4 分钟',
    background: '鸿门宴后，刘邦被封为汉王，来到汉中。韩信此前在楚军中没有获得重用，转投刘邦后起初也没有受到特别重视。要读懂这篇，只需认识三个人：想获得任用的韩信、推荐他的萧何、决定任命的刘邦。',
    people: [
      { id: han, role: '从楚军转投汉军，希望自己的军事才能得到任用。' },
      { id: xiao, role: '刘邦的丞相，了解韩信并向刘邦推荐他。' },
      { id: liu, role: '此时称“汉王”，最终决定任命谁来统军。' },
    ],
    steps: [
      {
        title: '第一幕：韩信离开，萧何追还',
        body: '萧何多次与韩信交谈，很看重他。到了南郑，韩信觉得自己仍未得到任用，便离开了队伍。萧何听说后，来不及向刘邦报告就去追韩信，刘邦还一度以为萧何也走了。',
        takeaway: '这一幕先看韩信和萧何：“追还举荐”从萧何把韩信追回来开始。',
        personIds: [han, xiao], relationIds: ['shiji-xiao-han-206', 'shiji-action-sj-xiaohe-appointment'],
        sources: [source(92, 'p5', '淮阴侯列传 · 韩信离去与萧何追还')],
      },
      {
        title: '第二幕：推荐变成正式任命',
        body: '萧何回来后向刘邦说明：如果只是留在汉中，可以不用韩信；如果要争天下，就应当重用他。刘邦同意拜韩信为大将。萧何又建议郑重举行任命仪式，刘邦照办；军中许多人此前没有想到会选中韩信。',
        takeaway: '分清两种角色：萧何负责推荐，刘邦作出任命，韩信接受职位。',
        personIds: [xiao, liu, han],
        relationIds: ['shiji-xiao-han-206', 'shiji-liu-han-206', 'shiji-action-sj-liu-appointment', 'shiji-action-sj-hanxin-appointment'],
        sources: [source(92, 'p5', '淮阴侯列传 · 萧何举荐与拜将')],
      },
      {
        title: '第三幕：开始讨论如何东进',
        body: '仪式之后，刘邦向韩信请教计策。韩信分析项羽的长处和问题，并提出争取人才、分赏有功者、向东进军的主张。刘邦听取意见，开始部署。这里是韩信进入军事决策的重要一步，还不是整场楚汉战争的结局。',
        takeaway: '被任命之后，韩信开始参与刘邦一方的军事计划。',
        personIds: [liu, han], relationIds: [],
        sources: [source(92, 'p6', '淮阴侯列传 · 拜将后的对策')],
      },
    ],
    outcome: '韩信成为汉军大将，刘邦随后向东进军。接下来的战争既有胜利，也有失败；下一篇彭城之战，正是刘邦一方遭遇的一次重大挫折。',
    recap: ['韩信最初没有获得重要任用，曾经离开汉军。', '萧何追还并推荐韩信，刘邦正式拜他为大将。', '任命之后才是长期的军事行动，不能把拜将直接当成最终胜利的原因。'],
    terms: [
      { word: '汉王', definition: '刘邦此时的王号；他还不是后来统一天下的汉朝皇帝。' },
      { word: '丞相', definition: '辅佐君主处理政务的重要官职；这篇里担任者是萧何。' },
      { word: '拜将', definition: '正式任命将领。“拜”在这里表示授予官职。' },
      { word: '汉中', definition: '今天陕西南部汉水上游一带；南郑是刘邦在这一阶段的驻地。' },
    ],
    sources: [source(7, 'p22', '项羽本纪 · 刘邦被封为汉王'), source(92, 'p4', '淮阴侯列传 · 韩信转投汉军'), source(92, 'p5', '淮阴侯列传 · 追还与拜将'), source(92, 'p6', '淮阴侯列传 · 对策'), source(92, 'p7', '淮阴侯列传 · 东进与后续战事')],
  },
  {
    id: 'pengcheng', eventId: 'shiji-pengcheng',
    title: '彭城：进入都城就算赢了吗？',
    question: '刘邦已进入项羽的都城，局势为何又变了？',
    era: '公元前 205 年 · 楚汉争战中', duration: '约 4 分钟',
    background: '从鸿门宴再往后读，双方的处境已不同。项羽以彭城为都城，刘邦则率军向东扩张。此时项羽正在齐地作战，刘邦率领汉军和诸侯军攻楚，并进入彭城。接下来是一次战场上的交锋。',
    people: [
      { id: liu, role: '率汉军和诸侯军进入彭城的汉王。' },
      { id: xiang, role: '在齐地作战后，亲率精兵返回彭城的楚军统帅。' },
    ],
    steps: [
      {
        title: '第一幕：汉军进入彭城',
        body: '项羽在北面齐地与反对他的力量持续作战时，刘邦率诸侯联军东进，进入彭城。《史记》记载，汉军入城后收取财物、饮酒宴乐。城已经被占据，但项羽的军队仍有战斗能力。',
        takeaway: '先区分“占领一座城”和“击败对方军队”这两件事。',
        personIds: [liu, xiang], relationIds: ['shiji-action-sj-liu-pengcheng'],
        sources: [source(7, 'p25', '项羽本纪 · 项羽在齐地作战'), source(7, 'p26', '项羽本纪 · 汉军进入彭城')],
      },
      {
        title: '第二幕：项羽回师反击',
        body: '项羽留下将领继续对付齐地的军队，自己率精兵南下，回击彭城的汉军。《项羽本纪》记载，楚军清晨发起进攻，到中午已大败汉军，随后继续追击。刘邦最终带少数随从脱身。',
        takeaway: '这一次连线写“彭城交战”：同样两个人，已经从鸿门的会见变成战场对手。',
        personIds: [xiang, liu],
        relationIds: ['shiji-xiang-liu-205', 'shiji-action-sj-xiang-pengcheng', 'shiji-action-sj-liu-pengcheng'],
        sources: [source(7, 'p26', '项羽本纪 · 楚军回师与汉军败退')],
      },
      {
        title: '第三幕：败退以后，战争继续',
        body: '刘邦一路收拢溃散的士兵，汉军在荥阳一带重新集结。萧何也从关中征发人力支援。楚军追击到这一带后，汉军又在京、索之间击败楚军，阻住其继续西进。彭城是一次大败，却没有在这里结束全部战争。',
        takeaway: '一场战役的胜负，与整场战争最终的胜负，需要分开看。',
        personIds: [liu, xiang], relationIds: [],
        sources: [source(7, 'p27', '项羽本纪 · 汉军重新集结')],
      },
    ],
    outcome: '项羽赢得彭城之战，刘邦败退后重整军队，部分诸侯也改变了立场。之后双方仍长期争战。下一篇跳到三年后的垓下，阅读这场战争接近结束时的局面。',
    recap: ['刘邦进入彭城时，项羽正在齐地作战。', '项羽回师击败汉军，刘邦脱身后重新集结力量。', '不要用一场胜负替代几年的战争过程，彭城与垓下之间还有许多战事。'],
    terms: [
      { word: '彭城', definition: '今天江苏徐州一带，项羽当时的都城。' },
      { word: '回师', definition: '把军队从原来的战场带回来，转向另一处作战。' },
      { word: '齐地', definition: '主要在今天山东一带；这一阶段有多支力量在那里争战。' },
      { word: '荥阳', definition: '今天河南荥阳一带，是汉军在这次败退后重新集结的重要地点。' },
    ],
    sources: [source(7, 'p22', '项羽本纪 · 项羽定都彭城'), source(7, 'p25', '项羽本纪 · 齐地战事'), source(7, 'p26', '项羽本纪 · 彭城之战'), source(7, 'p27', '项羽本纪 · 汉军重新集结'), source(7, 'p28', '项羽本纪 · 诸侯与后续战局')],
  },
  {
    id: 'gaixia', eventId: 'shiji-gaixia',
    title: '垓下：楚汉争战怎样走向结束？',
    question: '最后一场决战里，刘邦、韩信、项羽各处在什么位置？',
    era: '公元前 202 年 · 楚汉争战末期', duration: '约 5 分钟',
    background: '彭城之战之后又过了几年。双方曾约定以鸿沟为界，但刘邦随后继续追击。起初约好的援军没有到齐，汉军还在固陵受挫；后来重新商定条件，韩信等人的军队陆续赶来，各路力量会合到垓下。',
    people: [
      { id: liu, role: '组织汉军与诸侯会合，参与垓下决战的汉王。' },
      { id: han, role: '率军参战的汉方将领，在《高祖本纪》的战阵记述中居于前方。' },
      { id: xiang, role: '在垓下与汉及诸侯军交战，后来被围、突围的楚军统帅。' },
    ],
    steps: [
      {
        title: '第一幕：各路军队终于会合',
        body: '刘邦与韩信等人约定合击楚军，最初并未顺利会师。经过重新交涉，韩信等人同意进兵，多路军队在垓下会合。因此最后的进攻是汉军和诸侯军的共同作战，不是刘邦一个人的单独行动。',
        takeaway: '先看到“会合”这一步：多支军队到场，才有接下来的决战。',
        personIds: [liu, han],
        relationIds: ['shiji-action-sj-liu-gaixia', 'shiji-action-sj-hanxin-gaixia'],
        sources: [source(7, 'p40', '项羽本纪 · 约定会师与诸军齐集'), source(8, 'p52', '高祖本纪 · 会合垓下')],
      },
      {
        title: '第二幕：战败与包围',
        body: '《高祖本纪》记载，韩信率军先与楚军交战，起初不利；两翼军队进攻后，韩信再度进击，楚军大败。《项羽本纪》则把视线转到楚营：兵少粮尽，被汉军和诸侯军围住，夜里又听见四面传来楚歌。两篇是在讲同一战局的不同部分。',
        takeaway: '韩信负责率军交战，刘邦与各路军队共同参战，项羽一方落入困境。',
        personIds: [han, liu, xiang],
        relationIds: ['shiji-action-sj-hanxin-gaixia', 'shiji-action-sj-liu-gaixia', 'shiji-action-sj-xiang-gaixia'],
        sources: [source(8, 'p53', '高祖本纪 · 垓下战阵与胜负'), source(7, 'p41', '项羽本纪 · 被围与楚歌')],
      },
      {
        title: '第三幕：离开垓下之后',
        body: '《项羽本纪》接着记述，项羽夜间率骑兵突围，随后不断受到追击；到了乌江，他没有渡江，在交战后自刎。刘邦一方继续平定楚地。再往后，《高祖本纪》记载刘邦接受群臣请求，即皇帝位。要注意，这些是垓下战后的连续发展。',
        takeaway: '区分地点和先后：垓下战败、项羽突围后的结局、刘邦称帝，并非同一瞬间。',
        personIds: [xiang, liu], relationIds: [],
        sources: [source(7, 'p42', '项羽本纪 · 项羽突围'), source(7, 'p43', '项羽本纪 · 乌江结局'), source(8, 'p53', '高祖本纪 · 平定楚地'), source(8, 'p54', '高祖本纪 · 刘邦即皇帝位')],
      },
    ],
    outcome: '垓下决战后，项羽败走并在后续追击中身亡，楚汉争战趋于结束，刘邦随后称帝。这条入门路线到此告一段落；《史记》还记录了更长的历史，人物的后续经历也可以继续在全书中阅读。',
    recap: ['垓下是汉军与多路诸侯军共同参与的决战。', '韩信率军交战，项羽战败被围，随后率骑兵突围。', '项羽的结局和刘邦称帝发生在战后；不同篇章提供了不同的叙述视角。'],
    terms: [
      { word: '垓下', definition: '楚汉最后决战的重要地点；它与项羽突围后到达的乌江不是同一处。' },
      { word: '四面楚歌', definition: '这里先指项羽被围时听到四周的楚地歌声；后来才成为形容处境孤立的成语。' },
      { word: '本纪', definition: '《史记》的一类篇章，主要用来记述帝王及作者视为影响天下大局的人物。项羽本纪和高祖本纪可以对照着读。' },
    ],
    sources: [source(7, 'p39', '项羽本纪 · 鸿沟之约'), source(7, 'p40', '项羽本纪 · 追击与会师'), source(8, 'p52', '高祖本纪 · 垓下会师'), source(8, 'p53', '高祖本纪 · 战阵与胜负'), source(7, 'p41', '项羽本纪 · 垓下被围'), source(7, 'p42', '项羽本纪 · 突围'), source(7, 'p43', '项羽本纪 · 乌江结局'), source(8, 'p54', '高祖本纪 · 称帝')],
  },
];

export function storyById(id: unknown): HistoryStory | undefined {
  return typeof id === 'string' ? stories.find(story => story.id === id) : undefined;
}
