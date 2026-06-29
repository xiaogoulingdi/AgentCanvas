# Agent Canvas 产品层说明

日期：2026-06-29

## 核心判断

Agent Canvas 是产品层，不是底层 runtime。

它的价值是让用户以可视化方式配置、理解和控制：

- 用哪个模型。
- 哪个 Agent 做哪一步。
- 哪些 Agent 能用哪些工具。
- 哪些步骤需要强模型。
- 哪些步骤可以用便宜模型。
- 哪些操作需要用户确认。
- 整个任务花了多少钱。

底层 coding agent runtime 优先复用 OpenCode。

## Phase 1：Canvas 作为观察器

第一阶段 Canvas 不做复杂拖拽编辑，先做观察器。

展示内容：

- execution plan graph
- supervisor / subagent 结构
- node status
- model per node
- route decision
- tool call
- permission decision
- cost estimate
- artifact / patch

用户能看到：

```text
Supervisor Agent
  -> Research Agent: cheap-long-context
  -> Code Agent: balanced-coder
  -> Review Agent: strong-reviewer
```

以及：

```text
为什么 Research Agent 用便宜模型？
因为它主要做搜索和总结。

为什么 Review Agent 用强模型？
因为它负责风险判断和最终质量。
```

## Phase 2：Canvas 作为轻量配置器

第二阶段开始允许用户编辑配置，但不做任意复杂图。

用户可以：

- 修改某个 node 的模型。
- 修改某个 node 的工具权限。
- 修改预算。
- 选择偏好：便宜优先、质量优先、速度优先。
- 保存为自定义 engine。

例如：

```text
Balanced Coding
  planning: cheap-reasoning
  coding: balanced-coder
  review: strong-reviewer-if-risky
```

## Phase 3：Canvas 作为 workflow 编辑器

第三阶段再考虑：

- 拖拽 node。
- 连线。
- 添加分支。
- 配置有界讨论。
- 生成 workflow JSON/YAML。
- 导出/导入 engine preset。

仍然不建议支持无限图。

## 有界多 Agent 协作

Agent Canvas 可以表达“总 Agent + 分 Agent”：

```text
Supervisor
  -> Researcher
  -> Coder
  -> Reviewer
```

也可以表达有限讨论：

```text
Coder <-> Reviewer
maxRounds: 3
stopWhen: review_passed
```

不支持：

- 无限讨论。
- 无限创建新 Agent。
- 无限循环直到满意。
- 没有预算上限的自主执行。

## Canvas 与权限

Canvas 应该让权限可见。

例如：

| Agent | Read Files | Write Patch | Shell | Browser | Network |
|---|---|---|---|---|---|
| Researcher | allow | deny | deny | ask | allow |
| Coder | allow | allow patch | ask | deny | deny |
| Reviewer | allow | deny | deny | ask | deny |

用户应该能理解：

- 哪个 Agent 有写权限。
- 哪个工具需要确认。
- 哪些操作被禁止。
- 哪一步触发了权限请求。

## Canvas 与模型路由

Canvas 应该让模型路由可解释。

每个 node 展示：

- selected model
- reason
- fallback
- estimated cost
- actual cost
- latency

示例：

```text
Researcher
model: cheap-long-context
reason: repo search and summarization, low risk
fallback: balanced-reasoning
estimated cost: $0.05
```

## Canvas 生成 route model

Canvas 后续可以生成用户配置好的 route model / workflow engine：

```yaml
engine:
  id: my-balanced-coding
  type: workflow
  preference: cheap_first
  agents:
    supervisor:
      model: balanced-reasoning
    coder:
      model: balanced-coder
    reviewer:
      model: strong-reviewer
  limits:
    maxUsd: 1.00
    maxSteps: 20
    maxDiscussionRounds: 3
```

这就是 Agent Canvas 的产品差异化：用户不是只选择模型，而是在配置一个可视化、可解释、可控成本的执行引擎。

