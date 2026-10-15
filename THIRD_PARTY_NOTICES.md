# 许可范围与第三方来源

核验日期：2026-10-15。

本项目的原创程序代码采用根目录 [MIT License](LICENSE)。该授权仅覆盖本项目维护者及贡献者有权授权的代码和配套技术文档。它不为第三方软件、史料转录、图谱、引用文字、图片、字体或模型授予新的许可；第三方内容即使嵌入源代码、测试、JSON、数据库或打包文件，也保留其来源的权利状态。

`data/`、`public/data/`、`src/domain/generated/`、`assets/`、`public/site/models/` 中的内容不按根目录 MIT 统一授权。本站原创导读等非代码内容也未因此次软件许可而改为 MIT 内容集。下文记录已核实的来源及待确认范围；公有领域材料本身不因这些说明产生新的排他权利。详细复用范围见 [许可说明](docs/licensing.md)。

## 《史记》原文与维基文库转录

- 作者：司马迁；转录、校勘和编者增补：维基文库贡献者。
- 原始来源：[维基文库《史记》](https://zh.wikisource.org/wiki/史記)。每卷来源页的修订历史提供贡献者记录。
- 固定存档：2026-03-15 标示的繁体 EPUB，经 [baojie/shiji-kb 固定提交](https://github.com/baojie/shiji-kb/tree/6b836e3fac1b900ccc6e9299fd6896c0e18ec132/corpus/shiji) 保存。
- 路径：`data/shiji/`、`public/data/shiji/`、`src/domain/generated/shiji-manifest.json`，以及由这些文件生成的检索、摘句、数据库记录和书页纹理。
- 许可：古代原作属公有领域；EPUB 元数据标示 [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) / [GFDL](https://www.gnu.org/licenses/fdl-1.3.html)，部分页脚另有 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 提示。保留各页的具体许可信息，不将不同版本的声明统一改成 MIT。
- 本站修改：移除导航及危险 HTML，保留正文、年表、校勘和编者小节，重排版面，增加段落编号及简体检索。代码转换不改变所载文字的许可。

固定 SHA-256、原始声明与重建过程见 [全文来源说明](data/shiji/README.md) 和 [数据署名](public/data/shiji/NOTICE.md)。

## 《史记》知识图谱

- 作者：鲍捷及史记知识库项目贡献者。
- 来源：[baojie/shiji-kb](https://github.com/baojie/shiji-kb)，固定提交 `6b836e3fac1b900ccc6e9299fd6896c0e18ec132`；该提交的 [README 许可证说明](https://github.com/baojie/shiji-kb/blob/6b836e3fac1b900ccc6e9299fd6896c0e18ec132/README.md) 明确将标注数据按 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) 提供。
- 路径：`data/shiji-graph/events.json`、`entities.json`、`relations.json`，`src/domain/generated/shiji-graph.json`、`shiji-graph-report.json`，以及其派生图谱。
- 本站修改：别名归并、事件与篇章节点生成、来源卷次及段落匹配、纪年不确定性处理、简体显示、字符串池和元组压缩。原始快照保持不变。
- 许可要求：保留作者、来源、许可链接及修改说明；受许可保护的图谱材料仅限非商业用途，适用相同方式共享要求。商业用途需另获权利人授权或使用可替代数据。

引用建议：鲍捷，史记知识库，2026，https://github.com/baojie/shiji-kb 。各快照的上游路径与哈希见 [图谱来源说明](data/shiji-graph/README.md)。当前阅读界面不加载图谱；源码归档仍包含它，不能把完整仓库称为“全部 MIT”。

## 二十四史研究语料（CCDH）

- 作者：Sergey Zinin、Yang Xu。
- 来源：[Chinese Dynastic Histories](https://osf.io/tp729/)。固定下载链接、文件大小、SHA-256 见 `data/dynastic-histories/sources.json`。
- 路径：下载至 `data/dynastic-histories/source/` 的 23 个文件，及相应 `public/data/histories/` 正文与检索文件、`src/domain/generated/dynastic-manifest.json`。这些产物还含下文分别列出的补卷和目录来源，不能全部归为同一种许可。
- 许可核验：[OSF 项目元数据](https://api.osf.io/v2/nodes/tp729/) 指向许可证 `563c1cf88c5e4a3877f9e96a`；[对应许可证元数据](https://api.osf.io/v2/licenses/563c1cf88c5e4a3877f9e96a/) 标示 **CC BY 4.0**，法律文本见 [Creative Commons](https://creativecommons.org/licenses/by/4.0/legalcode)。该声明记录语料发布者的许可，不替代底层维基文库转录等材料的既有权利。
- 本站修改：校验固定文件，按书号与卷号分卷，生成段落编号、安全 HTML、简体检索、目录和统计信息。保留来源链及变化说明。
- 上游要求研究使用时引用：Sergey Zinin and Yang Xu. 2020. *Corpus of Chinese Dynastic Histories: Gender Analysis over Two Millennia*. Proceedings of the Twelfth Language Resources and Evaluation Conference, pages 785–793. [论文及引用信息](https://aclanthology.org/2020.lrec-1.98/)。

## gujilab 补卷与目录

- 来源：[gujilab/chinese-classical-corpus](https://github.com/gujilab/chinese-classical-corpus)，包括 `output/histories/houhanshu.json`、`weishu.json`、`zhoushu.json`。
- 路径：`data/dynastic-histories/houhanshu-supplement.json`、`gujilab-titles.json`、`metadata/weishu-gujilab.json`、`metadata/zhoushu-gujilab.json`，及《后汉书》50、51 卷与有关目录元数据。
- 许可：上游 [LICENSE](https://github.com/gujilab/chinese-classical-corpus/blob/main/LICENSE) 将 `output/` 结构化数据声明为 [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)，将其代码另列为 MIT。本项目使用的是数据，保留 gujilab 及其底层来源说明；不把上游代码许可套用到全部史料。
- 本站修改：选取补卷，抽取卷名并进行字形显示转换；未复制其全部数据集。

## hunterhug、yuanshiming：部分来源许可尚未核明

以下来源公开可读，但本次检查未找到足以确认其现代转录、整理或目录汇编许可范围的明确声明。此处记录来源，**不代表授予再分发许可，也不将其改为 MIT**。本次未核明不等于认定维护者没有发布权，仍需结合原作状态、具体整理内容及已有授权分别核对。

| 来源 | 仓库内快照 | 派生内容 |
| --- | --- | --- |
| [hunterhug/china-history](https://github.com/hunterhug/china-history) | `data/dynastic-histories/xintangshi-054-hunterhug.json` | 《新唐书》54 卷：`public/data/histories/xintangshi/054.json`、同书 `search.json` 的第 54 卷条目、清单内对应摘要和统计 |
| 同上 | `data/dynastic-histories/songshi-069.json` | 《宋史》69 卷：`public/data/histories/songshi/069.json`、同书 `search.json` 的第 69 卷条目、清单内对应摘要和统计 |
| 同上 | `data/dynastic-histories/catalog-titles.json`、`metadata/hunterhug-history-tree.json` | 部分书目的卷名、体例及清单标签 |
| [yuanshiming/Twenty-Four-Histories](https://github.com/yuanshiming/Twenty-Four-Histories) | `data/dynastic-histories/indexes.json`、`metadata/yuanshiming-tree.json` | 部分书目的卷名及清单标签 |

两个 hunterhug 补卷的存档 HTML 保留“阿星星 · 版权所有”页脚；该页脚本身不提供开放许可。上游 Git blob 分别为 `a1526a66840192248c79d9a5f12fbd255fe59c89`、`de83b5ed913b4208b5f01984aee32c34052f05a6`。古代原作的公有领域状态与现代排版、转录、校勘、整理等权利应分别判断。

本次独立演示保留已有转录及派生内容，并公开记录上述待核明范围。后续可以补充授权或来源证据，也可以改用许可记录更清楚的转录；如选择替换或省略，相关检索/清单的同步修改方案见 [发布范围说明](docs/licensing.md#公开演示与发行包)。这些是后续治理方案，不是本项目新增的发布前置要求；本文件也不替代来源方已有的授权条件。

## 维基文库补卷、清史稿及近现代文献

- 作者：各原作署名作者、各文件发布机构；现代转录与校勘：维基文库贡献者。
- 来源：`data/dynastic-histories/supplements/wikisource-pages.json` 逐卷列出的维基文库页面；[《清史稿》](https://zh.wikisource.org/wiki/清史稿)；`data/modern-history/documents.json` 中列出的文献页面。每页均可访问修订历史。
- 路径：`data/dynastic-histories/supplements/*.epub` 及对应史书正文，`data/modern-history/source/*.epub`，`public/data/modern/qingshigao/`、`public/data/modern/documents/` 和相关清单/检索数据。
- 许可：原作的公有领域或官方文献状态与现代转录分别处理。现有清史稿和文献 EPUB 元数据标示 CC BY-SA 3.0 / GFDL，现有导入说明采用 [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)；补卷逐份保留 EPUB 和来源页的具体声明。新取得的快照应再次记录实际许可版本，不假定与旧快照一致。
- 本站修改：清理导航及危险 HTML，保留正文和表格，重排版面、增加段落编号，建立章节索引和原文定位。缺录状态不因重新打包改变。

`data/modern-history/extra-documents.json` 中的国家卫生健康委员会 2022 年第 7 号公告来自[官方发布页](https://www.nhc.gov.cn/xcs/zhengcwj/202212/b6984c15b07542e0baecd651f73133ac.shtml)，由本站逐段转录，现有元数据按行政性质文件注明不适用著作权法。该条目没有使用维基文库转录许可，不能因此推断同站全部网页内容均属公有领域。

更多来源、日期、哈希与缺录说明见 [二十四史数据说明](data/dynastic-histories/README.md) 和 [清至当代正文说明](data/modern-history/README.md)。

## 原创导读、引用与外部参考资料

历史主线、世界历史对照、逐卷导读及 `data/modern-history/chapters.md` 中的本站解释，与所引史料原文分别展示。外部博物馆、大学、档案馆、联合国等参考链接只说明依据，不意味着本项目取得了链接目标页面、图片或全文的再许可权。此次软件 MIT 授权不把这些非代码内容统一改为 MIT。

引用句、引用所依赖的转录、参考来源的作者与许可仍随材料保留；将句子存为 TypeScript 字符串、测试断言、截图或模型纹理不会消除来源要求。

## 图片、Blender 场景、模型及字体

- 路径：`assets/blender/`、`public/site/models/history/`、`public/site/models/reading/`、`public/site/models/opening/`。
- 本仓库的 [资产说明](assets/blender/README.md) 将 `history-reference.png` 记为用户确认的生成概念图；多个封面、背景与模型使用其纹理。本次演示保留这些用户生成媒体；软件 MIT 授权不同时为全部视觉资产授予 MIT 或 CC0 内容许可。现有制作记录不足以描述全部再许可范围，并不等于维护者没有发布这些媒体的权利。
- 阅读桌、书架等几何体由项目的 Blender 脚本生成；模型和海报仍可能包含字体轮廓、图像或其他嵌入内容。程序代码的许可与导出资产的许可分别适用。
- `assets/blender/opening-textures/`、`opening-*.blend`、`public/site/models/opening/*.glb` 的书页纹理来自史记、汉书、三国志、旧唐书与清史稿的原文 JSON。文字来源及相应许可继续适用。
- Blender 脚本使用 Windows KaiTi（`simkai.ttf`，部分路径以 SimSun 回退）生成标题网格。字体软件及相关使用条件不由本项目的 MIT 许可授予；重新生成资产前应确认所用字体允许相应输出与分发。
- `public/site/favicon.svg` 等未单列的品牌/视觉文件也不因根目录 MIT 文件被统一授予媒体许可。采用纯代码演示或替换为已确认许可的资产时，应同步更新这一来源表。

## 软件依赖

第三方依赖仍使用各自的许可证。以下为本次锁文件记录的主要 JavaScript 依赖，完整版本树见 `package-lock.json`，实际许可全文与版权声明见各发行包。

| 依赖 | 记录的许可证 |
| --- | --- |
| opencc-js 1.4.2 | MIT AND Apache-2.0（含相应字典/上游声明） |
| three 0.186.0、@types/three 0.186.0 | MIT |
| fflate 0.8.3、happy-dom 20.14.5、parse5 8.0.1 | MIT |
| TypeScript 7.0.2 | Apache-2.0 |
| Vite 8.3.0、Vitest 5.0.1 | MIT |

后端依赖在 `backend/requirements.txt` 中声明：Flask、MySQL Connector/Python、Gunicorn。其发行包以及传递依赖不属于本项目原创 MIT 代码；尤其应查阅实际安装版本的 [MySQL Connector/Python 官方许可资料](https://dev.mysql.com/doc/connector-python/en/)，不要将其重标为 MIT。MySQL 服务器、Blender 和系统字体也不因本项目引用而获得新许可。

发布合并后的 JS、容器、依赖包或离线包时，保留实际被分发组件要求的许可证、版权和 NOTICE 文件。本清单用于定位来源，不能替代各组件要求随包提供的许可正文。
