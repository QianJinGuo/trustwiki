# trustwiki-schema v0.2（中文版）

## 状态

`trustwiki-schema v0.2`——2026-09-05。v0.1 冻结了引用文法；v0.2 新增断言
半衰期标注（纯增量的加法，v0.1 内容零改动）。由 `trustwiki` linter 与同名
agent skill 实现，其他工具亦可实现。

## 引用语法

```
citation    := "^[" source-list "]"
source-list := source ( ", " source )*
source      := path ( line-ref | anchor-ref )?
path        := vault 内相对路径；.md 后缀可省略
line-ref    := ":" start "-" end        例：^[sources/abc.md:42-58]
anchor-ref  := "#L" start "-L" end      例：^[sources/abc.md#L42-L58]
start, end  := 正整数；start ≤ end
```

示例：

```markdown
不同茶类冲泡方式不同。^[sources/tea.md]

浸泡时间是苦涩的主导因素。^[sources/tea.md:42-58]

两项研究对比率结论一致。^[sources/study-a.md, sources/study-b.md#L3-L4]
```

放置规则：

- 引用挂在散文段落末尾；不得挂在标题、列表项、代码块或 callout 上。
- 允许无引用的推断——知识合成离不开推断——但单页未引用散文段落占比
  不得超过阈值（默认 0.3），且诚实页面用 frontmatter 标注推断
  （`provenance_state: inferred`）。
- 原始来源页（`type: source`）豁免推断占比：它们引用来源本身，
  不需要引用自己。

## Frontmatter

每页必填：

| 字段     | 类型   | 说明                            |
|----------|--------|---------------------------------|
| title    | string | 页面标题                        |
| created  | date   | ISO 日期，创建时定死            |
| updated  | date   | ISO 日期，每次编辑必须 bump     |
| type     | string | 页面类型（note、source、moc 等）|
| tags     | list   | `[a, b]`                        |

来源页（`type: source` 或位于 `sourceDir` 下）额外必填：

| 字段       | 类型   | 说明                                    |
|------------|--------|-----------------------------------------|
| source_url | string | 原始 URL                                 |
| ingested   | date   | 抓取时间                                 |
| sha256     | string | 抓取时正文哈希——日后借此发现来源被静默篡改 |

可选 provenance 字段：

| 字段             | 类型   | 说明                                          |
|------------------|--------|-----------------------------------------------|
| confidence       | float  | 0–1；低于下限（默认 0.5）会被标记             |
| provenance_state | enum   | `extracted \| merged \| inferred \| ambiguous`|
| contradicted_by  | list   | 与本页结论相左的页面 slug 列表                |
| claim_class      | string | 本来源断言的半衰期类别；必须是 vault `halfLives` 配置的键 |
| halflife_days    | number | 直接半衰期覆盖，优先于 `claim_class`          |

## 矛盾标记

两页观点冲突时，冲突必须显性化，不允许悄悄改写：

1. 正文 callout：`> [!contradiction] 参见 [[other-page]] 持相反观点`
2. Frontmatter 镜像：`contradicted_by: [other-page]`

linter 的 `provenance.contradicted` 规则要求两处齐备——只有 callout 或只有
frontmatter 都会被标记，因为机器读后者而人读前者。

## 检查你的知识库

```bash
npx trustwiki lint ./your-vault
```

配置位于 vault 根目录 `.trustwiki.json`（所有键可选）：

| 键                  | 默认值   | 含义                                   |
|---------------------|----------|----------------------------------------|
| roots               | `["."]`  | 参与扫描的目录                         |
| index               | `null`   | 索引文件；声明后启用索引漂移规则       |
| sourceDir           | `null`   | 引用路径解析根                         |
| typeByDir           | `{}`     | 顶层目录对应的期望 type                |
| minOutboundLinks    | `2`      | 孤页阈值                               |
| inferredThreshold   | `0.3`    | 未引用散文段落占比上限                 |
| confidenceFloor     | `0.5`    | 最低置信度                             |
| inferredSkipTypes   | `["source"]` | 豁免推断占比的页面类型             |
| halfLives           | terminology 30 / model-generation 59 / release-expectation 110 | 断言类别→被标过期的天数 |
| asOf                | 今天 | 审计"截至"某过去日期（也使运行可复现）      |
| rules               | 全开     | 逐规则 `error \| warn \| off`          |

规则 id：`frontmatter.required`、`frontmatter.fields`、`placeholder.present`、
`link.broken`、`link.index-missing`、`link.type-mismatch`、`page.orphan`、
`citation.malformed`、`citation.target-missing`、
`provenance.excess-inferred`、`provenance.low-confidence`、
`provenance.contradicted`、`provenance.stale-claim`、
`config.index-unreadable`。

### 断言半衰期（v0.2）

被引用的断言会过期。v0.2 允许来源页声明其断言的衰减速度：

```yaml
claim_class: model-generation    # 经 halfLives 配置解析
# 或直接：
halflife_days: 59
```

`provenance.stale-claim` 随后标记任何引用段落：其来源被持有超过半衰期。
年龄 = 审计日期 − 来源 `ingested`（即知识库"持有"该断言的时长）。未分类
或无日期的来源永远不会被标记——规则不做猜测。默认半衰期（30/59/110 天）
测自作者的生产 wiki；可按 vault 通过 `halfLives` 覆盖。

退出码：`0` 干净（允许警告）、`1` 存在 error、`2` 配置或用法错误。
