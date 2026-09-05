---
title: 有记忆的 MCP Agent
created: 2026-09-05
updated: 2026-09-05
type: note
tags: [mcp, memory, architecture]
---

MCP 与记忆解决的是两个正交问题：MCP 管能力连接，记忆管经验积累。组合架构因此是关注点分离的，不是堆叠的。^[sources/mcp-overview.md] ^[sources/agent-memory-landscape.md]

按来源给出的趋势判断，2026 年的组合形态是：文件式记忆做索引（保存偏好、项目上下文、历史决策），向量召回做扩展层，MCP 统一工具面。^[sources/agent-memory-landscape.md]

一条来源没有展开、但工程师应该警惕的边界：记忆文件自身也会腐烂（过时条目、重复）。本知识库用 trustwiki 纪律对抗这个问题——这正是 Gate 阶段存在的理由（本句为工程推断，非来源内容）。^[sources/agent-memory-landscape.md] 相关：[[mcp-explained]]、[[agent-memory-options]]。
