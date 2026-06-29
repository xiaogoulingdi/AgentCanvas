# Agent Canvas 架构决策记录

日期：2026-06-29

本文记录 Agent Canvas 第一阶段的架构决策。目标是避免一开始被 UI、某个 SDK 或某个模型供应商绑定，先把可测试、可替换、可追踪的最小运行时跑通。

## ADR-001：第一阶段先做 headless runtime，不先做完整桌面 UI

状态：Accepted

Agent Canvas 的核心差异不是画布本身，而是把用户意图编译成可控的单模型、多模型路由或多 Agent 执行计划。因此第一阶段优先做命令行可运行的 TypeScript runtime spike。

决策：

- 第一阶段入口使用 `apps/cli`。
- 暂不初始化 Electron、Tauri、React 等大型 UI 项目。
- UI mockup 继续作为产品参考，但 runtime 不依赖 UI。

原因：

- 运行时和事件模型一旦稳定，桌面端、Web 端、IDE 插件都可以复用。
- 如果先做 UI，容易把 workflow graph 变成视觉装饰，而不是可执行计划。
- CLI 更适合做确定性测试、API probe、event log replay。

## ADR-002：Engine Selector 统一 model、router、workflow

状态：Accepted

模型选择框里选的对象不应该只是 model，而应该是 execution engine。

第一阶段类型：

```ts
type ExecutionEngine =
  | SingleModelEngine
  | RouterEngine
  | WorkflowEngine;
```

含义：

- `single_model`：用户直接选择一个模型。
- `router`：根据任务阶段、成本、能力、fallback 策略选择模型。
- `workflow`：选择一个完整的多 Agent 工作流定义。

原因：

- 这是 Agent Canvas 区别于普通 AI IDE 的核心产品抽象。
- 后续可以接入 OpenCode、OpenHands、LiteLLM、OpenRouter、Claude Agent SDK，但用户入口保持统一。

## ADR-003：Event Log 是 runtime 的一等公民

状态：Accepted

所有关键行为都必须写入 append-only event log，包括模型调用、工具调用、权限判断、产物生成、失败、成本变化。

第一阶段事件范围：

```ts
type AgentEvent =
  | UserPromptSubmitted
  | EngineSelected
  | WorkflowLoaded
  | WorkflowCompiled
  | AgentStarted
  | ModelRequestStarted
  | ModelRequestCompleted
  | ToolCallRequested
  | PermissionChecked
  | ToolCallCompleted
  | ArtifactCreated
  | AgentCompleted
  | WorkflowCompleted
  | WorkflowFailed;
```

原因：

- Trace、Canvas 运行态、Artifacts、成本统计都应从 event log 派生。
- 未来支持暂停、继续、回放、分支、失败恢复都依赖事件源。
- OpenHands 的 append-only typed event system 证明了这个方向适合 agent runtime。

## ADR-004：Workflow Compiler 先于 Canvas Editor

状态：Accepted

第一阶段先定义 workflow JSON/YAML schema 和 compiler，而不是做拖拽式编辑器。

Compiler 第一阶段职责：

- schema validation
- node/edge validation
- entry node validation
- execution plan generation
- permission scope collection
- required tools/models collection

不做：

- 任意复杂循环
- 可视化拖拽编辑
- 自动优化计划
- 分布式调度

原因：

- Canvas 必须展示可执行 graph，而不是自定义图形数据。
- LangGraph 的经验说明，graph、state、edge condition 是 workflow/agent 系统的基础抽象。

## ADR-005：Tool Broker 是所有工具调用的唯一入口

状态：Accepted

Agent Runtime 不直接调用工具。所有工具调用必须经过 Tool Broker。

Tool Broker 第一阶段职责：

- 查找 tool adapter
- 记录 `ToolCallRequested`
- 调用 permission policy
- 执行 fake tool
- 记录 `ToolCallCompleted` 或失败事件

原因：

- 权限、审计、成本、工具上下文裁剪都必须集中处理。
- OpenCode 的 permission pattern 和 MCP tool 管理说明，工具层会很快变复杂，不能散落在 agent 代码里。

