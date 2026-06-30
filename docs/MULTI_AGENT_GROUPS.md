# Multi-Agent Groups

日期：2026-06-30

## 核心判断

模型选择不应该是 runtime 黑箱自动切换。

Agent Canvas 的产品逻辑应该是：

```text
用户在 Canvas 配置 Multi-Agent Group
-> 用户在对话或任务中选择/调用这个策略组
-> 主策略按用户配置调用子策略
-> Runtime 负责执行、权限、事件日志、成本统计和防失控
```

也就是说，便宜模型和强模型什么时候使用，由用户在策略组里配置；runtime 只做执行和审计。

## 概念

### Multi-Agent Group

一个可复用的用户策略组，包含：

- 主策略 `entryStrategy`
- 子策略 `strategies`
- 模型绑定 `model`
- 可调用关系 `canCall`
- 权限边界 `permissions`
- 工具范围 `tools`
- 成本和运行限制 `limits`

### 主策略

主策略是入口，不是万能自动 Agent。

它只能调用用户在 `canCall` 中显式允许的子策略，并受到：

- `maxDepth`
- `maxStrategyCalls`
- `maxSteps`
- `maxDiscussionRounds`
- `maxEstimatedUsd`
- `maxRuntimeSeconds`

的限制。

### 子策略

子策略是可复用工作单元，例如：

- `researcher`
- `coder`
- `reviewer`
- `opencode-coder`
- `security-reviewer`

每个子策略都有自己的模型、工具、权限和预算。

## 示例

见：

```text
examples/groups/balanced-coding-group.json
```

关键片段：

```json
{
  "entryStrategy": "supervisor",
  "strategies": {
    "supervisor": {
      "model": {
        "provider": "deepseek",
        "model": "deepseek-v4-flash",
        "reason": "The user selected a balanced planning model for normal coding tasks."
      },
      "canCall": [
        {
          "strategy": "coder",
          "when": "The task requires a bounded file edit.",
          "maxCalls": 2
        }
      ]
    },
    "coder": {
      "model": {
        "provider": "opencode",
        "model": "deepseek-v4-flash",
        "reason": "The user selected OpenCode as the coding backend."
      },
      "permissions": ["filesystem.read", "filesystem.patch", "model.cost"]
    }
  }
}
```

## Phase 1 约束

为了避免无限循环和成本失控：

- `maxDepth <= 4`
- `maxStrategyCalls <= 20`
- `maxDiscussionRounds <= 5`
- 所有 `canCall.strategy` 必须指向已定义策略
- 所有策略必须写明 `model.reason`

## 与 Workflow 的关系

Multi-Agent Group 是产品层配置。

Workflow 是执行层计划。

后续编译链路应该是：

```text
Multi-Agent Group
-> selected task invocation
-> Workflow Definition
-> Execution Plan
-> Runtime Events
```

第一版先定义 schema 和校验器，不急着把它编译成 workflow。这样可以先把产品语义定稳。
