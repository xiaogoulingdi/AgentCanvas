# Agent Canvas 项目资料总览

日期：2026-06-29

## 1. 项目想法

Agent Canvas 是一个面向 AI 编程的多模型、多 Agent 工作流入口。

核心目标不是单纯做一个可视化画布，而是把以下能力统一到一个类似 Trae / Codex / Cursor 的编程入口中：

- 单模型调用
- 多模型路由
- 多 Agent 工作流
- 页面视觉观察
- 代码修改
- AST / 项目结构分析
- 运行 Trace
- 成本统计
- 产物和补丁输出

用户在编程入口里可以选择普通模型，也可以选择一个“工作流模型”或“执行引擎”，例如：

- DeepSeek-V4-Flash
- GLM-4.5
- OpenAI Vision
- Agent Canvas Auto
- UI Clone Team
- Research + Code
- Review Pipeline

底层由模型配置引擎决定它是单模型、模型路由，还是完整的多 Agent workflow。

## 2. 当前产品判断

目前比较清晰的方向是：

> 不要先做一个独立画布工具，而是先做一个 Code 模式里的 Agent 工作流运行时。

画布应该是当前任务的一个可展开视图，而不是挂在 Skills 栏目下面。

推荐结构：

```text
Code 模式
  -> Chat
  -> Plan
  -> Canvas
  -> Trace
```

其中：

- Chat：用户输入编程需求。
- Plan：系统生成执行计划。
- Canvas：展示和编辑当前任务的 Agent 图。
- Trace：展示执行日志、成本、产物、引用。

## 3. 推荐架构

可以把 Agent Canvas 理解为一个 “AI 编译器”：

```text
用户输入
  -> 选择执行引擎：单模型 / 多模型路由 / 多 Agent 工作流
  -> Workflow Definition
  -> Execution Plan
  -> Agent Runtime
  -> Tool / Browser / Filesystem / LSP / Shell
  -> Event Log / Trace / Artifacts / Patch
```

核心模块：

- Engine Selector：统一单模型和工作流模型。
- Workflow Compiler：把 workflow 定义编译成执行计划。
- Agent Runtime：负责调度 agent、工具、模型。
- Tool Broker：统一处理工具权限、调用和审计。
- Model Router：按任务、成本、能力选择模型。
- Event Log：记录所有执行事件，支撑 Trace、恢复和调试。
- UI Canvas：展示执行计划，而不是承担核心逻辑。

## 4. 已生成资料

### 技术文档

- `docs/agent-canvas-technical-research.md`
  - 调研 OpenCode、Claude Code SDK、OpenHands、Pi、Plandex、AutoGen、CrewAI、LangGraph、LiteLLM 等项目。

- `docs/agent-canvas-project-summary.md`
  - 当前这份项目资料总览。

### UI Mockup

`mockups/v1`：

- 第一版浅色 Notion 风格产品界面。
- 更偏产品概念展示。

`mockups/v2`：

- 参考 Trae 的 Code 首页和模型下拉。
- 引入“单模型 + 工作流模型统一选择器”。

`mockups/v3`：

- 当前推荐版。
- 字体更大，布局更清晰。
- Canvas 放在 Code 任务子视图中，而不是 Skills 下。

### 参考截图

`references/trae-screenshots`：

- 用户上传的 Trae / Traework 参考截图。
- 用于对照整体布局、按钮尺寸、模型选择器和右侧任务面板。

### 源文件

`sources/html`：

- 用于生成 mockup PNG 的 HTML 文件。
- 后续可以继续修改并重新导出图片。

## 5. 下一步建议

推荐下一阶段不要马上写完整产品，而是先做技术 Spike：

1. 定义 workflow JSON/YAML。
2. 做一个 fake model adapter。
3. 做一个 fake tool adapter。
4. 实现 workflow compiler。
5. 实现 event log。
6. 跑通一个最小多 Agent 流程。
7. 再接 UI 的 Code / Plan / Canvas / Trace。

之后再进入正式 PRD 和技术规范阶段：

- `PRD.md`
- `ARCHITECTURE.md`
- `WORKFLOW_ENGINE.md`
- `MODEL_ROUTING.md`
- `AGENT_RUNTIME.md`
- `UI_SPEC.md`
- `SECURITY.md`
- `TEST_PLAN.md`

## 6. 关键设计原则

1. 画布不是核心，runtime 才是核心。
2. 单模型和工作流模型应该统一在一个 Engine Selector 中。
3. 所有执行过程必须有 Event Log。
4. 视觉模型只在必要时调用，避免成本失控。
5. AST、LSP、ripgrep、tree-sitter 等确定性工具优先于 LLM。
6. 权限系统必须从第一版就加入。
7. Trace、成本、产物、引用都应该从事件流派生。