## ADR-006：Permission System 第一版就保留接口

状态：Accepted

第一阶段可以默认 allow fake tools，但接口必须是三态：

```ts
type PermissionDecision = "allow" | "ask" | "deny";
```

第一阶段权限范围：

- filesystem read
- filesystem patch
- shell
- network
- browser
- model cost budget

原因：

- Agent Canvas 面向自动执行和多 Agent，权限系统不能后补。
- 后续接真实 shell、filesystem、browser、MCP 时，权限接口必须已经存在。

## ADR-007：Model Adapter 可替换，第一阶段用 fake model

状态：Accepted

第一阶段默认 fake model adapter，用户提供临时 API 后再做 probe adapter。

Adapter 接口：

```ts
interface ModelAdapter {
  complete(request: ModelRequest): Promise<ModelResponse>;
  stream?(request: ModelRequest): AsyncIterable<ModelStreamEvent>;
}
```

原因：

- Fake model 让测试确定、低成本、可重复。
- API probe adapter 用于验证真实 API 的能力，不直接污染核心 runtime。
- 后续可以接 OpenAI-compatible、LiteLLM、OpenRouter、Claude Agent SDK 或自定义 API。

## ADR-008：代码修改先作为 artifact/patch，不直接写工作区

状态：Accepted

第一阶段 fake tool 生成 patch artifact，不直接修改用户项目文件。

原因：

- Plandex 的思路说明，大任务代码变更最好进入 review sandbox。
- 事件日志里记录 patch artifact，未来可以做 review/apply/revert。
- 降低第一阶段误改文件的风险。

## ADR-009：采用 framework-first 策略，优先复用或改造开源 Agent 底座

状态：Accepted

第一阶段不默认自研完整 runtime，而是先评估 OpenCode、Pi/PIM、OpenHands、Claude Agent SDK 等候选底座。能通过 fork、extension、adapter 或 subprocess 集成解决的问题，不优先重写。

候选分层：

- 可 fork/改造底座：OpenCode、Pi Agent Harness、OpenHands Software Agent SDK。
- SDK adapter：Claude Agent SDK、LiteLLM/OpenRouter/Portkey。
- 架构参考：LangGraph、Plandex、CrewAI。

第一阶段新增任务：

- 做候选框架 source/API audit。
- 验证每个候选能否承载 Agent Canvas 的 `Engine Selector -> Workflow -> Event Log -> Trace` 抽象。
- 优先写 adapter/fork patch plan，而不是直接写自研 runtime。

选择标准：

- TypeScript/Node 亲和度。
- 是否支持 tool calling。
- 是否有权限系统或可插入 permission gate。
- 是否有事件流、trace 或可拦截生命周期。
- 是否支持 MCP / external tools。
- 是否方便嵌入 desktop app。
- License 是否允许修改和分发。
- 是否能接用户提供的临时 API。

原因：

- OpenCode、Pi、OpenHands 已经解决了大量 coding agent harness 问题，直接复用可以显著降低开发成本。
- Agent Canvas 的差异化在 engine/workflow/trace 产品层，不一定要从零实现 agent loop。
- 保留统一接口，可以避免被单个框架锁死。

注意：

- Claude Agent SDK 是可编程 SDK，但不应假设可以像开源项目一样直接修改其内部实现。
- 如果直接 fork 某个项目，需要先确认 license、构建方式、插件机制和维护成本。
- Agent Canvas 自己仍需保留 workflow schema、engine registry、event projection 等产品抽象。

## ADR-010：API Key 和临时 API 不进入仓库

状态：Accepted

用户提供的临时 API 只通过环境变量、本地 `.env.local` 或运行时输入使用。仓库只记录 API 能力、响应格式和测试结果，不记录密钥。

原因：

- 避免泄露。
- 方便未来支持多个 provider。
- 让真实用户接入体验接近产品形态。

## ADR-011：选择一个主参考底座，其他框架只做补充

状态：Accepted

Agent Canvas 不应平均参考很多 agent 框架。第一阶段采用“一个主底座 + 多个补充参考”的方式推进。

当前主线：

- OpenCode

补充参考：

