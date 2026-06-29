# 第一阶段技术 Spike 计划

日期：2026-06-29

## 目标

第一阶段目标是用 framework-first 的方式跑通最小闭环：

```text
User Prompt
-> Engine Selector
-> Workflow Definition
-> Execution Plan
-> Agent Runtime
-> Tool Broker
-> Event Log
-> Trace / Artifact
```

这不是完整产品，也不是完整 UI。它是 Agent Canvas 以 OpenCode 为主线、Hermes Agent 等为补充参考的可行性验证。

第一阶段不先假设自研 runtime。优先级是：

1. 直接使用现有 SDK/API。
2. 通过 adapter 包装现有 agent runtime。
3. 通过 fork/patch 改造开源框架。
4. 只有候选底座不能满足关键抽象时，才自建轻量 runtime。

## 非目标

第一阶段不做：

- 完整桌面端 UI
- Electron/Tauri 项目初始化
- 拖拽式 workflow editor
- 真实文件修改
- 真实 shell 执行
- 复杂 sandbox
- 训练式 model router
- 大型 project map/indexer
- 在没有 source/API audit 前绑定唯一底座

## 成功标准

Spike 完成时，应能通过 CLI 执行类似命令：

```bash
agent-canvas run examples/workflows/research-code.json --prompt "分析当前项目并给出修改计划"
```

并输出：

```text
[user.prompt.submitted]
[engine.selected] research-code
[workflow.loaded]
[workflow.compiled] nodes=3 edges=2
[agent.started] planner
[model.request.completed] fake-planner
[tool.call.completed] project_search
[agent.completed] planner
[agent.started] coder
[artifact.created] patch
[agent.completed] coder
[agent.started] reviewer
[workflow.completed]
```

同时生成 JSON trace：

```json
{
  "sessionId": "session_...",
  "engineId": "research-code",
  "status": "completed",
  "events": [],
  "artifacts": []
}
```

## 模块范围

### 0. Framework Source/API Audit

职责：

- 审查 OpenCode、Hermes Agent、Pi/PIM、OpenHands、Claude Agent SDK 的接入方式。
- 判断是 fork、extension、SDK adapter、subprocess，还是 remote server integration。
- 确认 license、语言栈、构建方式、事件/trace 能力、权限系统、tool API、model API。

候选路线：

```text
OpenCode
  -> likely primary backend adapter / fork candidate / subprocess / ACP

Hermes Agent
  -> supplemental reference / secondary backend candidate / gateway and tool architecture

Pi/PIM
  -> likely package-level reuse or fork

OpenHands
  -> likely Agent Server / REST / WebSocket backend

Claude Agent SDK
  -> likely SDK adapter, not internal fork
```

验收：

- 每个候选有一页接入评估。
- 明确第一阶段 primary backend 和 fallback backend。当前主线为 OpenCode。
- 明确哪些能力由底座提供，哪些仍由 Agent Canvas 提供。

### 1. Workflow Schema

职责：

- 描述 workflow metadata
- 描述 state schema
- 描述 nodes
- 描述 edges
- 描述 tools、models、permissions、hooks 占位
- 描述 supervisor/subagent 关系
- 描述有界讨论轮次和停止条件

第一阶段字段：

```ts
type WorkflowDefinition = {
  id: string;
  name: string;
  version: string;
  entry: string;
  state?: WorkflowStateSchema;
  nodes: Record<string, WorkflowNode>;
  edges: WorkflowEdge[];
  limits?: WorkflowLimits;
  discussions?: WorkflowDiscussion[];
  hooks?: WorkflowHooks;
};
```

### 2. Engine Selector

职责：

- 根据用户选择解析 engine
- 支持 single_model、router、workflow
- 产出 `EngineSelected` event

第一阶段：

- 使用本地 engine registry fixture。
- 不做远程 engine marketplace。

### 3. Workflow Compiler

职责：

- validate workflow
- 检查 entry node
- 检查 edges 引用的 node 是否存在
- 检查循环策略
- 检查 discussion maxRounds
- 检查 max steps / max cost / max time
- 输出 execution plan

第一阶段 plan：

```ts
type ExecutionPlan = {
  id: string;
  workflowId: string;
  entryNodeId: string;
  nodes: PlanNode[];
  edges: PlanEdge[];
  limits: WorkflowLimits;
  requiredTools: string[];
  requiredModels: string[];
  permissionScopes: PermissionScope[];
};
```

