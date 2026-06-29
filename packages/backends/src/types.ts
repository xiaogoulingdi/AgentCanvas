import type { Artifact } from "../../events/src/events.ts";
import type { ExecutionPlan, PlanNode } from "../../workflow/src/types.ts";

export interface AgentBackend {
  id: string;
  capabilities: BackendCapabilities;
  run(request: BackendRunRequest): AsyncIterable<BackendEvent>;
}

export type BackendCapabilities = {
  supportsTools: boolean;
  supportsStreaming: boolean;
  supportsPermissions: boolean;
  supportsArtifacts: boolean;
};

export type BackendRunRequest = {
  sessionId: string;
  prompt: string;
  plan: ExecutionPlan;
};

export type BackendEvent =
  | { type: "agent.started"; node: PlanNode }
  | { type: "model.route.selected"; node: PlanNode; model: string; reason: string; fallback: string[] }
  | { type: "model.request.completed"; node: PlanNode; model: string; content: string; inputTokens: number; outputTokens: number; estimatedUsd: number }
  | { type: "tool.call.requested"; node: PlanNode; toolName: string }
  | { type: "permission.checked"; node: PlanNode; scope: string; decision: "allow" | "ask" | "deny" }
  | { type: "tool.call.completed"; node: PlanNode; toolName: string; summary: string }
  | { type: "artifact.created"; node: PlanNode; artifact: Artifact }
  | { type: "agent.completed"; node: PlanNode; status: "completed" | "failed" };
