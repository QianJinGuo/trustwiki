---
title: Agent 记忆方案对比
created: 2026-09-05
updated: 2026-09-05
type: note
tags: [memory, agents]
---

Agent 跨会话记忆的两条主流路线：**文件式**（CLAUDE.md、memory 目录）与**向量库检索**。^[sources/agent-memory-landscape.md]

文件式的核心优势是三重可审计：可版本控制（git 追溯每次变更）、人类可读（直接打开检查）、agent 友好（无需额外检索层）。代价是规模上限——记忆量大后检索效率下降。^[sources/agent-memory-landscape.md]

向量库路线换取规模与语义召回，但引入基础设施与调试成本。值得注意 2026 年的趋势判断是**混合路线**：文件做索引层、向量做召回层。^[sources/agent-memory-landscape.md]

决策启发：这不是二选一，而是先后问题。相关：[[mcp-explained]]、[[memory-mcp-combo]]。
