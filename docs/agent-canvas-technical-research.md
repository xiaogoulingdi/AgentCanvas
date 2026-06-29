# Agent Canvas 技术调研报告

日期：2026-06-29

## 0. 说明

本报告按你的产品方向来调研：**把单模型、多模型路由、多 Agent 工作流统一放进一个编程入口中**，并通过画布和 Trace 暴露执行过程。

名称说明：

- “Cloud Code SDK” 本报告按 **Claude Code SDK** 理解。
- “OpenHandle” 本报告按 **OpenHands** 理解。
- “PI” 本报告按 **Pi Agent Harness** 理解。

## 1. 总结结论

Agent Canvas 不应该从“画布工具”开始做，而应该从一个 **Agent 工作流编译器 / 运行时** 开始做。

更准确的抽象是：

```text
用户输入
  -> 选择执行引擎：单模型 / 多模型路由 / 多 Agent 工作流
  -> Workflow Definition
  -> Execution Plan
  -> Agent Runtime
  -> Tool / Browser / Filesystem / LSP / Shell
  -> Event Log / Trace / Artifacts / Patch
```

也就是说，UI 画布只是 Execution Plan 和 Trace 的可视化。真正核心是：

1. **Workflow DSL**：如何描述一个工作流模型。
2. **Execution Plan**：如何把工作流编译成可执行步骤。
3. **Agent Runtime**：如何调度 Agent、工具、模型、权限。
4. **Event Log**：如何记录、恢复、调试、复现。
5. **Model Router**：如何在单模型、多模型、视觉模型、便宜模型之间做策略选择。

## 2. 参考项目调研

### 2.1 OpenCode

来源：

- OpenCode Agents: https://opencode.ai/docs/agents/
- OpenCode Config: https://opencode.ai/docs/config/
- OpenCode Permissions: https://opencode.ai/docs/permissions/
- OpenCode ACP: https://opencode.ai/docs/acp/
- OpenCode Server: https://opencode.ai/docs/server/
- OpenCode Models: https://opencode.ai/docs/models/
- OpenCode MCP: https://opencode.ai/docs/mcp-servers/

OpenCode 的价值在于：它已经是比较成熟的 **coding agent harness**。

它的结构重点：

- 支持 primary agents 和 subagents。
- Agent 可以有自己的 prompt、model、tool access。
- 通过 `opencode.json` 管理 provider、model、small_model、tools、MCP、instructions、plugins。
- 支持 MCP，把外部工具放进 Agent 工具层。
- 支持 permission config，决定工具调用是自动执行、询问，还是阻止。
- 支持 ACP，能作为编辑器里的 agent subprocess，通过 JSON-RPC over stdio 与编辑器通信。
- 支持 `opencode serve`，TUI 和其他客户端可以通过 server 交互。

它的代码流大致是：

```text
User Prompt
  -> OpenCode Session
  -> Agent Selection
  -> Model Call
  -> Tool Call Request
  -> Permission Gate
  -> Built-in Tool / MCP Tool / Shell / File Edit
  -> Observation
  -> Continue Agent Loop
  -> Patch / Answer / Artifact
```

对 Agent Canvas 的启发：

- 可以把 OpenCode 当成第一版的 **代码执行后端** 或 **ACP/编辑器入口参考**。
- Agent Canvas 的“执行引擎选择框”可以学习 OpenCode 的 model/provider 配置，但扩展成 workflow engine。
- OpenCode 的 agent/subagent 机制适合参考，但它不是完整的图形化 workflow runtime。
- 权限系统必须一开始就设计，不能后补。

限制：

- OpenCode 更偏 coding agent，不是可视化多 Agent 编排平台。
- 它可以运行 agents，但不是天然的 workflow graph 编译器。
- 如果直接基于 OpenCode 做所有调度，后续会受它内部 session/agent 模型限制。

建议：

- MVP 可以兼容 OpenCode 的 agent config 思想。
- 后续可提供 `export to OpenCode config` 或 `run via OpenCode ACP`。
- 但 Agent Canvas 自己需要独立的 workflow runtime schema。

### 2.2 Claude Code SDK

来源：

