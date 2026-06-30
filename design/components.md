# Agent Canvas Components

日期：2026-06-29

## Trace Observer

第一版是只读观察器，不做拖拽编辑。

布局：

- 左侧：运行摘要、session、状态、成本、artifact 数量。
- 中间：事件时间线，按执行顺序展示。
- 右侧：选中事件详情、artifact 列表、patch 状态。

状态：

- empty：等待粘贴 `run:inspect --json` 输出。
- valid：展示 trace、artifact、权限、backend session。
- error：JSON 无法解析或缺少 events。

交互：

- 从本地 run API 加载运行列表。
- 选择历史运行并加载 trace。
- 粘贴 JSON。
- 点击事件查看详情。
- 按事件类型过滤。

约束：

- 不直接修改文件。
- 不连接模型。
- 本地 dev server 只读取 `.agent-canvas/runs/`，不执行模型、不写文件。
