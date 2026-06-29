# OpenCode Integration

日期：2026-06-29

Agent Canvas 以 OpenCode 作为主线参考和未来 backend adapter 目标。本阶段已经完成 OpenCode SDK 的最小接入验证。

## SDK

当前使用：

```text
@opencode-ai/sdk
```

安装版本：

```text
1.17.11
```

SDK 能力包括：

- 启动本地 OpenCode server
- 连接已有 OpenCode server
- 查询 project/path/vcs
- 查询 session
- 发送 prompt
- 查询 diff
- 响应 permission request
- 文件、搜索、PTY、TUI 等接口

## 当前实现

位置：

```text
packages/opencode/src/client.ts
apps/cli/src/opencode-health.ts
```

命令：

```powershell
npm.cmd run opencode:health
```

该命令会：

1. 启动或连接 OpenCode server。
2. 读取当前 project。
3. 读取 path 信息。
4. 读取 VCS 信息。
5. 关闭本进程启动的 server。

## 已验证结果

在当前仓库中，`opencode:health` 已验证通过：

- 能启动 OpenCode server
- 能识别当前 worktree
- 能识别 Git 分支
- 能读取 OpenCode path 配置

## Agent Canvas Adapter 方向

建议后续新增：

```text
packages/backends/src/opencode-backend.ts
```

职责：

- 把 Agent Canvas workflow node 转成 OpenCode session prompt
- 把 OpenCode session messages 转成 Agent Canvas event log
- 把 OpenCode diff 转成 artifact
- 把 OpenCode permission request 转给 PermissionBroker
- 把 OpenCode provider/model 配置和 Agent Canvas Engine Selector 对齐

## 暂不直接做的事

当前还不让 OpenCode 自动改项目源文件，原因是：

- 需要先把 permission bridge 做清楚
- 需要确认 OpenCode session prompt 的返回时机
- 需要把 diff/artifact/revert 路径纳入 Agent Canvas event log

现在 Agent Canvas 已经有自己的受控 CLI 文件编辑工具，可以先验证文件写入、权限和 artifact 保存链路。

## OpenCode Prompt Probe

命令：

```powershell
npm.cmd run opencode:prompt -- --prompt "Summarize this project in one sentence."
```

默认会禁用常见 shell/write/edit/patch 工具：

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

可以指定 provider/model：

```powershell
npm.cmd run opencode:prompt -- --prompt "..." --provider-id anthropic --model-id claude-sonnet-4-20250514
```

## 下一步

1. 调用 OpenCode `session.create` 创建 session。
2. 调用 `session.prompt` 或 `session.promptAsync` 发送一个只读任务。
3. 读取 `session.messages`。
4. 读取 `session.diff`。
5. 只在 `--allow-opencode-edits` 显式开启时允许真实编辑。
