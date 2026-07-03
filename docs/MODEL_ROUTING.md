# Model Routing

日期：2026-06-29

Agent Canvas routes each workflow node to a provider/model pair. This is the first real version of the product idea that the model selector can choose an execution engine instead of a single model.

## Engine Config

Example:

```json
{
  "id": "deepseek-kimi-balanced",
  "name": "DeepSeek + Kimi Balanced",
  "routes": {
    "planning": {
      "provider": "deepseek",
      "model": "deepseek-v4-flash",
      "reason": "Planning should be fast and inexpensive."
    },
    "review": {
      "provider": "kimi",
      "model": "kimi-k2.6",
      "reason": "Review gets a stronger independent model."
    }
  }
}
```

## CLI

Run a workflow with real model calls:

```powershell
$env:DEEPSEEK_API_KEY="..."
$env:KIMI_API_KEY="..."
$env:KIMI_BASE_URL="https://api.moonshot.cn/v1"

npm.cmd run run:model -- --engine examples/engines/deepseek-kimi-balanced.json --workflow examples/workflows/research-code.json --prompt "Analyze this repo and propose the next safe step"
```

Run the interactive terminal mode:

```powershell
npm.cmd run agent
```

## Safety Boundary

`ModelBackedBackendAdapter` uses real model calls, but tools and artifacts are still mocked.

It does not:

- edit files
- run shell commands
- call browser automation
- apply patches

It does:

- route each agent node to a real model
- emit route decision events
- emit usage/cost events when the provider returns token usage
- create a text artifact for coder output

## Sub2API

For a Responses API compatible router:

```powershell
$env:AGENT_CANVAS_API_BASE_URL="https://your-sub2api-host.example/v1"
$env:AGENT_CANVAS_MODEL="gpt-5.4-mini"
$env:AGENT_CANVAS_WIRE_API="responses"
$env:AGENT_CANVAS_AUTH_HEADER="authorization_bearer"
$env:AGENT_CANVAS_API_KEY="sk-your-sub2api-key"

npm.cmd run run:model -- --engine examples/engines/sub2api-balanced.json --workflow examples/workflows/research-code.json --prompt "Analyze this repo"
```