- Claude Code SDK Overview: https://docs.anthropic.com/en/docs/claude-code/sdk
- Claude Code Subagents: https://docs.anthropic.com/en/docs/claude-code/sub-agents
- Claude Code Hooks: https://docs.anthropic.com/en/docs/claude-code/hooks
- Claude Code Hooks Guide: https://docs.anthropic.com/en/docs/claude-code/hooks-guide
- Claude Code Settings: https://docs.anthropic.com/en/docs/claude-code/settings
- Claude Code MCP: https://docs.anthropic.com/en/docs/claude-code/mcp
- Claude Code Skills: https://docs.anthropic.com/en/docs/claude-code/skills

Claude Code SDK 的价值在于：它把 coding agent 拆成了几个很清楚的控制面：

- Built-in tools：Read、Write、Edit、Bash、Glob、Grep、WebSearch、WebFetch 等。
- Hooks：在生命周期点执行确定性逻辑。
- Subagents：隔离上下文，执行专门任务。
- MCP：接入外部工具。
- Permissions：控制工具权限。
- Sessions：支持会话状态。

Claude Code 的关键设计不是“多 Agent 本身”，而是 **hooks + permissions + subagents** 这套可控 agent loop。

典型代码流：

```text
User Prompt
  -> SDK query()
  -> SessionStart / UserPromptSubmit Hook
  -> Main Agent Model Call
  -> Tool Call
  -> PreToolUse Hook
  -> Permission Decision
  -> Execute Tool
  -> PostToolUse Hook
  -> Observation Back to Agent
  -> Optional Subagent Delegation
  -> Stop / SessionEnd Hook
```

对 Agent Canvas 的启发：

- Hooks 应该是 Agent Canvas runtime 的一等公民。
- Hook 不应只用于日志，而应承担：
  - 权限判断
  - 成本限制
  - 命令拦截
  - 文件写入校验
  - 运行测试
  - 格式化
  - trace 事件记录
- Subagent 要支持 scoped tools / scoped MCP。视觉 Agent 不应该看到所有 repo 写权限。
- Skills 适合作为“可复用能力包”，但不等于 workflow。

建议：

- Agent Canvas 的 DSL 应该支持：

```yaml
hooks:
  preToolUse:
    - permissionGuard
    - costGuard
  postToolUse:
    - eventLogger
    - artifactCollector
```

### 2.3 OpenHands

来源：

- OpenHands Events: https://docs.openhands.dev/sdk/arch/events
- OpenHands Conversation: https://docs.openhands.dev/sdk/arch/conversation
- OpenHands Agent Server: https://docs.openhands.dev/sdk/arch/agent-server
- OpenHands Runtime Architecture: https://docs.openhands.dev/openhands/usage/architecture/runtime
- OpenHands Security: https://docs.openhands.dev/sdk/guides/security
- OpenHands Persistence: https://docs.openhands.dev/sdk/guides/convo-persistence
- OpenHands Parallel Tool Execution: https://docs.openhands.dev/sdk/guides/parallel-tool-execution
- OpenHands Software Agent SDK: https://github.com/OpenHands/software-agent-sdk

OpenHands 是最值得重点参考的 runtime 架构。

它的关键点：

- 使用 typed event system。
- Event log 是 append-only。
- Event 既是 agent memory，也是集成点。
- Conversation 管理 agent lifecycle、state orchestration、workspace coordination、runtime services。
- 支持 local conversation 和 remote conversation。
- Agent Server 可以通过 HTTP/WebSocket 远程控制 agent。
- Runtime 可以是本地，也可以是 Docker/Kubernetes/容器沙箱。
- 支持 confirmation policy 和 security analyzer。
- 支持 parallel tool execution 和 sub-agent delegation。

OpenHands 的核心循环可以理解为：

```text
User Message Event
  -> Conversation
  -> Agent
  -> LLM Message
  -> Action Event
  -> Runtime / Tool Execution
  -> Observation Event
  -> Event Log Append
  -> Agent Continues
```

它和 Agent Canvas 最契合的地方：

