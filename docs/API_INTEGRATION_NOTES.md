# API 接入记录

日期：2026-06-29

本文用于记录用户临时提供的 API、测试结果和适配结论。禁止在本文或仓库任何文件中写入 API key、token、secret、cookie。

## 安全原则

1. API key 只通过环境变量或本地未提交文件提供。
2. 文档只记录 provider 名称、接口形态、能力、响应结构、错误行为。
3. 测试日志需要脱敏。
4. 临时 API 默认视为不稳定，不作为核心架构前提。
5. adapter 必须可替换。

建议环境变量命名：

```bash
AGENT_CANVAS_API_BASE_URL=
AGENT_CANVAS_API_KEY=
AGENT_CANVAS_MODEL=
AGENT_CANVAS_PROVIDER=
```

如果是 OpenAI-compatible API，可增加：

```bash
OPENAI_BASE_URL=
OPENAI_API_KEY=
OPENAI_MODEL=
```

## API 能力检查清单

每个 API 接入前，先记录：

| 项目 | 结果 |
|---|---|
| Provider 名称 | 待填写 |
| API 类型 | OpenAI-compatible / Anthropic-compatible / custom / unknown |
| Base URL | 只记录域名，不记录 secret query |
| Auth 方式 | Bearer / header / query / other |
| Chat completion | unknown |
| Streaming | unknown |
| Tool/function calling | unknown |
| JSON mode | unknown |
| Vision input | unknown |
| Embeddings | unknown |
| Rate limit | unknown |
| Error format | unknown |
| Cost/usage 字段 | unknown |
| Context length | unknown |

## Probe 测试顺序

### Probe 1：最小文本调用

目的：

- 确认鉴权、base URL、model id 可用。
- 确认响应格式。

请求内容：

```text
Say "ok" and nothing else.
```

记录：

- HTTP status
- response id
- content path
- usage path
- latency
- error format

### Probe 2：结构化 JSON 输出

目的：

- 确认模型是否稳定输出 JSON。
- 为 workflow compiler / planner 输出做准备。

请求内容：

```text
Return JSON with keys: summary, steps.
```

记录：

- 是否支持 JSON mode
- 如果不支持，普通 prompt 约束是否够用
- JSON parse 成功率

### Probe 3：Tool Calling

目的：

- 确认 API 是否支持 function/tool call。
- 决定 adapter 是 native tool calling，还是 text-to-tool parser。

测试 tool：

```json
{
  "name": "project_search",
  "description": "Search the project for files or symbols.",
  "parameters": {
    "type": "object",
    "properties": {
      "query": { "type": "string" }
    },
    "required": ["query"]
  }
}
```

记录：

- tool call 字段路径
- arguments 是 string 还是 object
- 是否支持多个 tool call
- tool result 如何回传

### Probe 4：Streaming

目的：

- 确认未来 Trace UI 是否可以实时显示模型输出。

记录：

- SSE / websocket / chunked response
- delta path
- tool call streaming 支持情况
- final usage 是否返回

### Probe 5：错误和限流

目的：

- 设计 retry、fallback、cost guard。

记录：

- invalid key error
- invalid model error
- rate limit error
- timeout behavior
- retry-after header

## Adapter 设计

核心接口：

```ts
interface ModelAdapter {
  complete(request: ModelRequest): Promise<ModelResponse>;
  stream?(request: ModelRequest): AsyncIterable<ModelStreamEvent>;
}
```

第一阶段 adapter：

- `FakeModelAdapter`
- `ApiProbeAdapter`

未来 adapter：

- `OpenAICompatibleAdapter`
- `LiteLLMAdapter`
- `OpenRouterAdapter`
- `ClaudeAgentSdkAdapter`
- `OpenCodeBackendAdapter`

## API 记录模板

### Provider: 待填写

日期：

提供方：

用途：

有效期：

接口类型：

Base URL：

模型：

能力：

- Chat completion:
- Streaming:
- Tool calling:
- JSON mode:
- Vision:
- Usage:

测试结果：

| Probe | 状态 | 备注 |
|---|---|---|
| 最小文本调用 | pending |  |
| JSON 输出 | pending |  |
| Tool calling | pending |  |
| Streaming | pending |  |
| 错误和限流 | pending |  |

结论：

- 是否可作为第一阶段 probe adapter：
- 是否适合 production adapter：
- 需要的兼容层：


