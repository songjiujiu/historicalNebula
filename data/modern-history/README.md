# 清至当代站内正文

三类内容在界面中独立标注：

- `chapters.md`：本站编写的 34 篇白话历史正文，约 1.85 万字，与 `src/domain/modern-history.ts` 的全部事件对应。解释依据沿用每个事件的署名资料索引，并补充站内文献；不是古籍、文件原文或逐句翻译。最新节点选至 2024 年。
- `source/qingshigao.epub`：2026-09-29 从 [维基文库《清史稿》及贡献者](https://zh.wikisource.org/wiki/清史稿) 导出，来源 `https://ws-export.wmcloud.org/?format=epub&lang=zh&page=清史稿`。529 卷均有条目，523 卷有转录（卷29星表不完整）。卷30—35仅有标题，导入与阅读器均明确标记缺录，不计入正文卷数。不能声称逐字完整，其他卷的转录也未经全量影印校勘。《清史稿》不属于二十四史。
- `documents.json`：10 份选定文献，逐份通过同一 EPUB 服务导出；`extra-documents.json` 中另有一份国家卫健委官方公告的人工转录。保留所选文献正文（港澳声明含附件），不声称涵盖各时期全部史料。原件和转录均保留。

原文作品是公有领域旧作或法律、行政文件。维基文库 EPUB 的元数据标为 CC BY-SA 3.0 / GFDL，本项目采用 [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) 整理转录。来源链接可查看页面历史与贡献者；原书部分网页可能另有更新的许可说明，详见来源页。国家卫健委2022年第7号公告为行政性质文件，依法不适用著作权法。未复制博物馆、大学、新闻机构或当代作者的受版权保护全文。

整理移除导航与危险 HTML，保留正文、表格，增加稳定段落编号。原文字形储存不变，阅读器的简体开关只转换显示。正文、章节元数据及 EPUB SHA-256 分别写入 `public/data/modern/` 的 JSON；现代文献哈希也写入 `src/domain/generated/modern-texts-manifest.json`。下载是显式步骤，离线导入不联网：

```powershell
node scripts/fetch-modern-documents.mjs
node scripts/import-qingshigao.mjs
node scripts/import-modern-texts.mjs
```

`qing-links.json` 的每条定位摘句必须真实存在于对应卷，导入时缺少就报错。白话正文每一篇必须覆盖已有事件，生成后由测试验证；章号与文献编号校验后才用于构建请求路径。

文件中的贬称、政治立场及政策目标属于史料发布者或编纂者，界面另作阅读提示。文件出台日期与事件发生日期可能不同，关联卡片说明其关系。
