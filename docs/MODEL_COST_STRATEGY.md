# 模型性价比策略

日期：2026-06-29

Agent Canvas 的重要卖点之一，是让用户不只选择一个模型，而是选择一个“性价比明确的执行引擎”。

## 目标

模型选择不应只是：

```text
GPT-5
Claude
DeepSeek
GLM
```

而应升级为：

```text
Fast Fix
Cheap Research
Balanced Coding
Deep Review
UI Clone Team
Agent Canvas Auto
```

每个 engine 背后可以是：

- 单模型。
- 规则路由。
- fallback chain。
- 多 Agent workflow。
- OpenCode backend config。

## Phase 1 原则

第一阶段不做训练式 model router。

先做：

- rule-based routing
- model aliases
- fallback
- per-node model selection
- cost event
- latency event
- success/failure event

暂不做：

- 自动训练路由器。
- 基于大量历史数据的复杂推荐。
- 黑盒成本优化。

这里的“训练式 router”指通过大量历史样本训练一个模型，让它自动判断每一步该用哪个模型。Phase 1 不做这种黑盒方案。Phase 1 做可解释的规则路由：用户和系统都能看到为什么这一步用了便宜模型，为什么某一步升级到强模型。

## 路由维度

### 1. 任务阶段

```yaml
routes:
  planning:
    model: cheap-reasoning
  search:
    model: cheap-fast
  code:
    model: balanced-coder
  review:
    model: strong-reviewer
  vision:
    model: vision-only-when-needed
```

### 2. 风险等级

低风险：

- README 总结。
- 搜索文件。
- 简单解释。
- 小范围重命名建议。

中风险：

- 多文件代码改动。
- 测试修复。
- 架构调整。

高风险：

- 数据库迁移。
- 安全相关代码。
- 构建/发布脚本。
- 权限和认证。

策略：

- 低风险用便宜模型。
- 中风险用平衡模型。
- 高风险用强模型 + review model。

### 3. 上下文需求

短上下文：

- cheap fast model。

长上下文：

- long context model。
- 或先用 project map / ripgrep 裁剪上下文。

### 4. 工具可替代性

如果 deterministic tool 可以完成，就不要调用强模型。

优先级：

```text
ripgrep / AST / LSP / tests / typecheck
-> cheap model summarize
-> balanced model code
-> strong model review
```

### 5. 视觉需求

视觉模型只在明确需要时调用：

- screenshot comparison
- UI clone
- visual regression
- browser observation

普通代码任务不默认调用视觉模型。

## Engine 示例

### Cheap Research

适合：

- 搜索资料。
- 读项目。
- 总结文件。

策略：

```yaml
engine:
  id: cheap-research
  type: router
  routes:
    search: cheap-fast
    summarize: cheap-long-context
    final: cheap-reasoning
  budget:
    maxUsd: 0.20
```

### Balanced Coding

适合：

- 常规代码修改。
- 小 bug fix。
- 测试修复。

策略：

```yaml
engine:
  id: balanced-coding
  type: workflow
  routes:
    planning: cheap-reasoning
    code: balanced-coder
    review: strong-reviewer-if-risky
  budget:
    maxUsd: 1.00
```

### Deep Review

适合：

- PR review。
- 安全检查。
- 架构变更。

策略：

```yaml
engine:
  id: deep-review
  type: workflow
  routes:
    scan: cheap-fast
    analysis: strong-reasoning
    final: strong-reviewer
  budget:
    maxUsd: 2.00
```

### UI Clone Team

适合：

- 页面复刻。
- 视觉对齐。
- 截图 diff。

策略：

```yaml
engine:
  id: ui-clone-team
  type: workflow
  routes:
    inspect: cheap-fast
    vision: vision-model
    code: balanced-coder
    visualReview: vision-model
  budget:
    maxUsd: 3.00
```

## Event Log 要记录的成本字段

每次模型调用记录：

```ts
type CostUpdated = {
  type: "cost.updated";
  sessionId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedUsd: number;
  route: string;
  nodeId?: string;
};
```

每次 route decision 记录：

```ts
type ModelRouteSelected = {
  type: "model.route.selected";
  sessionId: string;
  route: string;
  selectedModel: string;
  reason: string;
  fallbackModels?: string[];
};
```

这样 Trace 可以解释：

- 为什么用了这个模型。
- 花了多少钱。
- 有没有 fallback。
- 哪一步最贵。
- 有没有更便宜的替代方案。

## 产品表达

用户看到的不应该是复杂的 provider config，而是清楚的选择：

```text
Fast
Cheap
Balanced
Deep
Vision
Custom
```

高级用户再展开看到：

- route table
- fallback
- cost limit
- model aliases
- per-node model assignment
- user preference

## 用户偏好

后续可以允许用户保存模型偏好：

```yaml
preferences:
  priority: cheap_first
  maxUsdPerTask: 1.00
  allowVisionModel: ask
  allowStrongModelForReview: true
  privacyMode: local_context_only
```

偏好示例：

- `cheap_first`：优先便宜模型，必要时升级。
- `quality_first`：关键步骤默认强模型。
- `fast_first`：优先低延迟。
- `privacy_first`：减少外部模型调用，优先本地/私有 API。

Canvas 的价值是让这些偏好可见、可编辑、可解释。

## 多 Agent 模型搭配

一个 workflow 可以有总 Agent 和多个分 Agent：

```yaml
agents:
  supervisor:
    role: coordinator
    model: balanced-reasoning
  researcher:
    role: repo-research
    model: cheap-long-context
  coder:
    role: code-change
    model: balanced-coder
  reviewer:
    role: review
    model: strong-reviewer
```

讨论必须有上限：

```yaml
discussion:
  participants: [coder, reviewer]
  maxRounds: 3
  stopWhen: review_passed
```

这样可以支持“总 Agent + 分 Agent 各司其职 + 有限讨论”，同时避免成本失控。

## 与 OpenCode 的关系

OpenCode 提供 coding backend 和 model/provider config。

Agent Canvas 在上层提供：

- engine presets
- route policy
- budget guard
- trace cost projection
- per workflow model assignment

这样可以既复用 OpenCode，又形成 Agent Canvas 自己的卖点。
