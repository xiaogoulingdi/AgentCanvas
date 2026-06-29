# Hermes Agent 评估

日期：2026-06-29

本文评估 Nous Research 的 Hermes Agent 如何作为 Agent Canvas 的补充参考。当前主线已调整为 OpenCode，Hermes 不作为第一阶段主底座。

官方资料：

- GitHub: https://github.com/NousResearch/hermes-agent
- Website: https://hermes-agent.nousresearch.com/
- Docs: https://hermes-agent.nousresearch.com/docs/
- Architecture: https://hermes-agent.nousresearch.com/docs/developer-guide/architecture

## 初步结论

Hermes Agent 值得作为 Agent Canvas 的补充参考和第二候选底座，但不建议作为第一阶段主线。

原因：

- MIT license，允许修改和再分发。
- 已经有完整 agent loop、工具系统、provider resolution、session storage、gateway、ACP、cron、skills、memory、subagent delegation。
- 支持多入口：CLI、Gateway、ACP、Batch Runner、API Server、Python Library。
- 支持多 provider：Nous Portal、OpenRouter、OpenAI、自定义 endpoint 等。
- 支持多工具和 toolsets，包含 terminal、file、browser、web、vision、memory、delegation、cron、MCP。
- 支持多 terminal backend：local、Docker、SSH、Singularity、Modal、Daytona。
- 它的核心设计更接近“可运行 agent 平台”，而不只是一个聊天 SDK。
- 但它的 self-improving / memory / skills 不是 Agent Canvas Phase 1 的目标。

风险：

- 主要实现是 Python，Agent Canvas 如果坚持 TypeScript-first，需要通过 adapter、subprocess、ACP/API 或 fork 方式集成。
- Hermes 的核心定位是 self-improving personal agent，不是专门的 coding workflow compiler。
- Agent Canvas 的 `Engine Selector -> Workflow Definition -> Execution Plan -> Trace Renderer` 仍需自己保留。
- 若直接 fork，需要评估代码规模、构建方式、桌面端打包、升级维护成本。

## 值得参考的架构点

### 1. 平台无关核心

Hermes 的架构图显示，一个核心 `AIAgent` 被 CLI、Gateway、ACP、Batch Runner、API Server、Python Library 等入口复用。

Agent Canvas 应采用同样原则：

```text
UI / CLI / Desktop / API
  -> Agent Canvas Application Layer
  -> Selected Backend Adapter
  -> Backend Agent Runtime
```

不要让桌面 UI 直接承载 agent loop。

### 2. Provider Runtime Resolution

Hermes 有统一 provider runtime resolver，把 provider/model 解析成 api mode、credential、base URL。

Agent Canvas 对应：

- `Engine Selector`
- `Model Router`
- `Backend Adapter`
- `API Probe Adapter`

这能直接支持用户临时 API，也方便未来接 OpenRouter、LiteLLM、Claude Agent SDK、自定义 endpoint。

### 3. Tool Registry 和 Toolsets

Hermes 的工具系统有中心 registry，并按 toolsets 组织。工具覆盖 terminal、file、browser、web、vision、memory、delegation、cron、MCP 等。

Agent Canvas 对应：

- `Tool Broker`
- `Tool Registry`
- `Tool Permission Policy`
- `MCP Tool Namespace`
- `Workflow Node Tool Scope`

值得借鉴的是：工具不只是函数列表，而是按平台、权限、上下文可用性动态筛选。

### 4. Terminal Backends 和 Sandbox

Hermes 支持 local、Docker、SSH、Singularity、Modal、Daytona 等 terminal backend，并在 Docker 后端提供 namespace isolation、capability drop、no privilege escalation 等加固。

Agent Canvas 对应：

- 第一阶段不真实执行危险命令。
- 第二阶段可以把 sandbox backend 作为 backend capability，而不是自己从零写。
- 对 coding agent 来说，SSH/Docker/Daytona 类 backend 比本机裸跑更适合安全边界。

### 5. Session Storage 和 Memory

Hermes 用 SQLite + FTS5 做 session storage，并有 memory、session search、skills、user modeling。

Agent Canvas 对应：

- `Event Log`
- `Trace`
- `Artifact Projection`
- `Session Search`
- `Workflow Replay`

区别：

- Hermes 强调长期 personal memory。
- Agent Canvas 更应强调 workflow event log、代码变更 trace、artifact lineage。

