---
title: MCP 是什么
created: 2026-09-05
updated: 2026-09-05
type: note
tags: [mcp, protocol]
---

MCP（Model Context Protocol）是 Anthropic 于 2024 年 11 月发布的开放协议，用 USB-C 类比其定位：统一 AI 应用与数据源之间的连接方式。^[sources/mcp-overview.md]

2025 年 OpenAI 与 Google DeepMind 相继采纳后，MCP 从单公司方案转变为行业事实标准——这是判断它能否长期投入的关键信号。^[sources/mcp-overview.md]

核心原语有三个：**tools**（可调用的外部函数）、**resources**（可读取的数据）、**prompts**（预定义模板）。理解三者的分工是设计 MCP 集成的基础。^[sources/mcp-overview.md]

实践含义：团队选连接方案时，MCP 的事实标准地位意味着集成成本方向变了——过去是"为每个 AI 应用写一次集成"，现在收敛为"写一次 MCP server"。相关：[[agent-memory-options]]、[[memory-mcp-combo]]。
