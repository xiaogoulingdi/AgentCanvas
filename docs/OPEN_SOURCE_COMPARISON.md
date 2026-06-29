# 开源 Agent 框架对照

日期：2026-06-29

本文用于把调研文档中的开源项目转化为 Agent Canvas 的具体设计约束。当前策略是 framework-first：先评估能否直接复用、fork 或包装成熟 agent 框架，再决定哪些部分需要自研。

## 总结

Agent Canvas 第一阶段采用 framework-first 策略，但不把产品核心直接锁死在某一个框架内部：

- OpenCode：作为第一主线，优先评估作为 primary coding backend，参考或复用 agents、permission、MCP、ACP/server。
- Hermes Agent：作为补充参考，重点参考 provider resolution、tool registry、gateway、terminal backends、skills/memory 设计。
- Pi Agent Harness：优先评估作为 TypeScript-native agent core，参考或复用包分层和轻量 harness。
- OpenHands：优先评估作为 remote/local Agent Server backend，参考或复用 event system、conversation、安全策略。
- Claude Agent SDK：优先评估作为 SDK adapter，参考 hooks、permissions、subagents、sessions。
- LangGraph：参考 graph、shared state、checkpoint、subgraph。
- LiteLLM/OpenRouter/Portkey：参考 model gateway、fallback、routing。
- Plandex：参考 project map、patch review sandbox、大任务 plan/execute。

## 对照矩阵

| 项目 | 核心抽象 | 推荐集成方式 | Agent Canvas 可借鉴 | 风险 |
|---|---|---|---|---|
| OpenCode | coding agent harness | primary backend adapter / fork / subprocess / ACP | agents、permissions、MCP、ACP/server、provider/model config | 不一定天然支持 Agent Canvas workflow compiler |
| Hermes Agent | self-improving autonomous agent platform | supplemental architecture reference / secondary backend candidate | provider resolution、tool registry、gateway、terminal backends、skills、memory | Python 主体，自我改进不是 Phase 1 目标 |
| Pi Agent Harness | lightweight TS agent toolkit | package reuse/fork | 包分层、provider abstraction、可 hack harness、CLI 优先 | 安全边界需要补强 |
| OpenHands | event-sourced agent SDK | Agent Server / REST / WebSocket | typed events、append-only log、conversation、agent server、安全策略 | Python/runtime 体系可能增加部署复杂度 |
| Claude Agent SDK | controllable coding agent SDK | SDK adapter | hooks、subagents、permissions、session lifecycle | 不应假设可直接改内部实现 |
| LangGraph | graph + state runtime | concept/reference or optional backend | workflow graph、state schema、checkpoint、subgraph | TS 侧可能需要自建轻量兼容层 |
| LiteLLM/OpenRouter/Portkey | model gateway | model gateway adapter | model aliases、fallback、routing、metrics | 第一阶段不做复杂模型网关和训练式路由 |
| Plandex | large task coding workflow | concept/reference | project map、plan/execute、patch sandbox | 第一阶段不做完整大代码库索引系统 |

## Framework-first 集成策略

第一阶段不平均评估所有候选，先以 OpenCode 为主线。其他项目只在 OpenCode 不覆盖或覆盖不足的点上补充。

验证顺序：

1. OpenCode。
2. Hermes Agent。
3. Claude Agent SDK。
4. OpenHands。
5. LangGraph / LiteLLM / Plandex 等专项参考。

每个候选按以下维度检查：

1. 是否能直接调用或嵌入。
2. 是否能拦截 tool call、permission、model call、final artifact。
3. 是否能输出事件流或被映射成 Agent Canvas event log。
4. 是否能接用户提供的临时 API。
5. 是否能作为桌面 app 的本地 backend。
6. 是否允许 fork、修改、再分发。

Agent Canvas 自己保留的产品层：

- engine registry
- workflow schema
- workflow compiler
- event projection
- trace renderer
- artifact model
- UI canvas model

候选底座负责的 runtime 层：

- model call
- agent loop
- tool execution
- file/search/bash/browser capabilities
- session lifecycle

## OpenCode 参考点

OpenCode 当前是 Agent Canvas 的主线候选底座。

OpenCode 值得重点参考的是 coding agent 的产品化边界：

- agent 可以有自己的 model、prompt、tools。
- permission config 决定动作是 allow、ask 还是 deny。
- MCP server 是工具扩展层。
- ACP 让 coding agent 可以被编辑器以协议方式调用。
- server 模式让多个客户端可以程序化交互。

对 Agent Canvas 的影响：

- `Engine Selector` 应借鉴 OpenCode 的 provider/model config，但扩展为 engine/workflow config。
- `Tool Broker` 应支持 MCP-like tool namespace 和 pattern permission。
- `OpenCodeBackendAdapter` 是第一阶段主线 adapter。

第一阶段落地：

- 先做 OpenCode source/API audit。
- 在 schema 中保留 `tools`、`permissions`。
- 在 adapter 层预留 `mcpServerId`、`toolNamespace`。
- 优先验证 `OpenCodeBackendAdapter` 或 fork patch，而不是自研 coding agent loop。

## Hermes Agent 参考点

Hermes Agent 当前是 Agent Canvas 的补充参考，而不是主线底座。

关键能力：

- 核心 `AIAgent` 服务 CLI、Gateway、ACP、Batch Runner、API Server、Python Library 等多个入口。
- Provider runtime resolver 支持不同 provider/model/API mode。
- 中心 tool registry 和 toolsets，覆盖 terminal、file、browser、web、vision、memory、delegation、cron、MCP。
- SQLite + FTS5 session storage，支持 session search 和长期记忆。
- Skills、memory、cron、subagent delegation、gateway、ACP 组合比较完整。
- Terminal backend 支持 local、Docker、SSH、Singularity、Modal、Daytona。

