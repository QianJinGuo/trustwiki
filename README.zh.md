<p align="center">
  <img src="assets/hero.svg" alt="trustwiki — 你的 agent 可以维护的知识库，前提是它不对你撒谎" width="100%">
</p>

<p align="center">
  <a href="https://github.com/QianJinGuo/trustwiki/actions/workflows/ci.yml"><img src="https://github.com/QianJinGuo/trustwiki/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/trustwiki"><img src="https://img.shields.io/npm/v/trustwiki" alt="npm"></a>
  <img src="https://img.shields.io/node/v/trustwiki" alt="node >= 18">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT license">
</p>

[English](README.md) · 简体中文

# trustwiki

**你的 agent 可以维护的知识库——前提是它不对你撒谎。**

每个论断有引用。矛盾自动现形。腐烂有仪器测。

```bash
npx trustwiki lint ./your-vault
```

trustwiki 是一个溯源 linter，加一套面向 agent 维护知识库的操作方法。
它**不**替你长出 wiki。它保证的是：当你的 agent 动笔时，每个论断能
追溯到来源，分歧保持可见而不是被悄悄改写，腐烂被仪器测出来——
而不是两个月后被人撞见。

- **12 条机械检查**——引用文法、引用目标、未引用推断占比、置信度下限、矛盾一致性、断链、索引漂移、孤页、占位符
- **一个配置文件**——`.trustwiki.json`；什么都不配置也照常能跑
- **零依赖**——Node 18+，一条命令，JSON 输出可直接进 CI
- **生产验证**——运行自 2026-05 的 agent 维护知识库的[活体统计](proof/STATS.md)

## 为什么

agent 已经在替人写知识库了。没有信任层，它们产出的是流畅的 slop：
无出处的论断、被静默抹平的矛盾、烂掉的链接。trustwiki 是纪律层——
linter、schema、和方法。

## 快速开始

```bash
git clone https://github.com/QianJinGuo/trustwiki && cd trustwiki
npx trustwiki@alpha lint templates/demo-vault
```

你会得到这样一份报告（退出码 1——存在 error）：

![trustwiki 检查预埋缺陷的 demo vault——8 条 findings](assets/demo.gif)

```
notes/sloppy-page.md
  L12   error citation.target-missing   citation target not found: sources/ghost.md
  L14   warn  provenance.excess-inferred 3/5 prose paragraphs uncited (>0.3)
  L16   warn  placeholder.present        placeholder text: TODO
  ...
Σ 3 errors, 5 warnings across 3 files
```

这 8 条 findings 是预埋在 `templates/demo-vault` 里的一座"造出来就是为了
失败"的库。`templates/starter-vault` 是同样结构、造出来就是为了通过的库——
也是你自己建库的起点。

## 规范

引用文法（`^[path:42-58]`）、provenance frontmatter、矛盾标记，全部
有版本化的规范：[schema/spec.zh.md](schema/spec.zh.md)（English:
[spec.md](schema/spec.md)）。欢迎 lint 之外的实现。

## 方法

四个阶段——**Ingest、Synthesize、Evolve、Gate**——封装为可安装的
agent skill：[SKILL.md](SKILL.md)。每条规则为什么存在：
[docs/method.zh.md](docs/method.zh.md)（English: [method.md](docs/method.md)）。

## 配置

一切可选。最重要的两个键：

```json
{
  "roots": ["notes", "sources"],
  "index": "index.md",
  "sourceDir": "sources"
}
```

完整参考见 [schema/spec.zh.md](schema/spec.zh.md)。规则级别为
`error | warn | off`；退出码 `0` 干净、`1` 有 error、`2` 用法/配置错误。

## 活体统计

来自生产库的数字，每个都带来源和核实日期：[proof/STATS.md](proof/STATS.md)。

## 许可

MIT。
