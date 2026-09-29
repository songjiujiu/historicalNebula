# 《史记》全文存档

来源：司马迁原作；[维基文库《史记》及贡献者](https://zh.wikisource.org/wiki/史記)。

`source.epub` 为 2026-03-15 标示版本，取自 [baojie/shiji-kb 固定提交](https://github.com/baojie/shiji-kb/tree/6b836e3fac1b900ccc6e9299fd6896c0e18ec132/corpus/shiji) 的 `史記.繁体.epub`，而非该项目生成的 Markdown。EPUB 保留十表的完整表格。

SHA-256：`8d2344521fd3e55cb280def477a7c9f87226af8ada1f64ecde00f3e7bd768bca`。

古代原作属公有领域。EPUB 元数据注明 [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) 与 [GFDL](https://www.gnu.org/licenses/fdl-1.3.html)；部分页脚另有 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 提示。转录、校勘和编者增补保留维基文库贡献者署名及来源链接；相应许可不被结构化知识库的许可取代。原存档保留各页原始声明，可通过每卷来源页查看修订历史。

`titles.json` 是按卷排序的 130 个篇名。运行 `npm run import:shiji` 离线重建正文、检索索引与星图。导入器核验 SHA-256，移除网站导航、脚本和外部资源，清理 HTML 属性，保留原文、表格、校勘与编者小节，生成本站段落编号。简体检索由 OpenCC 转换；阅读可切换繁体原字与自动简体。

输出在 `public/data/shiji/`；正文 130 卷、730,220 字符（含校勘和编者增补），十表中共有 20 个 HTML 表格。字符数不是司马迁原作字数。生成文件的顺序和段落编号随此固定底本保持稳定。
