# Agent Canvas UI Data Models

Date: 2026-06-30

## Run Creation

The workbench calls the local trace server:

```http
POST /api/runs
```

Request:

```ts
type CreateRunRequest = {
  prompt: string;
  engine?: "fake" | "opencode";
  workflow?: string;
  group?: string;
  config?: string;
  allowOpenCodeEdits?: boolean;
  allowOpenCodeShell?: boolean;
  allowOpenCodeNetwork?: boolean;
  timeoutMs?: number;
  maxNodes?: number;
};
```

Response is the same trace inspect shape used by CLI:

```ts
type TraceInspectJson = {
  sessionId: string;
  status: "completed" | "failed";
  estimatedUsd: number;
  artifacts: Artifact[];
  events: AgentEvent[];
};
```

## Run Listing

```http
GET /api/runs?limit=50
GET /api/runs/latest
GET /api/runs/:sessionId
```

The sidebar uses run summaries from `JsonlEventLog.listRuns()`.

## Key Events

- `user.prompt.submitted`: original prompt.
- `engine.selected`: chosen engine type.
- `workflow.loaded`: workflow/group identity.
- `workflow.compiled`: node and edge counts.
- `agent.started`: node entered runtime.
- `backend.session.observed`: external backend session such as OpenCode.
- `model.route.selected`: route/model decision for a node.
- `permission.policy.loaded`: policy source and default decision.
- `permission.checked`: concrete permission decision.
- `artifact.created`: report, patch, trace, or note.
- `workflow.completed` / `workflow.failed`: terminal state.

## Canvas Projection

The v0.1 canvas is projected from events, with fallbacks from known example workflow/group names.

```ts
type CanvasNodeView = {
  id: string;
  role: string;
  status: "pending" | "running" | "completed" | "failed" | "observed";
  route?: string;
  model?: string;
  tools?: string[];
  permissions?: string[];
};
```

Later desktop UI can replace this projection with a persisted canvas document, but the event log remains the audit source.
