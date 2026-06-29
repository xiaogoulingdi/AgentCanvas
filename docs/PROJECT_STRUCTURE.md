# 项目目录规划

日期：2026-06-29

本文描述 Agent Canvas 从资料包演进为正式 TypeScript monorepo 的目录结构。当前只创建轻量目录占位，不安装依赖，不初始化大型框架。

## 当前原则

1. Framework-first：优先复用、fork 或包装成熟 agent 框架。
2. Runtime 优先，UI 后置。
3. TypeScript 优先，但允许 Python/remote backend 通过 adapter 接入。
4. 每个包有清晰边界。
5. Model、Tool、Permission、Event 不互相硬编码。
6. OpenCode、Pi/PIM、OpenHands、Claude Agent SDK、LiteLLM、OpenRouter 都通过 adapter 接入。

## 推荐结构

```text
AgentCanvas/
  apps/
    cli/
    desktop/
    web/

  packages/
    workflow/
    engines/
    runtime/
    backends/
    models/
    tools/
    permissions/
    events/
    trace/
    project-map/
    shared/

  examples/
    workflows/

  schemas/

  tests/
    fixtures/
    integration/

  docs/
```

## Apps

### `apps/cli`

第一阶段主入口。

职责：

- 加载 prompt
- 选择 engine
- 加载 workflow
- 启动 runtime
- 输出 trace

不负责：

- workflow compiler 逻辑
- agent runtime 逻辑
- model/tool adapter 逻辑

### `apps/desktop`

第二阶段或更晚再启用。

建议技术路线：

- 早期倾向 Electron，因为 Node.js、子进程、文件系统、LSP、MCP、OpenCode/Claude Agent SDK 集成会更直接。
- Tauri 作为中后期备选，适合更强安全边界和更小包体。

### `apps/web`

可选的 Web debug UI。

职责：

- 展示 Plan / Canvas / Trace / Artifacts。
- 订阅 event stream。

## Packages

### `packages/workflow`

职责：

- workflow schema
- JSON/YAML loader
- validation
- compiler
- execution plan types

### `packages/engines`

职责：

- engine registry
- engine selector
- single model/router/workflow engine config
- route resolver

### `packages/runtime`

职责：

- agent runtime
- execution context
- node runner
- workflow runner
- runtime lifecycle

### `packages/backends`

职责：

- backend adapter interface
- OpenCode backend adapter
- Pi/PIM backend adapter
- OpenHands backend adapter
- Claude Agent SDK adapter
- fake backend adapter

说明：

- Agent Canvas 的 workflow/event/trace 层不直接依赖某个框架内部类型。
- 如果某个开源框架最终成为 primary backend，仍通过本包对外暴露统一接口。

### `packages/models`

职责：

- model adapter interface
- fake model adapter
- API probe adapter
- future provider adapters

### `packages/tools`

职责：

- tool adapter interface
- fake tools
- tool registry
- tool broker

### `packages/permissions`

职责：

- permission policy
- permission decision
- approval request/response types
- scope definitions

### `packages/events`

职责：

- event type definitions
- memory event log
- event reducers
- event projections

### `packages/trace`

职责：

- text trace renderer
- JSON trace renderer
- artifact projection
- future canvas state projection

### `packages/project-map`

未来启用。

职责：

- ripgrep
- tree-sitter
- LSP diagnostics
- dependency graph

### `packages/shared`

职责：

- ids
- result/error helpers
- common types
- clock utilities

## Examples

### `examples/workflows`

保存第一阶段可运行 workflow：

- `single-model.json`
- `research-code.json`
- `ui-clone-team.json`

## Schemas

保存 JSON Schema：

- `workflow.schema.json`
- `engine.schema.json`
- `event.schema.json`

## Tests

### `tests/fixtures`

保存测试 fixture：

- fake workflows
- fake model responses
- fake tool observations
- fake event logs

### `tests/integration`

保存跨包集成测试：

- full fake workflow
- denied permission
- failed tool call
- artifact projection

## 第一阶段建议实际创建的轻量目录

```text
apps/cli/
apps/desktop/
apps/web/
packages/workflow/
packages/engines/
packages/runtime/
packages/backends/
packages/models/
packages/tools/
packages/permissions/
packages/events/
packages/trace/
packages/project-map/
packages/shared/
examples/workflows/
schemas/
tests/fixtures/
tests/integration/
```

这些目录只表达边界，不代表立即开始所有模块开发。

