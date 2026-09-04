# trustwiki 正式设计（Design Spec）

日期：2026-09-05 · 状态：待用户评审 · 前置：PLAN.md v0.1（已批准方向）
框架约束：卖纪律与方法 + 活体证明；不卖魔法管线。三个默认决定（可改）：
`trustwiki` 命名 / CLI-first / EN-first。

---

## 1. 目标与非目标

**目标**
- G1: 任何人 30 秒内可对任意 markdown 知识库跑 `npx trustwiki lint`，得到
  可信度缺陷报告（引用、矛盾、腐烂）。
- G2: 任何 agent（Claude Code / Codex / OpenClaw / ZCode）可安装 SKILL.md
  并按同一套纪律维护知识库。
- G3: 引用语法、provenance 字段、矛盾标记成为一份开放规范（schema/），
  版本化，允许他工具实现。
- G4: README 与 proof/ 的每个数字可溯源（产品方法论的自我演示）。

**非目标（v1）**
- 不做：ingest 生产管线、cron 自动化、邮件/IMAP、公开投影、`--fix` 自动修复、
  编辑器插件、云服务、多语言 docs（README 双语除外）。
- 不承诺：自动"长出"知识库。工具测谎，不代思考。

## 2. 架构总览

```
使用者视角：
  vault(markdown 目录)
    └─ npx trustwiki lint ./vault [--json]   ← cli/：唯一可执行入口
         ├─ 读 .trustwiki.json（无则用默认配置）
         ├─ walk → 逐规则检查 → report（text | json）
         └─ exit 0（无 error）/ 1（有 error）/ 2（配置错）

  agent 视角：
    安装 SKILL.md → 按四阶段纪律写/改 vault → 提交前跑 lint（同一引擎）
```

四个组件，两条复用线：cli 是仪器，SKILL.md 是操作手册，schema 是两者
共享的规范，templates 是演示与起步。**lint 引擎是唯一的真工程量**，
其余是文档与打包。

## 3. 组件设计

### 3.1 cli/ —— lint 引擎（v1 主体）

现状：`wiki/scripts/wiki-lint.mjs`（599 行）规则齐全但耦合私有约定——
`ACTIVE_ROOTS`、`index.md`、目录统计、`raw/` 解析全部硬编码。

**泛化方案：配置文件 `.trustwiki.json`（vault 根目录，可选）**

```jsonc
{
  "roots": ["notes", "sources"],        // 参与扫描的目录（默认: ["."]）
  "index": "index.md",                  // 声明后才启用 index 相关规则
  "sourceDir": "sources",               // 引用语法中 path 的解析根
  "rules": {                            // 每条可 error | warn | off
    "frontmatter.required": "error",
    "frontmatter.fields": "error",
    "link.broken": "error",
    "link.index-missing": "warn",       // 需 index
    "link.type-mismatch": "warn",
    "page.orphan": "warn",
    "citation.malformed": "error",
    "citation.target-missing": "error", // 需 sourceDir
    "provenance.excess-inferred": "warn",
    "provenance.low-confidence": "warn",
    "provenance.contradicted": "warn",
    "placeholder.present": "warn"
  }
}
```

**优雅降级**：未声明 `index` → index-missing 规则跳过并在报告头部提示
"index rules disabled (no index configured)"；未声明 `sourceDir` →
citation.target-missing 只按 roots 相对路径解析。**默认配置下不声明任何
私有路径即可用**——装上就能跑是 Star 转化的第一关。

**代码结构**（从 wiki-lint.mjs 抽取，目标 ≤700 行 + 测试）：

```
cli/
├── bin.js               # 参数解析、exit code、--json
├── config.js            # .trustwiki.json 加载 + 默认值合并 + 校验（错误→exit 2）
├── walk.js              # 目录遍历（沿用 wiki-lint 的 walk，去私有过滤）
├── frontmatter.js       # 解析器（沿用 readFrontmatter；多行值/列表支持）
├── links.js             # wikilink 解析 + link graph（resolveWikilink/buildLinkGraph 泛化）
├── citations.js         # ★ 新写：引用语法解析器（见 3.2 语法），wiki-lint 里是内联正则
├── rules/*.js           # 每规则一文件：{ id, run(vault, config) → findings[] }
└── report.js            # text（人读，含 file:line）+ json（机读，CI 用）
```

**CLI 契约**：
- `npx trustwiki lint <path>`；`--json` 输出 findings 数组；`--config <file>` 覆盖。
- finding 格式：`{rule, severity, file, line, message, hint}`——`hint` 给一句修复建议。
- exit：0 = 无 error；1 = 有 error（warn 不影响）；2 = 配置/用法错误。

### 3.2 schema/ —— 开放规范（引用语法是核心资产）

`schema/spec.md`（EN）+ `schema/spec.zh.md`，含版本号 `trustwiki-schema v0.1`。

**引用语法（形式化，v0.1 冻结）**：

```
citation   := "^[" source-list "]"
source-list:= source ( ", " source )*
source     := path ( line-ref | anchor-ref )?
path       := vault 内相对路径，允许带或不带 .md 后缀
line-ref   := ":" start "-" end        （如 ^[sources/abc.md:42-58]）
anchor-ref := "#L" start "-L" end     （如 ^[sources/abc.md#L42-L58]）
```

规则：引用只出现在散文段落尾；标题/列表项/代码块不挂引用（规范明文 +
lint 用启发式检查）；无来源的推断段落允许存在但占比超阈值报
`provenance.excess-inferred`（默认 warn，阈值进配置）。

