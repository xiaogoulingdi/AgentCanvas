# Agent Canvas Configuration

日期：2026-06-30

## 为什么需要统一配置

OpenCode 和 Codex 都有一个重要共同点：它们把模型、provider、工具、MCP、权限和项目级行为放在一个可审计配置层里。

Agent Canvas 也应该有类似能力，但要保留自己的产品边界：

```text
配置文件定义用户选择
-> Canvas 可视化编辑配置
-> Runtime 执行配置
-> Event Log 审计配置产生的行为
```

模型选择、MCP 工具和权限策略不应该散落在 CLI 参数里。

## 文件分层

建议分层：

```text
agentcanvas.config.json          # 项目可提交配置
agentcanvas.local.json           # 本地私有覆盖，不提交
.env                             # API key，不提交
examples/groups/*.json           # 可复用 Multi-Agent Group
examples/workflows/*.json        # 执行层 workflow
.agent-canvas/runs/              # 本地运行日志，不提交
```

当前仓库提供：

```text
agentcanvas.config.example.json
schemas/agentcanvas.config.schema.json
```

## 安全原则

- 不把 API key 写进 `agentcanvas.config.json`。
- 配置里只写 `apiKeyEnv`。
- `.env`、`agentcanvas.local.json`、`.agent-canvas/` 不提交。
- 项目配置可以进入 Git；本地密钥和个人路径不进入 Git。

## 配置示例

```json
{
  "$schema": "./schemas/agentcanvas.config.schema.json",
  "version": "0.1.0",
  "defaultEngine": "balanced-coding-group",
  "opencodeDefault": "deepseek/deepseek-v4-flash",
  "providers": {
    "deepseek": {
      "type": "openai_compatible",
      "baseUrl": "https://api.deepseek.com",
      "apiKeyEnv": "DEEPSEEK_API_KEY",
      "wireApi": "chat_completions"
    }
  },
  "mcpServers": {
    "node_repl": {
      "command": "node_repl.exe",
      "args": [],
      "env": {}
    }
  },
  "tools": {
    "filesystem.read": "allow",
    "filesystem.patch": "ask",
    "shell": "deny",
    "network": "ask"
  },
  "groups": ["examples/groups/balanced-coding-group.json"],
  "workflows": ["examples/workflows/research-code.json"]
}
```

## 与 OpenCode / Codex 的关系

借鉴 OpenCode：

- JSON 配置，适合项目内提交和 schema 校验。
- provider 可以配置 base URL、自定义 wire API。
- MCP server 可以集中声明。

借鉴 Codex：

- 明确 project trust / local config / secrets 的边界。
- 权限、sandbox、MCP、provider 不混在 prompt 里。
- 本地覆盖和项目配置分离。

Agent Canvas 自己的差异：

- `groups` 指向 Multi-Agent Group。
- `tools` 和 `permissions` 是 Canvas 可视化配置的一部分。
- runtime 不隐藏自动切换模型，只执行用户配置。

## CLI 使用

后续 CLI 统一支持：

```powershell
npm.cmd run run:model -- --config agentcanvas.config.example.json --workflow examples/workflows/research-code.json --prompt "..."
npm.cmd run run:opencode -- --config agentcanvas.config.example.json --workflow examples/workflows/opencode-single.json --prompt "..."
npm.cmd run agent -- --config agentcanvas.config.example.json
```

## 下一步

1. 让 model provider registry 从 config 动态注册 provider。
2. Canvas UI 从 config 生成 provider / model / tool / group 选择器。
3. `agentcanvas.local.json` 支持覆盖本地路径、MCP 命令和默认模型。
4. 把 config diff 写进 trace，方便审计一次运行使用了哪份配置。
