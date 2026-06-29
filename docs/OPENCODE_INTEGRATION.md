# OpenCode Integration

日期：2026-06-29

Agent Canvas 以 OpenCode 作为主线 backend 参考。本阶段已经完成 SDK 接入、prompt probe、workflow backend、模型列表和 diff artifact 投影。

## SDK

当前依赖：

```text
@opencode-ai/sdk@1.17.11
```

SDK 已验证能力：

- 启动本地 OpenCode server。
- 连接已有 OpenCode server。
- 读取 project/path/vcs。
- 创建 session。
- 发送 prompt。
- 读取 messages。
- 读取 diff。

## 当前实现

```text
packages/opencode/src/client.ts
packages/opencode/src/session-runner.ts
packages/opencode/src/result-parser.ts
packages/backends/src/opencode-backend.ts
apps/cli/src/opencode-health.ts
apps/cli/src/opencode-models.ts
apps/cli/src/opencode-prompt.ts
apps/cli/src/run-opencode.ts
```

## Health Check

```powershell
npm.cmd run opencode:health
```

该命令会启动或连接 OpenCode server，并读取：

- current project
- path
- vcs

## Model List

列出 provider 的模型：

```powershell
npm.cmd run opencode:models -- --provider deepseek --limit 5
```

按关键词搜索：

```powershell
npm.cmd run opencode:models -- --search kimi --limit 5
```

## Prompt Probe

```powershell
npm.cmd run opencode:prompt -- --prompt "Reply with OK only." --provider-id deepseek --model-id deepseek-v4-flash
```

默认禁用常见写入/执行工具：

```text
bash=false
shell=false
write=false
edit=false
patch=false
```

只有显式传入下面参数才允许 OpenCode 编辑：

```powershell
npm.cmd run opencode:prompt -- --prompt "..." --allow-opencode-edits
```

## Workflow Backend

Agent Canvas 可以通过 OpenCode backend 跑 workflow：

```powershell
npm.cmd run run:opencode -- --workflow examples/workflows/opencode-single.json --prompt "Reply with OK only." --timeout-ms 90000
```

默认 provider/model：

```text
provider: deepseek
model: deepseek-v4-flash
```

需要环境变量：

```powershell
$env:DEEPSEEK_API_KEY="sk-your-deepseek-key"
```

默认只跑 1 个 workflow node，避免长 workflow 卡住：

```powershell
npm.cmd run run:opencode -- --workflow examples/workflows/research-code.json --prompt "..." --max-nodes 2 --timeout-ms 90000
```

## Trace Artifacts

OpenCode backend 会把 OpenCode 返回内容投影为 Agent Canvas artifact：

- `report`：模型文本输出。
- `patch`：当 OpenCode 返回 diff 时，生成 markdown diff artifact。

Patch artifact 格式：

````markdown
### path/to/file

Additions: 1
Deletions: 1

```diff
--- a/path/to/file
+++ b/path/to/file
-old
+new
```
````

当前实现会保留 report artifact；如果 OpenCode 返回 diff，会额外生成 patch artifact。

## Kimi 说明

OpenCode 的 `kimi-for-coding` provider 使用 Kimi Coding API：

```text
https://api.kimi.com/coding/v1/messages
```

它不等同于 Moonshot 普通 OpenAI-compatible endpoint。当前用户提供的 Kimi key 可用于 Agent Canvas 自己的 Moonshot adapter，但在 OpenCode 的 `kimi-for-coding` provider 上会返回 401。

因此当前建议：

- OpenCode backend 默认走 `deepseek/deepseek-v4-flash`。
- Kimi 继续走 Agent Canvas 自己的 `kimi` provider profile。

## 安全边界

- 默认不允许 OpenCode 编辑。
- 默认不执行 shell。
- 只有显式 `--allow-opencode-edits` 才允许 edit/write/patch 工具。
- 超时或 provider 错误会进入 `workflow.failed` trace。

## 下一步

1. 把 OpenCode permission request 接到 `PermissionBroker`。
2. 把 OpenCode diff artifact 接到未来 Canvas trace panel。
3. 增加 OpenCode session resume / inspect 命令。
4. 增加更细的 model cost projection。
