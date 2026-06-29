export type AgentEvent =
  | UserPromptSubmittedEvent
  | EngineSelectedEvent
  | WorkflowLoadedEvent
  | WorkflowCompiledEvent
  | AgentStartedEvent
  | ModelRouteSelectedEvent
  | ModelRequestCompletedEvent
  | PermissionPolicyLoadedEvent
  | ToolCallRequestedEvent
  | PermissionCheckedEvent
  | ToolCallCompletedEvent
  | CostUpdatedEvent
  | ArtifactCreatedEvent
  | AgentCompletedEvent
  | WorkflowCompletedEvent
  | WorkflowFailedEvent;

export type BaseEvent = {
  id: string;
  sessionId: string;
  timestamp: string;
};

export type EventMetadata = Record<string, unknown>;

export type UserPromptSubmittedEvent = BaseEvent & {
  type: "user.prompt.submitted";
  prompt: string;
};

export type EngineSelectedEvent = BaseEvent & {
  type: "engine.selected";
  engineId: string;
  engineType: "single_model" | "router" | "workflow";
};

export type WorkflowLoadedEvent = BaseEvent & {
  type: "workflow.loaded";
  workflowId: string;
  workflowName: string;
};

export type WorkflowCompiledEvent = BaseEvent & {
  type: "workflow.compiled";
  workflowId: string;
  planId: string;
  nodeCount: number;
  edgeCount: number;
};

export type AgentStartedEvent = BaseEvent & {
  type: "agent.started";
  nodeId: string;
  role: string;
};

export type ModelRouteSelectedEvent = BaseEvent & {
  type: "model.route.selected";
  nodeId: string;
  route: string;
  selectedModel: string;
  reason: string;
  fallbackModels?: string[];
};

export type ModelRequestCompletedEvent = BaseEvent & {
  type: "model.request.completed";
  nodeId: string;
  model: string;
  content: string;
};

export type PermissionPolicyLoadedEvent = BaseEvent & {
  type: "permission.policy.loaded";
  source: string;
  defaultDecision: "allow" | "ask" | "deny";
  policy: Record<string, "allow" | "ask" | "deny">;
};

export type ToolCallRequestedEvent = BaseEvent & {
  type: "tool.call.requested";
  nodeId: string;
  toolName: string;
};

export type PermissionCheckedEvent = BaseEvent & {
  type: "permission.checked";
  nodeId: string;
  scope: string;
  decision: "allow" | "ask" | "deny";
  reason?: string;
  source?: string;
};

export type ToolCallCompletedEvent = BaseEvent & {
  type: "tool.call.completed";
  nodeId: string;
  toolName: string;
  summary: string;
};

export type CostUpdatedEvent = BaseEvent & {
  type: "cost.updated";
  nodeId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedUsd: number;
};

export type ArtifactCreatedEvent = BaseEvent & {
  type: "artifact.created";
  nodeId: string;
  artifact: Artifact;
};

export type AgentCompletedEvent = BaseEvent & {
  type: "agent.completed";
  nodeId: string;
  status: "completed" | "failed";
};

export type WorkflowCompletedEvent = BaseEvent & {
  type: "workflow.completed";
  workflowId: string;
  planId: string;
};

export type WorkflowFailedEvent = BaseEvent & {
  type: "workflow.failed";
  workflowId: string;
  message: string;
};

export type Artifact = {
  id: string;
  kind: "patch" | "report" | "trace" | "note";
  title: string;
  content: string;
  metadata?: EventMetadata;
};