### 4. Backend Adapter Layer

职责：

- 用统一接口包住候选底座。
- 让 Agent Canvas 的 engine/workflow/event 层不直接依赖某个框架的内部类型。

第一阶段接口草案：

```ts
interface AgentBackend {
  id: string;
  capabilities: BackendCapabilities;
  run(request: BackendRunRequest): AsyncIterable<BackendEvent>;
}
```

第一批候选 adapter：

- `FakeBackendAdapter`
- `OpenCodeBackendAdapter`
- `HermesBackendAdapter`
- `PiBackendAdapter`
- `OpenHandsBackendAdapter`
- `ClaudeAgentSdkAdapter`

### 5. Fake Model Adapter

职责：

- 模拟不同 role 的 LLM 输出
- 支持 planner/coder/reviewer
- 返回稳定结果，方便测试

输出类型：

```ts
type ModelResponse = {
  id: string;
  content: string;
  toolCalls?: ToolCallRequest[];
  usage?: ModelUsage;
};
```

### 6. Fake Tool Adapter

第一阶段工具：

- `project_search`
- `read_file`
- `propose_patch`
- `diff`
- `fake_test`
- `browser_screenshot`

所有工具都只返回 fake observation 或 artifact，不真实修改文件。

### 7. Tool Broker

职责：

- 接收 tool call
- 查找 tool adapter
- 调用 permission policy
- 写入事件
- 返回 observation

### 8. Event Log

第一阶段实现：

- `MemoryEventLog`
- append-only
- list by session
- reducer/projection helpers

未来实现：

- file event log
- SQLite event log
- remote event stream

### 9. Trace Renderer

第一阶段输出：

- text trace
- JSON trace
- artifacts projection

未来输出：

- Canvas graph state
- cost summary
- timeline view
- replay view

## 里程碑

### Milestone 1：文档和目录

产出：

- `docs/DECISIONS.md`
- `docs/OPEN_SOURCE_COMPARISON.md`
- `docs/SPIKE_PLAN.md`
- `docs/API_INTEGRATION_NOTES.md`
- `docs/PROJECT_STRUCTURE.md`
- 轻量 monorepo 目录占位

验收：

- 没有安装依赖。
- 没有初始化 UI 框架。
- 文件结构清楚表达后续开发边界。

### Milestone 2：TypeScript 类型和 schema

产出：

- workflow types
- engine types
- event types
- backend adapter types
- model/tool adapter types
- permission types

验收：

- 类型可以表达 single model、router、workflow。
- workflow 可以表达 nodes、edges、tools、permissions。
- backend adapter 可以表达 OpenCode/Pi/OpenHands/Claude SDK 的最小公共能力。

### Milestone 3：Framework Adapter Spike

产出：

- OpenCode 接入评估
- Hermes Agent 补充评估
- Pi/PIM 接入评估
- OpenHands 接入评估
- Claude Agent SDK 接入评估
- primary backend 决策

验收：

- 至少一个候选底座可以跑通最小 prompt -> response。
- 至少一个候选底座可以暴露或映射 tool/trace/event。
- 明确是否需要 fork。

### Milestone 4：Compiler 和 Event Log

产出：

- workflow validator
- workflow compiler
- memory event log
- event reducers

验收：

- invalid workflow 有明确错误。
- valid workflow 能编译成 execution plan。
- event log 可 append/list。

### Milestone 5：Backend-backed Runtime

产出：

- selected backend adapter
- fake backend adapter
- tool broker bridge
- event mapper
- runtime orchestrator

验收：

- workflow 可以通过 selected backend 或 fake backend 完整执行。
- 所有关键动作有 event。
- patch/artifact 从事件中派生。

### Milestone 6：CLI 和 API Probe

产出：

- CLI runner
- text trace renderer
- JSON trace renderer
- user-provided API probe adapter

验收：

- CLI 可以执行 example workflow。
- API probe 不泄露密钥。
- API 能力记录到 `docs/API_INTEGRATION_NOTES.md`。

## 测试计划

Unit tests：

- workflow parser
- compiler graph validation
- engine selector
- route resolver
- permission policy
- event reducer

Integration tests：

- agent calls fake tool
- tool returns observation
- event log records full loop
- artifact projection works
- failed tool call handled

Safety tests：

- denied filesystem patch
- blocked shell
- model budget exceeded
- unknown tool rejected
