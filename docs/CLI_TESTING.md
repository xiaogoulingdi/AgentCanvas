# Agent Canvas CLI Testing

日期：2026-06-29

这份文档记录第一阶段 CLI 的测试方式。目标不是先做完整 UI，而是跑通：

```text
User Prompt
-> Engine Selector
-> Workflow Definition
-> Execution Plan
-> Agent Runtime
-> Tool Broker
-> Event Log
-> Trace / Artifact
```

## 基本原则

- API key 不写入仓库，只通过环境变量注入。
- 默认不执行 shell。
- 默认不直接修改源码。
- 文件写入必须显式传 `--yes`、`--allow-file-edits` 或 `--allow-opencode-edits`。
- PowerShell 下使用 `npm.cmd`。

## 统一交互入口

```powershell
npm.cmd run agent
```

当前可选 engine：

- Fake Balanced
- DeepSeek + Kimi Balanced
- Sub2API Balanced
- OpenCode + DeepSeek

OpenCode 入口默认使用：

```text
provider: deepseek
model: deepseek-v4-flash
```

需要：

```powershell
$env:DEEPSEEK_API_KEY="sk-your-deepseek-key"
```

可选参数：

```powershell
npm.cmd run agent -- --opencode-max-nodes 1 --opencode-timeout-ms 90000
```

允许 OpenCode 编辑时才加：

```powershell
npm.cmd run agent -- --allow-opencode-edits
```

允许 shell 或网络时必须单独显式开启：

```powershell
npm.cmd run agent -- --allow-opencode-shell
npm.cmd run agent -- --allow-opencode-network
```

## Fake 测试

```powershell
npm.cmd run run:fake
```

这个命令不需要 API key，适合验证 workflow、runtime、event log、trace renderer。

运行结束后会打印 `Session`，并把事件写入本地：

```text
.agent-canvas/runs/
```

查看最近运行：

```powershell
npm.cmd run run:list -- --limit 5
npm.cmd run run:inspect -- --latest --artifacts
npm.cmd run run:inspect -- --session-id <session-id> --json
```

Trace 中会显示权限决策，例如：

```text
[permission.checked] coder filesystem.patch -> ask (Scope filesystem.patch matched configured static policy.)
```

Trace 观察器：

```text
apps/trace-observer/index.html
```

第一版是静态只读页面。运行下面命令后，把 JSON 粘贴进去即可：

```powershell
npm.cmd run run:inspect -- --latest --json
```

## DeepSeek + Kimi 路由测试

```powershell
$env:DEEPSEEK_API_KEY="sk-your-deepseek-key"
$env:KIMI_API_KEY="sk-your-kimi-key"
$env:KIMI_BASE_URL="https://api.moonshot.cn/v1"

npm.cmd run run:model -- --engine examples/engines/deepseek-kimi-balanced.json --workflow examples/workflows/research-code.json --prompt "Analyze this repo and propose the next safe development step."
```

当前路由：

- planning / research / code：DeepSeek
- review：Kimi

## SUB2API 测试

```powershell
$env:AGENT_CANVAS_API_BASE_URL="https://api.lululala.icu/v1"
$env:AGENT_CANVAS_API_KEY="sk-your-sub2api-key"
$env:AGENT_CANVAS_MODEL="gpt-5.4-mini"
$env:AGENT_CANVAS_WIRE_API="responses"
$env:AGENT_CANVAS_AUTH_HEADER="authorization_bearer"
$env:AGENT_CANVAS_REQUIRES_OPENAI_AUTH="false"
$env:AGENT_CANVAS_DISABLE_RESPONSE_STORAGE="true"

npm.cmd run probe:custom -- --prompt "Reply with OK only."
```

## OpenCode 测试

健康检查：

```powershell
npm.cmd run opencode:health
```

列出模型：

```powershell
npm.cmd run opencode:models -- --provider deepseek --limit 5
npm.cmd run opencode:models -- --search kimi --limit 5
```

通过 OpenCode backend 跑 workflow：

```powershell
$env:DEEPSEEK_API_KEY="sk-your-deepseek-key"
npm.cmd run run:opencode -- --workflow examples/workflows/opencode-single.json --prompt "Reply with OK only." --timeout-ms 90000
```

真实小修改 smoke：

```powershell
$env:DEEPSEEK_API_KEY="sk-your-deepseek-key"
npm.cmd run run:opencode -- --workflow examples/workflows/opencode-single.json --prompt "Change only examples/smoke/opencode-edit.txt so its entire content is exactly: after. Do not edit any other file. Do not run shell commands." --timeout-ms 120000 --allow-opencode-edits
```

成功时 trace 会出现：

```text
[backend.session.observed] ... diffs=1
[artifact.created] patch: OpenCode coder diff
```

然后可以回滚：

```powershell
npm.cmd run patch:list -- --session-id <session-id>
npm.cmd run patch:revert -- --session-id <session-id> --artifact-id <artifact-id>
npm.cmd run patch:revert -- --session-id <session-id> --artifact-id <artifact-id> --yes
```

OpenCode 安全参数：

```powershell
--allow-opencode-edits
--allow-opencode-shell
--allow-opencode-network
```

说明：

- OpenCode 的 `deepseek/deepseek-v4-flash` 已验证可用。
- OpenCode 的 `kimi-for-coding` 使用 Kimi Coding API，不等同于 Moonshot 普通 OpenAI-compatible API。
- 当前 Kimi 更适合走 Agent Canvas 自己的 Moonshot adapter。

## 文件编辑测试

Dry-run：

```powershell
npm.cmd run file:edit -- --path .agent-canvas/test-dry-run.txt --content "hello"
```

真实写入：

```powershell
npm.cmd run file:edit -- --path .agent-canvas/test-write.txt --content "hello" --yes
```

Workflow 写 artifact：

```powershell
npm.cmd run run:fake -- --workspace-tools --allow-file-edits
```

当前 workflow 只写 `.agent-canvas/proposed-changes/` 下的 artifact，不直接修改源码。

## Patch Artifact 测试

OpenCode 返回结构化 diff 时，Agent Canvas 会生成 `patch` artifact。补丁不会自动应用，需要显式命令。

列出最近运行的 patch：

```powershell
npm.cmd run patch:list -- --latest
```

Dry-run 应用：

```powershell
npm.cmd run patch:apply -- --session-id <session-id> --artifact-id <artifact-id>
```

真实应用：

```powershell
npm.cmd run patch:apply -- --session-id <session-id> --artifact-id <artifact-id> --yes
```

拒绝或回滚：

```powershell
npm.cmd run patch:reject -- --session-id <session-id> --artifact-id <artifact-id>
npm.cmd run patch:revert -- --session-id <session-id> --artifact-id <artifact-id> --yes
```

安全规则：

- 只有带结构化 `before/after` metadata 的 patch artifact 可以应用。
- 默认 dry-run，不写文件。
- 应用前会检查当前文件内容是否仍匹配 `before` 快照。
- OpenCode 已真实写入的 patch artifact 会标记为 `applied`，因此可直接 `patch:revert`。
- 已应用的 patch 必须先 revert，不能直接 reject。

## 每次开发后验证

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run run:fake
npm.cmd run run:list -- --limit 3
npm.cmd run run:inspect -- --latest --artifacts
```

如果改了模型或 OpenCode 相关代码，再额外跑：

```powershell
npm.cmd run opencode:models -- --provider deepseek --limit 3
npm.cmd run run:opencode -- --workflow examples/workflows/opencode-single.json --prompt "Reply with OK only." --timeout-ms 90000
```