**Frontmatter 规范**：required = `title, created, updated, type, tags`；
sources 类页面增加 `source_url, ingested, sha256`；provenance 可选字段 =
`confidence (0-1), provenance_state (extracted|merged|inferred|ambiguous),
contradicted_by (list)`。

**矛盾标记**：正文 `> [!contradiction] 参见 [[x]] 持相反观点` +
frontmatter `contradicted_by` 双写；lint 的 `provenance.contradicted`
检查两处一致性（这是从 wiki 实战中提炼的规则，规范里给由来）。

### 3.3 SKILL.md —— 方法本体

从 WORKFLOW.md（752 行）蒸馏到 ≤200 行，去掉全部私有运维（inbox 评分、
SHA-256 增量存储、微信/邮件），保留可迁移的纪律骨架：

1. **Ingest**：来源先落库（frontmatter 含 source_url/ingested/sha256），
   正文不修改原文。
2. **Synthesize**：新页必须 ≥2 出链 + 指向 raw 源的回链；散文段落挂引用；
   推断内容标注、不伪装成引用。
3. **Evolve**：改页必须 bump `updated`；发现冲突打矛盾标记而非悄悄改写；
   索引与页数同步维护。
4. **Gate**：提交前跑 lint，0 error 才算完成。

每个阶段配"违反后果"的真实例子（脱敏自本 wiki 的 maintenance 记录，
如 index 粘行事故）——规则的存在理由比规则本身更可迁移。

### 3.4 templates/

- **starter-vault/**：`index.md` + `notes/` + `sources/` + `.trustwiki.json`
  （最小配置，开箱 0 error）+ 三个示例页（一页带引用、一页推断标注、一对矛盾）。
- **demo-vault/**：预埋缺陷的演示库，**同时是 golden 测试夹具和 GIF 脚本**：

| 预埋缺陷 | 触发规则 | GIF 镜头 |
|---|---|---|
| 散文段无引用且推断超阈值 | provenance.excess-inferred | 黄色警告 |
| 引用指向不存在的文件 | citation.target-missing | 红色 error |
| 引用语法写错（`^[abc]` 无路径） | citation.malformed | 红色 error |
| 一对互相矛盾的页面 | provenance.contradicted | 高亮+"矛盾现形" |
| [[broken-link]] | link.broken | 红色 error |
| （修复演示）改对引用后 | — | 全绿 + exit 0 |

## 4. 错误处理

- 解析失败的 frontmatter：finding 报 `frontmatter.required`（不 crash，
  跳过该文件其余 frontmatter 依赖规则，正文规则照跑）。
- 配置文件非法 JSON / 未知 rule id：stderr 明示 + exit 2（不静默降级）。
- 超大 vault：walk 保持流式（沿用现有实现），v1 不做缓存/并行（YAGNI）。

## 5. 测试策略

1. **单元**：citations.js（语法边界：多源、行区间、无后缀路径、非法输入）、
   frontmatter.js（多行值、列表、损坏块）、links.js（`[[x|y]]`、跨目录、锚点）。
2. **golden**：demo-vault 每个预埋缺陷断言一条 finding（file:line:rule 精确匹配）
   ——fixture 即演示，演示即测试，一份维护。
3. **dogfood**：本 repo 的 docs/ 用自身 lint + 自身 config 检查（CI 里跑），
   README/STATS 数字断言由 CI 脚本复核（G4 的机器化）。
4. **迁移对照**：用 wiki 私有库当回归集（本地跑，不入 repo）——泛化版在
   自己 wiki 上必须复现 wiki-lint 的全部 findings 才算迁移完成。
   > **执行记录（2026-09-05）**：`PARITY OK`——wiki 上触发的 3 类
   > （orphan / excess-inferred / contradicted）全部被对应规则覆盖；
   > trustwiki 另以更严默认值报 15,052 findings（4.5MB JSON 全量可解析）。
   > 迁移中发现并修复 bin 的 `process.exit()` 截断大输出 bug（改 `exitCode`）。

## 6. 里程碑

| 阶段 | 内容 | 完成判据 | 估量 |
|---|---|---|---|
| M1 | cli 核心：config/walk/frontmatter/links/citations + 5 条核心规则 + golden | demo-vault 全绿脚本跑通 | 2-3 天（最大工程项）|
| M2 | 全部 12 条规则 + --json + 迁移对照通过 | wiki 回归集 findings 一致 | 1-2 天 |
| M3 | schema spec + SKILL.md + starter/demo templates + docs | dogfood CI 绿 | 1-2 天 |
| M4 | README 双语 + GIF + proof/STATS + npm 发名 + 发布包 | 名字 npm/GitHub 双查、真机 30s 跑通 | 1 天 |

## 7. 发布前检查（硬门）

- npm `trustwiki` 名查重（GitHub 已零重名，npm 未查）。
- README/STATS 每个数字标来源+核实日期（wiki 页数用 lint 实数，
  index 6,611 行 vs AGENTS.md 8,597 页的出入必须先消解）。
- 开源面零私有内容：schema/skill/模板脱敏审查（2026-09-03 公共卫生清理后复检）。
- 运行时长表述统一 "operating since 2026-05"（禁用"一年"）。

## 8. Spec 自审记录

- 占位符：无 TBD；数字类不确定性已显式列为发布前检查项，非占位。
- 一致性：§3.1 规则表与 §3.4 缺陷映射一一对应（12 规则 vs 6 镜头，
  GIF 只取子集，无矛盾）。
- 歧义消解：`path` 允许带/不带 `.md` 已写死；warn 不影响 exit code 已写死。
- 范围：单实现计划可承载（M1-M4 线性，无跨子系统依赖），不需拆分。
