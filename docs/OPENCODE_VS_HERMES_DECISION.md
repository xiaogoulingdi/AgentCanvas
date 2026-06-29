# OpenCode vs Hermes Agent 决策

日期：2026-06-29

## 结论

Agent Canvas 当前阶段选择 OpenCode 作为主线，Hermes Agent 作为补充参考。

```text
Primary Line: OpenCode
Supplemental Reference: Hermes Agent
Phase 1 Out of Scope: self-improvement / autonomous skill learning / long-term personal memory
```

## 为什么主线选 OpenCode

Agent Canvas 当前定位是 AI 编程入口：

```text
User Prompt
-> Engine Selector
-> Workflow Definition
-> Execution Plan
-> Coding Agent Runtime
-> Tool Broker / Permission
-> Event Log
-> Trace / Artifact / Patch
```

OpenCode 更贴近这个闭环：

- 它本身就是 coding agent。
- 有 agents/subagents 的产品抽象。
- 有 model/provider config。
- 有 permissions。
- 有 MCP。
- 有 ACP/editor integration。
- 有 server/API 方向。

因此第一阶段优先研究：

- OpenCode config 能否承载 Agent Canvas engine registry。
- OpenCode agent 能否映射 workflow node。
- OpenCode permission 能否映射 Agent Canvas permission policy。
- OpenCode tool/MCP 能否作为 Tool Broker 底层。
- OpenCode ACP/server 能否作为桌面 app 或 IDE 入口的 backend。
- OpenCode events/logs 能否映射 Agent Canvas Trace。

## Hermes Agent 放在哪里

Hermes Agent 的新东西很多，但它的核心强项更偏通用 autonomous agent 和 self-improving agent platform。

Phase 1 暂不做：

- 自我改进。
- 自动生成 skills。
- 长期人格记忆。
- 自动学习用户偏好并修改自身行为。
- 跨项目长期 memory 注入。

因此 Hermes 不作为第一主线，但仍很值得补充参考：

- provider runtime resolution
- tool registry / toolsets
- gateway 多入口设计
- terminal backend / sandbox
- SQLite/FTS5 session storage
- skills/memory 的长期方向

## 对比矩阵

| 维度 | OpenCode | Hermes Agent | Agent Canvas 取舍 |
|---|---|---|---|
| 核心定位 | coding agent | autonomous/self-improving agent | 先做 coding app，所以 OpenCode 主线 |
| 编码任务 | 强 | 可做但不是唯一中心 | OpenCode 更贴近 |
| 权限系统 | 明确相关 | 有工具/执行环境能力，需进一步审计 | 先看 OpenCode |
| MCP/tool | 明确相关 | tool registry 更丰富 | OpenCode 主线，Hermes 补工具组织 |
| ACP/editor | 明确相关 | 也有 ACP | 两者都看，OpenCode 优先 |
| Provider routing | 有 provider/model config | provider runtime resolution 很值得看 | Hermes 补充 |
| Workflow graph | 不是天然完整 graph compiler | 也不是 Agent Canvas 专用 graph compiler | Agent Canvas 自己保留 workflow compiler |
| Event log / trace | 需审计 | 需审计 | Agent Canvas 自己保留 event projection |
| 自我改进 | 不是重点 | 核心亮点之一 | Phase 1 不做 |
| 技术栈 | 更适合 coding tool integration | Python 主体更强 | OpenCode 更贴近桌面/Node 集成 |

## 第一阶段决策

第一阶段要验证 OpenCode，而不是先 fork Hermes。

优先顺序：

1. OpenCode source/API audit。
2. `OpenCodeBackendAdapter` spike。
3. Event mapper：OpenCode runtime output -> Agent Canvas events。
4. Permission mapper：Agent Canvas permission policy -> OpenCode permission/tool config。
5. Engine mapper：Agent Canvas engine/workflow -> OpenCode model/provider/agent config。
6. Hermes supplement audit：只补 provider resolution、tool registry、gateway、sandbox。

## 保留 Agent Canvas 自己做的部分

即使 OpenCode 做主线，Agent Canvas 也不应完全等于 OpenCode shell。

Agent Canvas 自己保留：

- Engine Selector：统一 single model / router / workflow。
- Workflow Definition：描述多 Agent、多模型、多阶段任务。
- Workflow Compiler：把 workflow 编译成 execution plan。
- Event Projection：统一 Trace、Canvas、Artifact。
- Model Cost Strategy：性价比模型搭配。
- UI Canvas：展示和编辑当前任务执行计划。
- Artifact/Patch Review：面向用户的产物和代码变更体验。

OpenCode 提供：

- coding agent backend。
- tool execution。
- file/search/shell/MCP 能力。
- permission 基础能力。
- ACP/server/editor integration 参考。

Hermes 提供参考：

- provider runtime resolution。
- tool registry organization。
- gateway pattern。
- terminal backend / sandbox。
- skills/memory 的长期路线。

