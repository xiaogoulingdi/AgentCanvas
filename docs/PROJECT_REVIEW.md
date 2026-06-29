# Agent Canvas 项目审查

日期：2026-06-29

本文审查当前 Agent Canvas 方向中不明确、不合理、没必要优先做，以及已有项目已经做过的部分。

## 当前项目判断

Agent Canvas 的核心卖点应该是：

> 在 AI 编程入口里，把单模型、多模型路由、多 Agent 工作流统一成一个可选择、可追踪、可控成本的执行引擎。

它不应该先变成：

- 又一个通用聊天客户端。
- 又一个独立工作流拖拽画布。
- 又一个从零实现的 coding agent。
- 又一个 self-improving personal agent。
- 又一个完整 IDE 替代品。

## 已有项目已经做得很强的地方

### Coding agent backend

已有项目：

- OpenCode
- Claude Agent SDK
- Cursor / Trae / Codex 类产品
- OpenHands

建议：

- 不要从零实现 coding agent loop。
- 第一阶段以 OpenCode 为主线，做 adapter / fork / subprocess / ACP 评估。

### 通用 autonomous agent 和 self-improvement

已有项目：

- Hermes Agent
- AutoGPT 类项目
- CrewAI / AutoGen 系列

建议：

- Phase 1 不做自我改进。
- Hermes 只做补充参考。

### Workflow graph runtime

已有项目：

- LangGraph
- CrewAI Flows
- Temporal / durable execution 类系统

建议：

- Agent Canvas 保留轻量 workflow compiler。
- 不要第一阶段做完整通用工作流平台。
- Canvas 的 graph 只服务 coding task execution，不做 Zapier/Make 那类通用自动化。

### Model gateway / routing

已有项目：

- LiteLLM
- OpenRouter
- Portkey
- RouteLLM

建议：

- 不要第一阶段自研复杂网关。
- 先做 rule-based model routing。
- 记录成本、延迟、失败率，为后续性价比策略做数据。

### Project map / large codebase

已有项目：

- Plandex
- Sourcegraph/Cody
- tree-sitter/LSP/ripgrep 生态

建议：

- 不要把代码理解全交给模型。
- 第一阶段只保留 `project-map` 包边界。
- 后续接 ripgrep、LSP、tree-sitter。

## 当前不明确的地方

### 1. Agent Canvas 是产品层还是 runtime 层？

建议明确：

- 产品层：Agent Canvas 的主要价值。它面向用户，用来可视化配置模型、路由、Agent 分工、权限和执行策略。
- Runtime 层：尽量复用 OpenCode。

Agent Canvas 应做：

- engine selector
- workflow config
- trace/canvas/artifact UI
- model cost strategy
- model/provider selection UI
- route model generator
- supervisor/subagent configuration
- permission and budget configuration

OpenCode 应做：

- coding agent execution
- file/search/shell/MCP/tool
- permission backend

### 2. Workflow 的粒度

不要一开始支持任意复杂图。建议使用“有界图”作为第一阶段粒度：它可以表达总 Agent、分 Agent、分工和有限讨论，但不能无限扩张。

Phase 1 支持：

- sequential steps
- simple branch
- named agent nodes
- model route per node
- tool scope per node
- supervisor agent
- subagent roles
- bounded discussion rounds
- max step / max cost / max time limits

暂不支持：

- 任意循环
- 动态生成无限子图
- 无限多 Agent 自主扩张
- 无上限互相讨论
- 多租户分布式调度
- 跨项目长期自动任务

判断：

- `review -> code -> review` 这种最多 2-3 轮的有界循环可以做。
- `一直讨论直到满意` 这种无限循环不要做。
- `总 Agent 临时创建 100 个分 Agent` 不要做。
- `总 Agent 根据任务选择 2-5 个预定义分 Agent` 可以做。

### 3. Canvas 是编辑器还是观察器？

Phase 1 建议：

- Canvas 先做观察器。
- 展示 execution plan 和运行态。
- 展示每个 agent 的模型、工具、权限、成本和当前状态。
- 暂不做复杂拖拽编辑。

Phase 2 再做：

- 编辑 node。
- 拖拽连线。
- 配置模型 route。
- 保存为自定义 engine。

### 4. 权限到底谁管？

建议：

- Agent Canvas 定义产品层 permission policy，并在 Canvas 里让用户看见和配置。
- OpenCode 执行层承接具体 tool permission。
- Event log 记录每次 permission decision。

Canvas 需要展示：

- 每个 agent 能访问哪些工具。
- 哪些 agent 能读文件。
- 哪些 agent 能写 patch。
- 哪些 agent 能执行 shell。
- 哪些 action 需要 ask。
- 哪些 action 被 deny。

### 5. 模型路由是卖点还是底层实现？

建议：

- 模型路由应该是卖点之一。
- 但第一阶段只做规则路由，不做训练式 router。
- 重点是成本可解释：为什么这一步用便宜模型，为什么那一步升级到强模型。
- 后续支持用户偏好：便宜优先、质量优先、速度优先、隐私优先。
- Canvas 可以生成用户配置好的 route model / workflow engine。

## 没必要第一阶段做的东西

- 完整桌面端 UI。
- 完整工作流拖拽编辑器。
- 自我改进。
- 自动生成 skills。
- 长期用户记忆。
- 复杂模型网关。
- 云端多租户 sandbox。
- 训练模型路由器。
- 完整 IDE 替代。
- 从零实现 coding agent。

## 应该保留为第一阶段接口的东西

- Engine Selector
- Workflow Definition
- Workflow Compiler
- Backend Adapter
- Event Log
- Trace Renderer
- Artifact/Patch model
- Permission Policy
- Model Route Resolver
- Cost/usage event

## 建议的产品卖点表达

Agent Canvas 不是“另一个 AI IDE”，而是：

> 一个把模型选择升级为执行引擎选择的 AI 编程入口。

用户不是只能选：

```text
Claude
GPT
DeepSeek
GLM
```

而是可以选：

```text
Fast Fix
Cheap Research
Deep Code Review
UI Clone Team
Research + Code
OpenCode Agent
Agent Canvas Auto
```

每个选项背后可以是：

- 单模型。
- 多模型路由。
- 多 Agent workflow。
- OpenCode backend。
- 自定义 workflow。

## 下一步审查重点

1. OpenCode 能否作为主 backend。
2. OpenCode 的事件/日志能否映射 Agent Canvas Trace。
3. OpenCode 的 model/provider config 能否承载成本策略。
4. OpenCode 的 permission/MCP 能否满足 Tool Broker。
5. Hermes 的 provider/tool/gateway 设计哪些值得吸收。
