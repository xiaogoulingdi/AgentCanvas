# Agent Canvas

这是 Agent Canvas 项目的阶段性资料包。

## 目录

- docs/
  - agent-canvas-project-summary.md：项目总览、产品方向、推荐架构和下一步。
  - agent-canvas-technical-research.md：OpenCode、Claude Code SDK、OpenHands、Pi、Plandex 等技术调研报告。

- mockups/v1/
  - 第一版浅色产品概念图。

- mockups/v2/
  - 参考 Trae 的 Code 首页、模型/工作流选择器和运行态图。

- mockups/v3/
  - 当前推荐版：Canvas 作为 Code 任务子视图，包含 Code entry、Engine selector、Canvas view、Running task。

- references/trae-screenshots/
  - 用户上传的 Trae / Traework 参考截图。

- sources/html/
  - 生成 mockup 图片的 HTML 源文件，后续可以继续修改并重新导出。

## 当前推荐方向

Agent Canvas 不应先做成独立画布工具，而应先做成一个 Code 模式里的 Agent 工作流运行时。

核心路径：

User Prompt -> Engine Selector -> Workflow Definition -> Execution Plan -> Agent Runtime -> Tool Broker -> Event Log -> Trace / Artifacts

## 下一步建议

1. 做一个最小技术 Spike。
2. 定义 workflow JSON/YAML。
3. 实现 fake model adapter 和 fake tool adapter。
4. 实现 workflow compiler 与 event log。
5. 再开始正式 PRD、架构文档和 MVP 开发。
