# Agent Canvas CLI Testing

日期：2026-06-29

这个文档记录第一阶段的终端测试方式。当前 CLI 的目标不是完整 UI，而是先跑通最小闭环：

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

## 当前原则

- Phase 1 不改真实项目文件。
- Phase 1 不执行真实 shell 命令。
- workflow 里的 tool call 会被 mock 掉，只写入事件日志。
- API key 不写入仓库，只通过环境变量传入。
- PowerShell 下优先使用 `npm.cmd`，避免 `npm.ps1` 执行策略问题。

## 1. 最安全的 fake 闭环测试

不需要 API key：

```powershell
npm.cmd run run:fake
```

或者启动交互模式：

```powershell
npm.cmd run agent
```

然后选择：

```text
1. Fake Balanced (no API key, safest smoke test)
```

这个模式适合验证 workflow compiler、runtime、event log、trace renderer、artifact 投影是否正常。

## 2. OpenCode-like 终端交互模式

启动：

```powershell
npm.cmd run agent
```

它会让你选择：

- Engine：fake / DeepSeek+Kimi / Sub2API
- Workflow：当前默认是 `Research + Code`
- Prompt：输入任务描述

每次输入一个 prompt 后会运行一次 workflow，并输出：

- route decision
- model response snippet
- permission check
- mocked tool call
- cost event
- artifact summary

输入空 prompt 退出。

## 3. DeepSeek + Kimi 路由测试

PowerShell：

```powershell
$env:DEEPSEEK_API_KEY="sk-your-deepseek-key"
$env:KIMI_API_KEY="sk-your-kimi-key"
$env:KIMI_BASE_URL="https://api.moonshot.cn/v1"

npm.cmd run run:model -- --engine examples/engines/deepseek-kimi-balanced.json --workflow examples/workflows/research-code.json --prompt "Analyze this repo and propose the next safe development step."
```

也可以用交互模式：

```powershell
npm.cmd run agent
```

然后选择：

```text
2. DeepSeek + Kimi Balanced
```

当前路由配置：

- planning / research / code：DeepSeek
- review：Kimi

## 4. SUB2API 路由测试

OpenAI-compatible / Responses API 客户端使用 `/v1`：

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

运行 workflow：

```powershell
npm.cmd run run:model -- --engine examples/engines/sub2api-balanced.json --workflow examples/workflows/research-code.json --prompt "Use the routed engine to propose a safe coding plan."
```

也可以用交互模式：

```powershell
npm.cmd run agent
```

然后选择：

```text
3. Sub2API Balanced
```

当前路由配置：

- planning / research：`gpt-5.4-mini`
- code：`gpt-5.4`
- review：`gpt-5.5`

## 5. 单模型探针

DeepSeek：

```powershell
$env:DEEPSEEK_API_KEY="sk-your-deepseek-key"
npm.cmd run probe:deepseek -- --prompt "Reply with OK only."
```

Kimi：

```powershell
$env:KIMI_API_KEY="sk-your-kimi-key"
$env:KIMI_BASE_URL="https://api.moonshot.cn/v1"
npm.cmd run probe:kimi -- --prompt "Reply with OK only."
```

Custom：

```powershell
$env:AGENT_CANVAS_API_BASE_URL="https://api.lululala.icu/v1"
$env:AGENT_CANVAS_API_KEY="sk-your-key"
$env:AGENT_CANVAS_MODEL="gpt-5.4-mini"
$env:AGENT_CANVAS_WIRE_API="responses"
npm.cmd run probe:custom -- --prompt "Reply with OK only."
```

## 6. 每次开发后的验证

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run run:fake
```

如果改了模型适配器，再额外跑对应 provider 的 probe。

## 7. 为什么现在不先做桌面弹窗

真正桌面窗口通常需要引入 Tauri、Electron 或类似运行壳。它会带来：

- 打包链路
- 自动更新
- 本地权限
- 子进程管理
- 系统托盘/窗口生命周期
- Windows 签名和安装包问题

Agent Canvas 现在最需要验证的是模型路由和多 Agent workflow 是否成立。所以第一阶段先用 CLI 做 OpenCode-like 测试台；等 runtime、权限、event log 稳定后，再把同一套接口接到桌面 UI。
