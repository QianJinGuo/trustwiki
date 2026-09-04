# trustwiki-schema v0.1（中文版）

## 状态

`trustwiki-schema v0.1`——2026-09-05 冻结。v0.2 之前只增不改。本规范由
`trustwiki` linter 与同名 agent skill 实现，其他工具亦可实现。

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
| rules               | 全开     | 逐规则 `error \| warn \| off`          |

规则 id：`frontmatter.required`、`frontmatter.fields`、`placeholder.present`、
`link.broken`、`link.index-missing`、`link.type-mismatch`、`page.orphan`、
`citation.malformed`、`citation.target-missing`、
`provenance.excess-inferred`、`provenance.low-confidence`、
`provenance.contradicted`。

退出码：`0` 干净（允许警告）、`1` 存在 error、`2` 配置或用法错误。
