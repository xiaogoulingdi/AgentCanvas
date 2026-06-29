# Agent Canvas UI Data Models

日期：2026-06-29

## Trace Observer Input

来自：

```powershell
npm.cmd run run:inspect -- --latest --json
```

结构：

```ts
type TraceInspectJson = {
  sessionId: string;
  status: "completed" | "failed";
  estimatedUsd: number;
  artifacts: Artifact[];
  events: AgentEvent[];
};
```

## 关键事件

- `backend.session.observed`：外部 backend session，例如 OpenCode sessionId、messageCount、diffCount。
- `permission.policy.loaded`：本次运行加载的权限策略。
- `permission.checked`：节点级权限检查结果。
- `artifact.created`：report、patch、trace、note。
- `workflow.failed`：失败原因。

## 后续 UI 数据来源

第一版用粘贴 JSON；后续可以改为：

- 本地 dev server 读取 `.agent-canvas/runs/`。
- 桌面端主进程通过安全 IPC 暴露 run store。
- Canvas trace panel 订阅 runtime event stream。
