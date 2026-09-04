# trustwiki 方法——一条铁律，十二道检查

铁律：**永远不要写下知识库无法溯源的论断。** agent 维护的知识库以一种
可预测的方式腐烂；下面每条规则都来自生产环境中反复出现的真实事故。
按保护对象分组。

## 真相

### citation.malformed
解析不了的引用只是装饰，不是溯源。检查器按 `schema/spec.zh.md` 的文法
校验每个 `^[…]`（路径、可选 `:42-58` / `#L42-L58` 区间、逗号分隔多来源）。
*事故类型*：看起来像引用、实际永远无法解析的手写引用——有溯源的外形，
没有溯源的实体。

### citation.target-missing
被引用的路径必须存在于库内。指向不存在文件的引用是剪了头发的谎言。
*事故类型*：页面改名或归档时没有清扫反向引用。

### provenance.excess-inferred
推断是合法的；不可见的推断不是。当一页未引用散文段落占比超过阈值
（默认 30%）时标记。来源页（`type: source`）豁免——它们引用来源，
不需要引用自己。
*事故类型*：slop 库——流畅、自信、没有任何来源能佐证的散文。
这就是人们说"AI slop"时指的那种失败。

### provenance.low-confidence
页面可声明 `confidence: 0–1`。低于下限（默认 0.5）即标记，
让弱论断一眼可见。

## 冲突

### provenance.contradicted
两页相左时，分歧本身就是数据。规则强制两半齐备：正文
`> [!contradiction]` callout **加** frontmatter `contradicted_by` 列表——
只有一半就标记，因为机器读 frontmatter 而人读正文。
*事故类型*：矛盾被悄悄改写抹平，六周后有人重新推导出同一个错误结论。

## 结构

### link.broken
每个 `[[wikilink]]` 必须可解析——精确路径或全局唯一 basename。
### link.index-missing
每页必须进索引；每个索引项必须可解析。
*事故类型*：索引腐化——一次坏编辑把两行条目粘成一行，导航里静默消失
一半的页面。
### link.type-mismatch
声明了目录级期望 `type` 后，页面必须匹配。
### page.orphan
出链少于 `minOutboundLinks`（默认 2）即标记。孤岛先腐烂。
### frontmatter.required / frontmatter.fields
缺 frontmatter 或缺必填字段（`title, created, updated, type, tags`；
来源页另需 `source_url, ingested, sha256`）即标记。sha256 是数月后
发现来源被静默篡改的唯一手段。
### placeholder.present
正文前二十行里的 `TODO`/`TBD`/`FIXME`。看起来完成的未完成内容，
会侵蚀周围一切的信任。

## 运行循环

Ingest → Synthesize → Evolve → Gate。面向 agent 的方法见 `SKILL.md`；
冻结文法见 `schema/spec.md`。English version: `docs/method.md`.
