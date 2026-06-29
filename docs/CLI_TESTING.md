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

## 每次开发后验证

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run run:fake
```

如果改了模型或 OpenCode 相关代码，再额外跑：

```powershell
npm.cmd run opencode:models -- --provider deepseek --limit 3
npm.cmd run run:opencode -- --workflow examples/workflows/opencode-single.json --prompt "Reply with OK only." --timeout-ms 90000
```