- 你的 Trace 面板本质上就是 event log 的 UI。
- 你的 Canvas 运行态本质上就是 conversation state + execution graph。
- 你的“任务产物”本质上是 event log 中 artifact 事件的投影。
- 你的“恢复任务”依赖 event-sourced persistence。

建议：

- Agent Canvas 应该采用 **event-sourced runtime**。
- 每次模型调用、工具调用、权限判断、人工确认、文件修改、测试结果都记录为 event。
- UI 不直接依赖临时状态，而是订阅 event stream。
- 这样才能支持：
  - 暂停/继续
  - 回放
  - 分支
  - 调试
  - 成本统计
  - 失败恢复

### 2.4 Pi Agent Harness

来源：

- Pi 官网: https://pi.dev/
- Pi GitHub: https://github.com/earendil-works/pi

Pi 的定位是 minimal agent harness。

它的包结构很有参考价值：

- `pi-ai`：统一多 provider LLM API。
- `pi-agent-core`：agent loop、tool calling、state management。
- `pi-coding-agent`：coding agent CLI。
- `pi-tui`：终端 UI。

Pi 的产品哲学是：不要做封闭产品，而是让用户修改 harness。

重要特征：

- 支持 extensions、skills、prompt templates、themes。
- 支持 AGENTS.md。
- 支持多 provider 和中途切模型。
- 支持 interactive、print/JSON、RPC、SDK 四种模式。
- 默认不内置复杂 sub-agents 和 plan mode。
- 官方 README 明确说明：Pi 默认没有内置 filesystem/process/network/credential 权限边界，需要容器化或 sandbox。

对 Agent Canvas 的启发：

- 架构要拆包：model API、agent core、coding runtime、UI 不应耦合。
- 产品要允许用户自定义 workflow engine、provider、tool、prompt。
- 但安全不能学 Pi 的默认模式。Agent Canvas 面向图形化和自动执行，必须内置权限系统。

建议：

- 借鉴 Pi 的可扩展包模型。
- 不建议照搬 Pi 的安全模型。
- 可以把 Pi 当成“轻量可 hack agent harness”的参考。

### 2.5 Plandex

来源：

- Plandex GitHub: https://github.com/plandex-ai/plandex

Plandex 的价值在于长任务和大代码库。

它强调：

- 适合 large tasks / real world projects。
- 可以处理跨很多步骤、很多文件的任务。
- 使用 tree-sitter project maps 为大项目建立代码地图。
- 支持 plan and execute。
- AI 生成变更可以先放在 cumulative diff review sandbox 中，用户 review 后再应用。

对 Agent Canvas 的启发：

- AST/代码地图应该是工具层，不应该全部交给 LLM。
- 大任务必须先计划，再执行。
- 代码变更最好先进隔离区，再让用户 review/apply。
- 对 UI Clone 这类任务，应该将“视觉观察”和“代码修改”分开存证。

建议：

- Agent Canvas 应内置 `ProjectMapService`：
  - tree-sitter
  - LSP diagnostics
  - ripgrep
  - dependency graph
- 代码修改采用 patch/artifact 模型，不要让 Agent 直接无痕改文件。

### 2.6 AutoGen

来源：

- AutoGen Agent Chat: https://microsoft.github.io/autogen/0.2/docs/Use-Cases/agent_chat/
- AutoGen GitHub: https://github.com/microsoft/autogen
- Microsoft migration guide: https://learn.microsoft.com/en-us/agent-framework/migration-guide/from-autogen/

AutoGen 的经典模式是 multi-agent conversation。

核心思想：

- Agent 是可对话对象。
- 多个 Agent 通过 GroupChat / manager 协调。
- 支持 human-in-the-loop。
- 支持工具和代码执行。

但注意：AutoGen 现在处于 maintenance mode，不建议作为新产品核心依赖。

对 Agent Canvas 的启发：

- 多 Agent 协作不一定要图结构，也可以是 conversation protocol。
- Supervisor / Manager 模式适合做 Controller Agent。
- 但纯聊天式多 Agent 容易失控，工程产品需要显式状态机和权限。

### 2.7 CrewAI

来源：

