# 模型接口与 CC Switch 参考

日期：2026-06-29

## 目标

Agent Canvas 后续会接用户提供的自定义 API。模型接口层应该支持：

- OpenAI-compatible chat completions。
- OpenAI Responses API 风格请求。
- 自定义 provider endpoint。
- 本地 router/proxy。
- provider profile。
- route decision logging。
- cost/usage event。

用户提供的 API key 不进入仓库。所有 key 只通过环境变量或本地未提交配置注入。

## CC Switch 可参考点

CC Switch 的核心思路适合 Agent Canvas 的模型接口层：

- 本地启动一个 routing/proxy service。
- 为不同 coding tool 提供兼容入口。
- 在 provider 之间切换。
- 做协议适配，例如 Codex 的 Responses API 和常见 Chat Completions API 之间的格式转换。
- 记录或展示当前 route/provider。

Agent Canvas 不需要照搬 CC Switch，但可以借鉴它的分层：

```text
Client / Backend
  -> Local Router
  -> Protocol Adapter
  -> Provider Adapter
  -> Model API
```

对应到 Agent Canvas：

```text
Workflow Node
  -> Model Route Resolver
  -> Model Protocol Adapter
  -> Provider Profile
  -> Custom API / OpenAI-compatible API / Local Proxy
  -> Event Log
```

## 自定义 API 设计

建议把 provider 配置成 profile：

```yaml
providers:
  deepseek-custom:
    type: openai_compatible
    baseUrl: ${DEEPSEEK_BASE_URL}
    apiKeyEnv: DEEPSEEK_API_KEY
    defaultModel: deepseek-chat

  kimi-custom:
    type: openai_compatible
    baseUrl: ${KIMI_BASE_URL}
    apiKeyEnv: KIMI_API_KEY
    defaultModel: moonshot-v1-32k
```

不要把 API key 写进 JSON/YAML。

## 统一模型请求接口

```ts
type ModelRequest = {
  providerId: string;
  model: string;
  messages: ModelMessage[];
  tools?: ModelTool[];
  responseFormat?: "text" | "json";
  stream?: boolean;
};
```

```ts
type ModelResponse = {
  id: string;
  providerId: string;
  model: string;
  content: string;
  toolCalls?: ToolCallRequest[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
    estimatedUsd?: number;
  };
  raw?: unknown;
};
```

## Protocol Adapter

Agent Canvas 需要区分 provider adapter 和 protocol adapter。

Provider adapter 负责：

- base URL
- auth header
- model id
- rate limit behavior
- usage 字段路径

Protocol adapter 负责：

- Chat Completions request/response。
- Responses API request/response。
- tool calling 格式。
- streaming delta 格式。

这样以后可以支持：

- OpenCode backend 使用一种协议。
- Codex-like backend 使用 Responses API。
- 自定义 API 使用 OpenAI-compatible chat completions。
- 本地 CC Switch-like router 做协议转换。

## Phase 1 实施建议

第一阶段先做：

1. `FakeBackendAdapter` 跑通闭环。
2. `ApiProbeAdapter` 只做最小文本调用。
3. `OpenAICompatibleModelAdapter` 作为自定义 API 的第一实现。
4. 记录 response shape，不直接依赖某个供应商特性。

暂不做：

- streaming UI。
- tool calling production support。
- 自动训练 router。
- provider marketplace。

## 环境变量建议

```bash
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=
DEEPSEEK_MODEL=

KIMI_API_KEY=
KIMI_BASE_URL=
KIMI_MODEL=
```

也可以兼容统一命名：

```bash
AGENT_CANVAS_API_BASE_URL=
AGENT_CANVAS_API_KEY=
AGENT_CANVAS_MODEL=
AGENT_CANVAS_PROVIDER=
```

## 安全说明

本仓库不保存 API key。

如果 API key 曾经出现在聊天、日志或截图中，建议后续轮换。

## 与模型性价比策略的关系

模型接口层只负责调用模型。是否选择便宜模型、强模型、fallback 模型，由 `Model Route Resolver` 决定。

每次 route 都应写入事件：

```ts
type ModelRouteSelected = {
  route: string;
  selectedModel: string;
  reason: string;
  fallbackModels?: string[];
};
```

这样用户能在 Canvas / Trace 里看到：

- 为什么这一步用便宜模型。
- 为什么 review 升级到强模型。
- 这一步花了多少钱。
- 是否触发 fallback。

