# trustwiki — Repo 方案草案（v0.1，待用户定夺）

日期：2026-09-05 · 状态：DRAFT · 框架：四项评估修正后形态
**卖纪律与方法 + 活体证明；不卖魔法管线。**

---

## 1. 定位

**一句话（EN）**: Trustworthy knowledge bases your agent can maintain —
every claim cited, contradictions surfaced, rot detected.
**一句话（zh）**: 让 agent 维护的知识可信：每个论断有引用，矛盾自动现形，腐化有仪器测。

**它是什么**：把这套 wiki 运行一年多的纪律——claim-level 引用语法、矛盾检测、
lint 仪器、四阶段管线（Ingest → Synthesize → Cite → Evolve）——抽成
可安装的 agent skill + 一个 `npx` 即跑的 lint CLI + 一份开放规范（schema）。

**它不是什么（诚实边界，写进 README 的差异点）**：
- 不是 "dump sources, get a wiki" 的魔法——没有纪律的自动知识库产出的是
  引注漂亮的 slop（本会话四项评估的结论，原文见项目记忆）。
- 不含私有运维（cron 车队、邮件/IMAP、微信管线、公开投影脚本）——那是跑在
  作者机器上的 ops，不属于开源面。

## 2. 活体证明（发布前必须核实的数字）

| 指标 | 草案用值 | 来源 | 状态 |
|---|---|---|---|
| 运行时长 | since 2026-05（日志可查，非"一年"） | log-2026-05.md | ✅ 已核实 |
| 页面数 | **待定**：index 实际 6,611 行 vs AGENTS.md 称 8,597 页 | `node scripts/wiki-lint.mjs` 实数 | ⚠️ 发布前核实 |
| raw 源文件 | 4,126 | AGENTS.md | ⚠️ 复核 |
| lint | 0 errors | 最近一次运行 | ⚠️ 发布当天跑 |
| contradiction scan | 每 12h 自动 | CRON.md | ✅ |

> 纪律：README 里每个数字标注来源与核实日期。这是产品方法论的自我演示——
> 我们卖的就是"每个论断可溯源"，README 第一个身体力行。

## 3. Repo 结构（v1）

```
trustwiki/
├── README.md              # EN-first + zh 双语；hero 即定位句 + 活体数字表
├── SKILL.md               # 方法本体：四阶段管线，任何 agent 可装（Claude Code/Codex/OpenClaw）
├── cli/                   # npx trustwiki lint ./vault —— 从 wiki-lint.mjs 泛化（配置驱动）
├── schema/                # 开放规范：frontmatter 形状、引用语法 ^[src.md:42-58]、
│                          #   矛盾标记 [!contradiction]、provenance 字段（confidence 等）
├── templates/starter-vault/  # 起步骨架（index/log/schema 种子）
├── templates/demo-vault/     # 预埋缺陷的演示库（假引用、缺引用、矛盾对、孤页）
├── docs/method.md         # 方法指南：为什么每个规则存在（每条规则对应一种真实的腐烂方式）
└── proof/STATS.md         # 活体运行统计（月更），链接公开 wiki-book 投影
```

**v1 明确不做**：cron 自动化、ingest 生产管线、多语言、编辑器插件、云服务。

## 4. 差异化（对谁讲清楚）

| 邻位 | 他们回答 | 我们不同 |
|---|---|---|
| llm-wiki-agent（3.5k★，玩具级领先者） | 丢来源自动长 wiki | 我们不比谁长得快，比谁不腐烂 |
| Graphify（114.7k★） | codebase→可查询 KB | 查询已有知识 vs 合成+溯源新知识 |
| claude-mem（93.2k★） | agent 记忆 | 给 agent 的记忆 vs 给人的可信知识库 |
| markdownlint / Vale | 文体风格 | 引用与矛盾是真相层，不是文体层 |

## 5. 发布弹药与清单

- **Demo GIF（8-15s）**：对 demo-vault 跑 `npx trustwiki lint`——假引用被抓、
  矛盾对自动现形、修复后转绿。这是"不看代码能懂"的验收。
- **Show HN 标题候选**：
  1. "Show HN: Trustwiki – a discipline for agent-maintained knowledge bases (every claim cited)"
  2. "Show HN: My agent maintains a 6,600-page wiki. Here's the discipline that keeps it honest"
- **数据炮弹**：附带一手扫描（5,984 skills 卫生 1.1%、wiki 自身 lint 记录）作评论区佐证。
- 分发顺序：Show HN（周二）→ V2EX → 即刻 → X；双语 README 双端吃。
- **首周纪律**：48h 内每条 issue 当天回；不发版本号虚诺（v0.x 诚实标 alpha）。

## 6. 风险与边界

1. **私有内容零泄漏**：开源面 = schema/lint/skill/模板（无任何真实笔记内容）；
   活体证明只链接公开投影（wiki-book）。发布前跑一次公开边界检查（2026-09-03 刚做过一轮）。
2. **品类年轻**：LLM-wiki 浪潮可能降温——对冲是这套纪律作者自用，Star 是纯上行。
3. **lint 泛化成本**：wiki-lint.mjs 与 wiki 私有约定耦合，抽配置层需要真工作量
   （估 2-4 天），这是 v1 最大的工程项。
4. **价值演示门槛**：纪律的价值要跑起来才懂——demo-vault 的预埋缺陷就是为此设计。

## 7. 待用户定夺（3 个决定）

1. **名字**：`trustwiki`（推荐：定位即名字、CLI 顺口、零重名）/
   `wikiwitness`（更有辨识度，"每个论断有证人"）/
   `wikiforge`（你自己的旧词，但有 49 个轻占位）。
2. **门面顺序**：CLI-first（`npx trustwiki lint` 30 秒可跑，Star 转化高）
   还是 Skill-first（agent 生态分发广，但演示门槛高）。推荐 CLI-first，SKILL.md 并列呈现。
3. **语言顺序**：EN-first（HN 吃）+ zh 完整版，还是 zh-first。推荐 EN-first。