- CrewAI Docs: https://docs.crewai.com/
- CrewAI Quickstart: https://docs.crewai.com/quickstart
- CrewAI Crews: https://docs.crewai.com/v1.14.7/en/concepts/crews
- CrewAI Flows: https://docs.crewai.com/v1.15.1/en/concepts/flows

CrewAI 的核心抽象：

- Crew：一组协作 Agent。
- Flow：生产应用推荐结构，负责状态和执行顺序。
- Agent 在 Crew step 中完成具体工作。

对 Agent Canvas 的启发：

- 你的“工作流模型”应该更像 Flow，而不是单个 Agent。
- Flow 管顺序、状态、分支、错误处理。
- Agent 管某一步里的能力执行。

建议：

- Agent Canvas DSL 中区分：
  - `flow`
  - `agent`
  - `task`
  - `tool`
  - `artifact`

### 2.8 LangGraph

来源：

- LangGraph Workflows and Agents: https://docs.langchain.com/oss/python/langgraph/workflows-agents
- LangGraph Supervisor: https://reference.langchain.com/python/langgraph-supervisor
- LangChain Multi-agent Supervisor Pattern: https://docs.langchain.com/oss/python/langchain/multi-agent/subagents-personal-assistant

LangGraph 对 Agent Canvas 很重要，因为它提供了“图 + 状态”的正式模型。

关键观点：

- Workflows 是预定义路径。
- Agents 是动态决策和工具使用。
- Graph 能表达状态、分支、循环、持久化、流式输出、调试。
- Supervisor pattern 用中心 Agent 协调多个 specialized worker agents。

对 Agent Canvas 的启发：

- Canvas 上的节点应该编译成图，而不是只做 UI 装饰。
- 需要有 state schema。
- 需要显式 edge 条件。
- 需要支持 checkpoint / resume。

建议：

- 如果后端选 Python，可以认真评估 LangGraph。
- 如果后端选 TypeScript，可以借鉴 LangGraph 的概念，自建轻量 graph runtime。

### 2.9 LiteLLM / RouteLLM / OpenRouter / Portkey

来源：

- LiteLLM Routing: https://docs.litellm.ai/docs/routing
- LiteLLM Load Balancing: https://docs.litellm.ai/docs/proxy/load_balancing
- LiteLLM Fallbacks: https://docs.litellm.ai/docs/proxy/reliability
- RouteLLM GitHub: https://github.com/lm-sys/RouteLLM
- OpenRouter Model Fallbacks: https://openrouter.ai/docs/guides/routing/model-fallbacks
- Portkey Fallbacks: https://docs.portkey.ai/docs/product/ai-gateway/fallbacks
- Portkey Configs: https://docs.portkey.ai/docs/product/ai-gateway/configs

你的“模型配置引擎”可以参考这些项目。

LiteLLM 适合做统一 API 网关：

- provider abstraction
- load balancing
- fallback
- model aliases
- metrics

RouteLLM 适合做成本/质量路由：

- 强模型 / 弱模型选择
- 通过阈值控制 cost-quality tradeoff
- 可作为“复杂度判断器”的参考

OpenRouter / Portkey 适合参考产品层：

- model fallback
- provider routing
- config-driven gateway
- logging / observability

建议：

- 第一版不要直接训练路由器。
- 先做规则路由：

```yaml
routes:
  planning:
    model: glm-4.5
  code:
    model: deepseek-v4-flash
  vision:
    model: openai-vision
    trigger: screenshot_required
  review:
    model: auto
    fallback: claude
```

后续再加入复杂度评分、历史成功率、成本预算。

## 3. 推荐架构

### 3.1 四层架构

```text
UI Layer
  Trae-like Code entry
  Engine selector
  Plan / Canvas / Trace
  Artifact panel

Application Layer
  Workflow Manager
  Workflow Compiler
  Session Manager
  Event Stream API
  Permission / Approval API

Runtime Layer
  Agent Runtime
  Tool Broker
  Model Router
  Context Builder
  Project Map Service
  Workspace / Sandbox

Integration Layer
  OpenCode / ACP
  OpenHands Agent Server
  LiteLLM / OpenRouter
  Browser automation
  LSP / tree-sitter / ripgrep
  MCP servers
```

