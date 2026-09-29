# 《史记》结构化星图来源

作者：鲍捷及项目贡献者。来源：[史记知识库 baojie/shiji-kb](https://github.com/baojie/shiji-kb)，固定提交 `6b836e3fac1b900ccc6e9299fd6896c0e18ec132`，许可 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)（署名、非商业、相同方式共享）。本目录快照及派生图谱沿用该许可。商业使用需另获授权或替换此结构化数据。

| 本地快照 | 上游路径 | SHA-256 |
| --- | --- | --- |
| events.json | app/metro/data/metro_map_data.json | 26918f0501c7e762d7b49f709bde2c830491509851850b3fc1f828395bf6797b |
| entities.json | kg/entities/data/entity_index.json | 3200fe390dedd2568e2dfa218e042111346f7e45e5188b971d983f8c3e41ada7 |
| relations.json | kg/events/data/event_relations.json | 39212d8f9cd66b6f1411fc41da3042bb17bd8e0163088912a98a07d889070468 |

本站修改：简体显示、明确别名归并、为无法消歧的事件称谓保留独立词条、生成篇章节点、建立提及和出处关系、映射来源卷次、在正文唯一匹配时添加段落定位、将上古和无法确定的纪年置空、区分索引与解释，并压缩为字符串池和元组。原始快照保持不变。

导入 `entities.json` 中所有具有效卷次的人物索引、`events.json` 全部 130 卷的 3,197 个事件和 `relations.json` 的 7,637 条事件关联。没有把质量不足的上游亲属推断文件当作已核实关系导入。

派生结果：5,297 个人物词条、3,197 个事件、130 个篇章、29,248 条关联。其中 26,722 条是出处、提及、共现等原文索引，2,526 条是事件解释。叠加现有楚汉编辑样本后有 3,203 个事件和 29,276 条关联。人物词条数不等于已完成消歧的独立历史人物数；不同篇章的同一事件可能保留多个叙述节点。

图谱包含机器整理结果，不代表所有史实或关系已经人工审定。提及不等于参与，共现不等于社交关系；因果和对立关系只是待核对的解释。来源卷次可回到站内全文，精确段落仅在唯一匹配时提供。报告位于 `src/domain/generated/shiji-graph-report.json`。
