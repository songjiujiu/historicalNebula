# 新增 23 部史书：来源与重建

`sources.json` 固定 [Chinese Dynastic Histories 语料](https://osf.io/tp729/) 23 个原始文件的下载地址、大小和 SHA-256。该语料由 Sergey Zinin、Yang Xu 用于 [*Corpus of Chinese Dynastic Histories: Gender Analysis over Two Millennia*](https://aclanthology.org/2020.lrec-1.98/)（LREC 2020），项目说明其依据维基文库转录整理，并提示以该论文作为引用。古代原作属于公有领域，但现代转录、整理和所附目录的许可需分别遵循各来源说明；这里不推断未明确标示的许可版本。

原始大文件不纳入 Git；执行 `npm run fetch:dynastic` 下载到 `source/`。`npm run import:dynastic` 核对文件大小与 SHA-256 后提取分卷，写入 `public/data/histories/{书名 ID}/{卷号}.json`、每书 `search.json` 与 `src/domain/generated/dynastic-manifest.json`。卷号从语料自带的书号及卷号标记解析，导入时要求 1 至末卷连续且不重复。`npm run verify:dynastic` 再检查生成的 3,083 正卷、另一个《陈书》序、段落锚点和检索索引。阅读链接中的段号由本站生成，并非原本页码。

原语料缺四处，以单卷来源补齐：

| 史书 | 卷 | 补卷来源 |
| --- | ---: | --- |
| 后汉书 | 50、51 | [gujilab 古典文献结构化语料](https://github.com/gujilab/chinese-classical-corpus/blob/main/output/histories/houhanshu.json) |
| 新唐书 | 54 | [hunterhug 公开转录](https://github.com/hunterhug/china-history/blob/master/%E6%96%B0%E5%94%90%E4%B9%A6/%E5%BF%97/%E7%AC%AC%E5%9B%9B%E5%8D%81%E5%9B%9B%E7%AB%A0-%E5%8D%B7%E5%9B%9B%E5%8D%81%E5%9B%9B-%E5%8E%9F%E6%96%87.html) |
| 宋史 | 69 | [hunterhug 公开转录](https://github.com/hunterhug/china-history/blob/master/%E5%AE%8B%E5%8F%B2/%E5%BF%97/%E7%AC%AC%E4%BA%8C%E5%8D%81%E4%BA%8C%E7%AB%A0-%E5%8D%B7%E4%BA%8C%E5%8D%81%E4%BA%8C-%E5%8E%9F%E6%96%87.html) |

`indexes.json` 是 [yuanshiming 目录](https://github.com/yuanshiming/Twenty-Four-Histories)的卷名快照，`catalog-titles.json` 是 [hunterhug 目录](https://github.com/hunterhug/china-history)的卷名快照。`gujilab-titles.json` 从 [《魏书》](https://github.com/gujilab/chinese-classical-corpus/blob/main/output/histories/weishu.json)与[《周书》](https://github.com/gujilab/chinese-classical-corpus/blob/main/output/histories/zhoushu.json)的公开记录抽取卷名；《后汉书》目录也由其补卷快照抽取。它们只作显示标签，正文仍来自上述固定来源。`metadata/` 保留下载时的目录树和两部书的标题源快照，供索引脚本复核。目录条目与语料卷数一致才逐卷使用；不能可靠匹配时显示“卷 N”。四处补卷以该卷开头的标题另行标示。

逐卷抽查时发现，底本中的《宋史》卷 215、230–241 只剩宗室世系表的标题，《旧五代史》卷 11、86、122 也明显过短。`supplements/` 保存从[维基文库 WS Export](https://ws-export.wmcloud.org/)取得的单卷 EPUB 快照：前者保留表格行、列与合并单元格，后者采用注明版本的《旧五代史》四库全书本。导入器只保留表格所需的安全 HTML 标签，移除导航与样式，原文显示页链接到相应单卷来源。`scripts/fetch-dynastic-short-volumes.mjs` 可重新下载快照。

另有至少 12 卷的底本明确缺录历法表格：《晋书》卷 18、《宋史》卷 83、84、《金史》卷 21、22、《明史》卷 25、32–36、39。维基文库可读页中的《宋史》卷 84 与《明史》卷 39 也没有相应原表。目录保留这些卷，阅读页醒目标注“表格缺录”；这部分不能称为完整全文，也不会在检索结果中出现未收录的表格数据。其他转录仍可能存在遗漏，卷数连续只证明卷次覆盖，不证明逐字完整。

新增内容未经逐卷人工校勘。自动卷名、分段及简繁转换可能不适合学术引文；引用历史材料时请打开阅读页的来源链接核对底本。书级导读与按体例读法是本站编写的阅读辅助，不能当作古文白话全译或史实审定。新增史书的人物事件关系尚未完成结构化接入星图，不能把同卷出现推断为人物互动。