- Hermes Agent：provider resolution、tool registry、gateway、terminal backends、skills/memory 设计。
- Claude Agent SDK：SDK adapter、hooks、subagents、sessions。
- OpenHands：event-sourced runtime、conversation、agent server。
- LangGraph：graph/state/checkpoint。
- LiteLLM/OpenRouter/Portkey：model routing/fallback。
- Plandex：project map、patch sandbox。

原因：

- 同时深度参考多个框架会导致抽象摇摆，难以落地。
- Agent Canvas 当前是 AI 编程入口，OpenCode 的 coding agent、permissions、MCP、ACP、server、model/provider config 与第一阶段目标最贴近。
- Hermes Agent 的 self-improving / memory / skills 很新，但第一阶段不做自我改进，因此它更适合作为补充参考，而不是主线底座。
- 其他项目可以补足 OpenCode 在 provider runtime resolution、event sourcing、model routing、workflow graph 等方面的设计细节。

第一阶段执行策略：

- 先做 OpenCode source/API audit。
- 如果可行，优先实现 `OpenCodeBackendAdapter`。
- Hermes 只补充参考 provider resolution、tool registry、gateway、terminal backend、skills/memory 设计。
- 如果 OpenCode 无法满足 workflow/event/permission 的关键需求，再评估 Hermes 或 OpenHands 作为替代底座。

## ADR-012：第一阶段不做自我改进

状态：Accepted

第一阶段明确不做 self-improvement、自动生成 skills、长期人格记忆、自动学习用户习惯等能力。

原因：

- 当前产品核心是 AI 编程入口，不是个人自主 Agent。
- 自我改进会引入安全、可解释性、状态污染、测试不可重复等复杂度。
- OpenCode 主线更贴合 coding agent 闭环，Hermes 的自我改进能力可以保留为长期参考。

第一阶段保留：

- workflow template
- reusable engine config
- trace / artifact replay
- model cost/capability statistics

第一阶段不做：

- 自动写入长期记忆
- 自动生成或安装 skills
- 自动修改自身 prompt/rules
- 跨项目无界记忆共享

## ADR-013：Agent Canvas 是产品层配置面，不只是 runtime 可视化

状态：Accepted

Agent Canvas 属于产品层。它面向用户，用来可视化配置模型、路由、Agent 分工、权限和执行策略；runtime/backend 层优先复用 OpenCode。

Canvas 第一阶段职责：

- 展示当前 execution plan 和运行状态。
- 展示每个 agent node 使用的模型、工具、权限范围。
- 展示模型路由原因和成本估算。
- 展示总 Agent 与分 Agent 的分工关系。

Canvas 后续职责：

- 编辑 workflow。
- 拖拽 agent nodes。
- 配置 route table。
- 配置用户偏好，例如便宜优先、质量优先、速度优先。
- 生成用户配置好的 route/workflow engine。

原因：

- Agent Canvas 的产品卖点不是底层 agent loop，而是让用户能理解和控制“哪个模型/哪个 Agent 在做什么”。
- OpenCode 更适合作为 coding backend，Canvas 则承担用户配置、可视化、解释成本与权限的产品层。

## ADR-014：Workflow 使用有界图，不支持无限循环和无限动态子图

状态：Accepted

第一阶段 workflow 采用有界、可解释、可测试的图结构。

允许：

- 顺序步骤。
- 有限分支。
- 总 Agent 调度多个分 Agent。
- 分 Agent 各司其职。
- 有界讨论轮次，例如 reviewer 与 coder 最多讨论 2-3 轮。
- 每个 node 配置模型、工具、权限、预算。

暂不允许：

- 任意循环。
- 动态生成无限子图。
- 无限多 Agent 自主扩张。
- 无上限自我反思循环。
- 未经用户确认的长期后台任务链。

原因：

- 无限循环和无限子图会导致成本失控、权限难审计、Trace 难理解、测试不可重复。
- 编程产品更需要可控执行计划，而不是完全开放的 autonomous swarm。
- 后续可以支持有上限的 loop、retry、review cycle，但必须有预算、最大轮次和停止条件。