### 3.2 “AI 编译器”类比

可以把 Agent Canvas 当成一个 AI 编译器：

| 编译器概念 | Agent Canvas 对应 |
|---|---|
| Source Code | 用户 prompt + workflow config + repo context |
| Parser | workflow DSL parser / prompt intent parser |
| AST | workflow graph |
| IR | execution plan |
| Optimizer | model router / context budget / parallelization |
| Runtime | agent loop / tool broker / sandbox |
| Debug Info | event log / trace / cost log |
| Binary Output | patch / artifacts / report |

这个类比很适合你的项目，因为你确实在做一种“把意图编译成 Agent 执行计划”的系统。

## 4. 核心数据模型建议

### 4.1 Execution Engine

模型选择框里不应该只叫 model，而应该叫 `engine`。

```ts
type ExecutionEngine =
  | SingleModelEngine
  | RouterEngine
  | WorkflowEngine;
```

示例：

```yaml
engines:
  - id: deepseek-v4-flash
    type: single_model
    model: deepseek/v4-flash

  - id: agent-canvas-auto
    type: router
    routes:
      planning: glm-4.5
      code: deepseek-v4-flash
      vision: openai-vision

  - id: ui-clone-team
    type: workflow
    workflow: workflows/ui-clone-team.yaml
```

### 4.2 Workflow Definition

```yaml
id: ui-clone-team
name: UI Clone Team
entry: controller

nodes:
  controller:
    type: agent
    model: glm-4.5
    tools: [plan, delegate]

  vision:
    type: agent
    model: openai-vision
    tools: [browser_screenshot]
    permissions:
      filesystem: none

  ast:
    type: tool
    tool: project_map

  code:
    type: agent
    model: deepseek-v4-flash
    tools: [read, edit, bash]

  review:
    type: agent
    model: auto
    tools: [browser_screenshot, diff]

edges:
  - from: controller
    to: vision
    when: needs_visual
  - from: controller
    to: ast
  - from: ast
    to: code
  - from: code
    to: review
```

### 4.3 Event Log

Event log 应该是一等公民。

```ts
type AgentEvent =
  | UserPromptSubmitted
  | EngineSelected
  | WorkflowCompiled
  | AgentStarted
  | ModelRequestStarted
  | ModelRequestCompleted
  | ToolCallRequested
  | PermissionRequested
  | PermissionResolved
  | ToolCallCompleted
  | FilePatchCreated
  | ArtifactCreated
  | CostUpdated
  | AgentCompleted
  | WorkflowCompleted
  | WorkflowFailed;
```

UI 的 Trace、右侧待办、成本统计、产物，都应从 event log 派生。

## 5. 代码流建议

### 5.1 单模型代码流

```text
Prompt
  -> EngineSelector selects SingleModelEngine
  -> ContextBuilder loads repo context
  -> AgentRuntime starts one agent
  -> ToolBroker mediates tools
  -> PermissionPolicy gates risky calls
  -> Patch / Answer
```

### 5.2 多模型路由代码流

```text
Prompt
  -> RouterEngine classifies task
  -> Planning model generates plan
  -> Code model edits files
  -> Vision model used only on screenshot events
  -> Review model validates result
  -> Unified trace / cost report
```

### 5.3 多 Agent 工作流代码流

```text
Prompt
  -> WorkflowEngine loads workflow definition
  -> WorkflowCompiler builds execution plan
  -> Controller Agent starts
  -> Worker Agents run by graph edges
  -> Tool calls go through ToolBroker
  -> Events appended after every step
  -> Artifacts generated
  -> Final review
```

## 6. MVP 边界建议

第一版不要做：

- 任意拖拽复杂工作流编辑器
- 自动训练模型路由器
- 完整云端多租户 sandbox
- 超复杂多 Agent 自主协作
- 完整 IDE 替代品

第一版应该做：

1. Trae-like Code 入口。
2. 统一执行引擎选择框：
   - Single model
   - Agent Canvas Auto
   - UI Clone Team
   - Research + Code
