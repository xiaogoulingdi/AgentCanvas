# Runtime MVP

日期：2026-06-29

本文档记录 Agent Canvas 第一阶段 Runtime MVP 的当前状态、边界和下一步开发顺序。

## 目标

第一阶段不是完整 IDE，也不是桌面 UI，而是先跑通可测试的 Agent 编程闭环：

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

这个闭环需要让后续产品层 Canvas 能观察到：

- 选中了哪个 engine
- 每个 agent 节点使用哪个模型
- 为什么这一步使用便宜模型或强模型
- 请求是否成功
- 权限检查结果
- 工具调用轨迹
- artifact 输出
- 估算成本

## 当前实现

### Workflow

位置：

```text
packages/workflow/src/
examples/workflows/
```

当前支持 JSON workflow：

- agent nodes
- directed edges
- route key
- tool list
- permission scope
- bounded discussion config
- runtime limits

当前不支持：

- 任意无限循环
- 动态无限子图
- 真实并发调度
- 条件分支

### Runtime

位置：

```text
packages/runtime/src/run-workflow.ts
```

Runtime 负责：

- 写入 user prompt event
- 写入 engine selected event
- 写入 workflow loaded / compiled event
- 消费 backend event
- 映射为统一 AgentEvent
- 成功时写入 `workflow.completed`
- 失败时写入 `workflow.failed`

### Backends

位置：

```text
packages/backends/src/
```

当前有两个 backend：

- `FakeBackendAdapter`
- `ModelBackedBackendAdapter`

`FakeBackendAdapter` 用于无 API key 的 smoke test。

`ModelBackedBackendAdapter` 用真实模型返回内容，但工具调用仍是 mock，不会改文件，也不会执行 shell。

Backend 现在通过 broker 注入权限和工具能力：

- `PermissionBroker`
- `ToolBroker`
- `MockToolBroker`
- `WorkspaceToolBroker`

`WorkspaceToolBroker` 只允许在当前 workspace 内运行受控文件工具。默认 dry-run，只有 CLI 显式传入 `--allow-file-edits` 时才写入本地 artifact。

### Model Routing

位置：

```text
packages/models/src/
examples/engines/
```

当前支持：

- OpenAI-compatible Chat Completions
- OpenAI Responses API
- DeepSeek provider profile
- Kimi provider profile
- custom provider profile
- route -> provider/model 映射
- route reason
- fallback model metadata
- provider preflight

当前不支持：

- 自动 fallback 重试
- 流式输出
- tool calling 协议适配
- 精确成本计算
- 训练时 router

### Event Log

位置：

```text
packages/events/src/
```

当前是内存事件日志，适合测试和 CLI。

后续可以替换为：

- SQLite
- local JSONL
- OpenCode session event adapter
- server-side trace store

### Trace Renderer

位置：

```text
packages/trace/src/
```

当前支持：

- text trace
- JSON trace
- model response snippet
- tool summary
- artifact summary
- total estimated cost projection

## CLI 入口

### Fake workflow

```powershell
npm.cmd run run:fake
```

### Model workflow

```powershell
npm.cmd run run:model -- --engine examples/engines/sub2api-balanced.json --workflow examples/workflows/research-code.json --prompt "Propose a safe coding plan."
```

### OpenCode-like terminal mode

```powershell
npm.cmd run agent
```

这个模式现在是桌面 UI 之前的测试台：

- 选择 engine
- 选择 workflow
- 输入 prompt
- 输出 trace
- 输出 artifacts
- 空 prompt 退出

详见：

```text
docs/CLI_TESTING.md
```

### File edit command

```powershell
npm.cmd run file:edit -- --path .agent-canvas/test.txt --content "hello"
npm.cmd run file:edit -- --path .agent-canvas/test.txt --content "hello" --yes
```

默认是 dry-run。只有加 `--yes` 才会写文件。

### OpenCode SDK health

```powershell
npm.cmd run opencode:health
```

详见：

```text
docs/OPENCODE_INTEGRATION.md
```

## 安全边界

当前 Runtime MVP 明确不做：

- 写入真实项目文件
- 执行真实 shell
- 自动安装依赖
- 自动提交 Git
- 读取本地 Codex/OpenAI 鉴权文件
- 保存 API key

所有 API key 都应通过环境变量传入。

## 与 OpenCode 的关系

Agent Canvas 当前不直接 fork OpenCode。建议先把 OpenCode 当作主线参考和未来 backend adapter 目标：

```text
Agent Canvas Product Layer
  -> Engine Selector
  -> Workflow Compiler
  -> Runtime
  -> Backend Adapter
      -> FakeBackendAdapter
      -> ModelBackedBackendAdapter
      -> Future OpenCodeBackendAdapter
```

后续接 OpenCode 时，Agent Canvas 应优先复用：

- session/task abstraction
- tool execution model
- permission prompts
- patch artifact model
- terminal/editor integration ideas

但 Agent Canvas 保留自己的核心卖点：

- 多模型路由
- 多 Agent workflow engine selection
- Canvas observer
- 成本/质量策略展示

## 下一阶段建议

1. 给 `ModelBackedBackendAdapter` 增加真实 fallback 重试。
2. 把 cost estimator 从固定 `0` 改成按 provider/model profile 估算。
3. 加 `ToolBroker` 接口，把当前 mock tool event 从 backend 中抽离。
4. 加 `PermissionBroker` 接口，把 allow/ask/deny 策略从 backend 中抽离。
5. 增加 JSONL event log，方便保存真实运行 trace。
6. 在 CLI 稳定后，再做轻量 Web/桌面 observer UI。

## 每轮代码改动后的验证

基础验证：

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run run:fake
```

CLI 验证：

```powershell
npm.cmd run agent
```

真实 provider 验证按需运行：

```powershell
npm.cmd run probe:custom -- --prompt "Reply with OK only."
npm.cmd run run:model -- --engine examples/engines/sub2api-balanced.json --workflow examples/workflows/research-code.json --prompt "Propose a safe coding plan."
```
