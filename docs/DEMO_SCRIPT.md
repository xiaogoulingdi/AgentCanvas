# Agent Canvas Demo Script

日期：2026-06-30

这份脚本用于展示 Agent Canvas 第一阶段闭环。目标不是展示完整桌面端，而是展示：

```text
Prompt -> Engine -> Workflow -> Runtime -> Permission -> Event Log -> Trace -> Artifact -> Patch Revert
```

## 0. 准备

PowerShell 中统一使用 `npm.cmd`。

不要把 API key 写进文件，只在当前终端设置：

```powershell
$env:DEEPSEEK_API_KEY="sk-your-deepseek-key"
```

基础检查：

```powershell
npm.cmd run check
npm.cmd test
```

## 1. 展示 Fake 多 Agent 闭环

```powershell
npm.cmd run run:fake
```

讲解点：

- workflow 被编译成 execution plan。
- supervisor / researcher / coder / reviewer 依次执行。
- trace 中能看到模型路由、权限检查、工具调用、artifact。
- 运行结果被写入 `.agent-canvas/runs/`。

查看最近运行：

```powershell
npm.cmd run run:list -- --limit 3
npm.cmd run run:inspect -- --latest --artifacts
```

## 2. 展示 OpenCode 真实模型调用

```powershell
npm.cmd run run:opencode -- --workflow examples/workflows/opencode-single.json --prompt "Reply with OK only. Do not edit files." --timeout-ms 90000
```

讲解点：

- OpenCode 是主线 backend。
- 默认模型为 `deepseek/deepseek-v4-flash`。
- trace 中会出现 `backend.session.observed`，包含 OpenCode sessionId、messageCount、diffCount。
- 默认不允许编辑、shell、network。

## 3. 展示真实编辑和可回滚 patch

先确认 smoke 文件初始内容：

```powershell
Get-Content examples/smoke/opencode-edit.txt
```

让 OpenCode 只修改这个文件：

```powershell
npm.cmd run run:opencode -- --workflow examples/workflows/opencode-single.json --prompt "Change only examples/smoke/opencode-edit.txt so its entire content is exactly: after. Do not edit any other file. Do not run shell commands." --timeout-ms 120000 --allow-opencode-edits
```

讲解点：

- `--allow-opencode-edits` 只打开 edit/write/patch。
- shell 和 network 仍然关闭。
- trace 中应看到 `diffs=1`。
- patch artifact 会标记为 applied，因为 OpenCode 已经真实写入文件。

列出 patch：

```powershell
npm.cmd run patch:list -- --session-id <session-id>
```

Dry-run 回滚：

```powershell
npm.cmd run patch:revert -- --session-id <session-id> --artifact-id <artifact-id>
```

真实回滚：

```powershell
npm.cmd run patch:revert -- --session-id <session-id> --artifact-id <artifact-id> --yes
```

确认恢复：

```powershell
Get-Content examples/smoke/opencode-edit.txt
```

## 4. 展示 Trace Observer

启动本地 Trace Observer API：

```powershell
npm.cmd run trace:serve
```

打开：

```text
http://127.0.0.1:4317
```

讲解点：

- 左侧展示 run list 和运行摘要。
- 中间展示 trace timeline。
- 右侧展示事件详情和 artifact。
- 可以直接看权限、OpenCode session、patch artifact。

也可以通过 API 发起一次 fake run：

```powershell
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:4317/api/runs" -ContentType "application/json" -Body '{"prompt":"Demo from local API","engine":"fake","workflow":"examples/workflows/research-code.json"}'
```

如果不启动 server，也可以直接打开静态文件：

```text
apps/trace-observer/index.html
```

然后粘贴：

```powershell
npm.cmd run run:inspect -- --latest --json
```

## 5. 展示结论

当前已经跑通的是技术闭环：

```text
User Prompt
-> Engine Selector
-> Workflow Definition
-> Execution Plan
-> Agent Runtime
-> OpenCode / Model Backend
-> Permission Broker
-> Event Log
-> Trace / Artifact
-> Patch Revert
```

下一阶段可以把 Multi-Agent Group 做成产品层配置：用户在 Canvas 中配置主策略和子策略，Runtime 负责执行和审计。