Agent Canvas 应补充参考：

- Hermes provider resolver 是否能接用户临时 API。
- Hermes tool registry / toolsets 如何组织工具。
- Hermes gateway 如何支持多个入口。
- Hermes terminal backend / sandbox 能否启发后续执行环境设计。
- Hermes skills/memory 只作为长期参考，Phase 1 不实现自我改进。

更详细评估见 `docs/HERMES_AGENT_EVALUATION.md`。

## Pi / PIM 参考点

当前按 Pi Agent Harness 理解。若用户说的 PIM 是另一个 API，需要补充链接后单独记录。

Pi 的价值在于轻量 TypeScript harness 和包分层：

- `pi-ai`：统一多 provider LLM API。
- `pi-agent-core`：agent loop、tool calling、state management。
- `pi-coding-agent`：coding agent CLI。
- `pi-tui`：终端 UI。

对 Agent Canvas 的影响：

- monorepo 应拆成 `models`、`runtime`、`tools`、`cli`，避免 UI 和 runtime 耦合。
- CLI 是第一阶段最自然的开发入口。
- 用户自定义 workflow、tool、model adapter 是长期能力。

第一阶段落地：

- `packages/models` 只定义 adapter interface 和 fake/probe adapter。
- `packages/runtime` 不依赖具体模型供应商。
- `apps/cli` 调用 runtime，而不是承载业务逻辑。

## OpenHands 参考点

OpenHands 最值得参考的是 event-sourced runtime：

- Event 是 immutable、type-safe。
- Event log 是 append-only。
- Event 同时作为 agent memory 和集成点。
- Conversation 管理 agent lifecycle、state orchestration、workspace coordination。
- Agent Server 通过 HTTP/WebSocket 暴露 agent 能力。

对 Agent Canvas 的影响：

- `EventLog` 是第一阶段核心模块，不是调试附属品。
- Trace renderer、artifact projection、cost summary 都从 events 派生。
- 未来桌面端 UI 应订阅 event stream，而不是读取 runtime 内部临时状态。

第一阶段落地：

- `packages/events` 定义 typed events。
- `MemoryEventLog` 作为第一版实现。
- `packages/trace` 只消费 events。

## Claude Agent SDK 参考点

Claude Agent SDK 的启发主要是控制面：

- hooks
- permissions
- subagents
- sessions
- MCP
- built-in tools

对 Agent Canvas 的影响：

- Hooks 未来应成为 DSL 的一等能力。
- `preToolUse` 和 `postToolUse` 可以承载 permission、cost guard、event logger、artifact collector。
- Subagent 需要 scoped tools 和 scoped permission。

第一阶段落地：

- workflow schema 中预留 `hooks` 字段。
- permission policy 在 Tool Broker 中执行。
- 暂不实现完整 hook runner。

## LangGraph 参考点

LangGraph 的重要启发是：workflow 和 agent 不是一回事。

- Workflow 是预定义路径。
- Agent 是动态决策和工具使用。
- Graph 需要 state schema、nodes、edges、conditions。
- Checkpoint 支持 resume、human-in-the-loop、time travel。

对 Agent Canvas 的影响：

- Canvas 节点必须能编译成 execution plan。
- `WorkflowDefinition` 应包含 `state`、`nodes`、`edges`。
- 第一阶段不做复杂 checkpoint，但 event log 设计要兼容 replay/resume。

第一阶段落地：

- workflow compiler 生成 plan graph。
- node runner 读取和写入 execution context。
- edge condition 第一版只支持简单 string condition 或 always。

## LiteLLM / OpenRouter / Portkey 参考点

这些项目证明 model routing 应独立于 agent runtime：

- provider abstraction
- fallback
- model aliases
- metrics
- budget/cost tracking

对 Agent Canvas 的影响：

- `ModelRouter` 不应该写死在 agent runner 中。
- Engine config 可以描述 route：

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

第一阶段落地：

- 只做 rule-based route resolver。
- 不做训练式 router。
- 记录 model selection event，未来可统计成本和成功率。

## Plandex 参考点

Plandex 对长任务和大代码库更有启发：

- project map
- tree-sitter
- plan and execute
- patch review sandbox
- cumulative diff

对 Agent Canvas 的影响：

- 代码库理解优先使用确定性工具，而不是全交给 LLM。
- 代码修改产物应先作为 patch artifact。
- 大任务要先计划，再执行。

第一阶段落地：

- fake tool 中模拟 `project_search`、`read_file`、`propose_patch`。
- `ArtifactCreated` 记录 patch。
- 暂不真实修改文件。

## 外部参考链接

- OpenCode Agents: https://opencode.ai/docs/agents/
- OpenCode Permissions: https://opencode.ai/docs/permissions/
- OpenCode ACP: https://opencode.ai/docs/acp/
- OpenCode Server: https://opencode.ai/docs/server/
- Pi Agent Harness: https://github.com/earendil-works/pi
- OpenHands Events: https://docs.openhands.dev/sdk/arch/events
- OpenHands Conversation: https://docs.openhands.dev/sdk/arch/conversation
- OpenHands Agent Server: https://docs.openhands.dev/sdk/arch/agent-server
- LangGraph Overview: https://docs.langchain.com/oss/python/langgraph/overview
- LangGraph Checkpointers: https://docs.langchain.com/oss/javascript/langgraph/checkpointers