### 6. Skills 和自我改进

Hermes 的核心卖点是 closed learning loop：从任务经验生成 skills，并在后续任务中复用。

Agent Canvas 可以借鉴但不应第一阶段就实现完整自我改进。

第一阶段只保留接口：

```text
Workflow Run
  -> Trace
  -> Artifact
  -> Optional Skill Candidate
```

未来可以把成功 workflow 压缩成 reusable workflow template 或 skill。

### 7. ACP / IDE Integration

Hermes 有 ACP adapter，面向 VS Code、Zed、JetBrains 这类 IDE-native agent 集成。

Agent Canvas 对应：

- 如果未来做桌面端或 IDE 插件，ACP 是重要方向。
- 短期可以验证 Hermes 是否能作为 ACP backend 被 Agent Canvas 调用。

## Hermes 与 Agent Canvas 的适配方式

候选路线：

### Route A：Hermes 作为补充 backend，Agent Canvas 做产品层

```text
Agent Canvas UI / CLI
  -> Engine Selector
  -> Workflow Compiler
  -> HermesBackendAdapter
  -> Hermes AIAgent / Gateway / ACP / API
  -> Event Mapper
  -> Agent Canvas Trace
```

优点：

- 最大化复用 Hermes 的 agent loop、tools、provider、sandbox。
- 开发成本最低。

缺点：

- Agent Canvas 的 workflow graph 需要映射成 Hermes session/tool/subagent 调用。
- 事件粒度可能要通过 callbacks/logs/adapter 补齐。

### Route B：Fork Hermes，加入 Agent Canvas workflow runtime

优点：

- 能深度改造 agent loop、工具调度、trace、workflow compiler。
- 适合如果 Hermes 的内部结构高度契合。

缺点：

- 维护成本高。
- 需要跟随上游升级。
- Python 主体可能和 TypeScript desktop/app 层形成双栈复杂度。

### Route C：借鉴 Hermes 架构，自建 TypeScript runtime

优点：

- TypeScript 一致性最好。
- Agent Canvas 产品抽象最干净。

缺点：

- 开发成本最高。
- 会重复实现大量已有能力。

当前推荐：

Phase 1 先走 OpenCode 主线。Hermes 暂时不做主 adapter spike，先用于补充 provider resolution、tool registry、gateway、terminal backend、skills/memory 的设计参考。

## 与其他框架的关系

建议以 OpenCode 作为主线，Hermes Agent 作为补充参考：

- OpenCode：主线 coding backend，重点看 agent、model/provider config、permission、ACP、MCP、server。
- Claude Agent SDK：补充 SDK adapter、hooks、subagents、session lifecycle。
- OpenHands：补充 event-sourced runtime、conversation、agent server、安全策略。
- LangGraph：补充 graph/state/checkpoint 概念。
- LiteLLM/OpenRouter/Portkey：补充 model routing/fallback/gateway。
- Plandex：补充 project map、patch sandbox、large task plan/execute。

## 需要进一步源码审计的问题

下一步如果进入代码级评估，需要重点看：

1. `run_agent.py` 中 `AIAgent` 的最小可调用接口。
2. `model_tools.py` 和 `tools/registry.py` 的工具注册、schema、dispatch 方式。
3. callbacks 能否稳定拦截 model call、tool call、permission、artifact。
4. `hermes_state.py` / gateway session storage 能否映射到 Agent Canvas event log。
5. `acp_adapter/` 是否适合 Agent Canvas 作为 subprocess 调用。
6. provider runtime resolver 是否支持用户提供的临时 API。
7. Docker/SSH/Daytona backend 能否作为 coding sandbox。
8. 桌面端打包是否能共存 Python runtime。

## 建议决策

当前建议：

```text
Primary Candidate: OpenCode
Supplemental References: Hermes Agent, Claude Agent SDK, OpenHands, LangGraph
First Spike: OpenCodeBackendAdapter + Event Mapper
Fallback: FakeBackendAdapter + minimal TypeScript runtime
```

Agent Canvas 的独特价值仍然是：

- 统一 Engine Selector。
- workflow definition / compiler。
- 多模型路由和多 Agent workflow 的产品化入口。
- 从 event log 派生 Canvas、Trace、Artifact。
- 面向 coding app 的权限、patch、review 体验。
