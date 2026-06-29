# Local Skills

日期：2026-06-29

本项目在 `.codex/skills/` 下保存项目本地 Skills，用于让后续 Codex 线程继承项目流程和产品判断。

## Skills

### `agent-canvas-github-maintenance`

来源：提取自 `xiaogoulingdi/skills` 的 `project-init-workshop` 中 GitHub workflow 和 process norms 相关内容，并按 Agent Canvas 当前仓库调整。

用途：

- GitHub workflow
- branch/commit/PR 规范
- `.gitignore`
- repository hygiene
- 测试和提交前检查

### `agent-canvas-ui-design`

来源：提取自 `xiaogoulingdi/skills` 的 `ui-design-ref`，并按 Agent Canvas 的 Canvas observer/editor、model routing、trace、permission UI 做项目化调整。

用途：

- Canvas UI 设计
- Engine Selector UI
- Trace/Artifact 面板
- model routing 配置界面
- 后续 frontend 实现前的设计准则

## 使用原则

- Skills 只保留必要流程，不复制原仓库全部内容。
- 详细项目决策仍以 `docs/DECISIONS.md`、`docs/PROJECT_REVIEW.md`、`docs/CANVAS_PRODUCT_LAYER.md` 为准。
- API key 和 `.env` 不进入 Skill 或文档。

