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
  | {
      type: "backend.session.observed";
      node: PlanNode;
      backend: string;
      externalSessionId: string;
      status: "running" | "completed" | "failed" | "unknown";
      messageCount: number;
      diffCount: number;
      metadata?: Record<string, unknown>;
    }
  | { type: "model.route.selected"; node: PlanNode; model: string; reason: string; fallback: string[] }
  | { type: "model.request.completed"; node: PlanNode; model: string; content: string; inputTokens: number; outputTokens: number; estimatedUsd: number }
  | { type: "tool.call.requested"; node: PlanNode; toolName: string }
  | { type: "permission.policy.loaded"; source: string; defaultDecision: "allow" | "ask" | "deny"; policy: Record<string, "allow" | "ask" | "deny"> }
  | { type: "permission.checked"; node: PlanNode; scope: string; decision: "allow" | "ask" | "deny"; reason?: string; source?: string }
  | { type: "tool.call.completed"; node: PlanNode; toolName: string; summary: string }
  | { type: "artifact.created"; node: PlanNode; artifact: Artifact }
  | { type: "agent.completed"; node: PlanNode; status: "completed" | "failed" };