3. Workflow YAML/JSON 定义。
4. Workflow compiler。
5. Event log。
6. Agent runtime with tool broker。
7. Model router with rule-based routing。
8. Plan / Canvas / Trace 三个视图。
9. Patch/artifact 输出。
10. 权限确认。

## 7. 测试和优化必须纳入流程

### 7.1 测试

必须有：

- Unit tests:
  - workflow parser
  - graph compiler
  - model route resolver
  - permission policy
  - event reducer

- Integration tests:
  - agent calls tool
  - tool returns observation
  - event log records full loop
  - file patch generated
  - failed tool call handled

- E2E tests:
  - 输入任务
  - 选择 workflow engine
  - 生成 plan
  - 执行 fake tools
  - 产出 trace/artifact

- Visual tests:
  - Code entry
  - engine selector
  - canvas
  - trace panel

- Safety tests:
  - blocked bash command
  - denied file write
  - prompt injection from webpage
  - expensive model budget exceeded

### 7.2 优化

优化方向：

- 降低视觉模型调用次数。
- 优先使用 AST/LSP/ripgrep 等确定性工具。
- 对工具 schema 和 MCP server 做上下文裁剪。
- 对 workflow 做并行化，但禁止并行写同一文件。
- 对模型调用做成本追踪和预算限制。
- 对 event log 做压缩和摘要。

## 8. 建议开发流程

### Phase 0：调研和决策

产出：

- `RESEARCH.md`
- `DECISIONS.md`
- 参考项目矩阵
- 选型结论

### Phase 1：技术 Spike

目标：跑通最小闭环。

产出：

- workflow JSON/YAML
- fake model adapter
- fake tool adapter
- workflow compiler
- event log
- trace renderer

### Phase 2：PRD 和技术规范

产出：

- `PRD.md`
- `ARCHITECTURE.md`
- `WORKFLOW_ENGINE.md`
- `MODEL_ROUTING.md`
- `AGENT_RUNTIME.md`
- `UI_SPEC.md`
- `SECURITY.md`
- `TEST_PLAN.md`

### Phase 3：MVP 开发

模块顺序：

1. Workflow schema
2. Event log
3. Model router
4. Tool broker
5. Agent runtime
6. UI Code entry
7. Engine selector
8. Canvas view
9. Trace view
10. Artifact/patch view

### Phase 4：真实 coding backend 集成

候选：

- OpenCode ACP
- OpenCode server
- OpenHands Agent Server
- 自建 lightweight runtime

建议：

- 前期自建轻量 runtime，保证产品核心抽象清晰。
- 中期接 OpenCode/OpenHands 作为可选 backend。

### Phase 5：安全、测试、优化

必须包括：

- 权限策略
- sandbox 策略
- prompt injection 防护
- 成本上限
- trace replay
- visual regression

## 9. 是否需要下载开源项目

公开项目不需要你手动下载，我可以自己 clone 到 `work/research/`。

建议分两步：

1. 先基于官方文档和 README 做架构调研，也就是本报告这一步。
2. 下一步再 shallow clone 重点项目做代码级调研：
   - `opencode-ai/opencode`
   - `OpenHands/software-agent-sdk`
   - `earendil-works/pi`
   - `plandex-ai/plandex`

你需要提供的只有：

- 如果 “OpenHandle” 不是 OpenHands，请给我正确链接。
- 如果 “Cloud Code SDK” 不是 Claude Code SDK，请给我正确链接。
- 如果你说的 PI 是另一个项目，也请发链接。
- 私有仓库、付费资料、网盘资料需要你提供。

## 10. 最终建议

Agent Canvas 的第一性原理不是“画布”，而是：

> 一个能把用户意图编译成可控、多模型、多 Agent 执行计划的 coding runtime。

因此架构上应优先实现：

1. Engine selector：统一单模型和工作流模型。
2. Workflow compiler：把工作流定义变成执行计划。
3. Event-sourced runtime：所有执行过程可追踪、可恢复、可调试。
4. Tool broker：所有工具调用统一权限和审计。
5. Model router：按任务类型、成本、能力路由模型。
6. UI canvas：展示和编辑执行计划，而不是承担核心逻辑。

这条路线最稳，也最能形成差异化。
