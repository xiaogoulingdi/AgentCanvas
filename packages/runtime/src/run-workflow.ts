import type { AgentBackend, BackendEvent } from "../../backends/src/types.ts";
import type { EventLog } from "../../events/src/memory-event-log.ts";
import type { AgentEvent } from "../../events/src/events.ts";
import { createId, nowIso } from "../../shared/src/ids.ts";
import type { ExecutionEngine } from "../../engines/src/types.ts";
import type { ExecutionPlan } from "../../workflow/src/types.ts";

export async function runWorkflow(input: {
  sessionId: string;
  prompt: string;
  engine: ExecutionEngine;
  plan: ExecutionPlan;
  backend: AgentBackend;
  eventLog: EventLog;
}): Promise<void> {
  const { sessionId, prompt, engine, plan, backend, eventLog } = input;

  await eventLog.append(base(sessionId, { type: "user.prompt.submitted", prompt }));
  await eventLog.append(base(sessionId, { type: "engine.selected", engineId: engine.id, engineType: engine.type }));
  await eventLog.append(base(sessionId, { type: "workflow.loaded", workflowId: plan.workflowId, workflowName: plan.workflowName }));
  await eventLog.append(
    base(sessionId, {
      type: "workflow.compiled",
      workflowId: plan.workflowId,
      planId: plan.id,
      nodeCount: plan.nodes.length,
      edgeCount: plan.edges.length
    })
  );

  try {
    for await (const backendEvent of backend.run({ sessionId, prompt, plan })) {
      for (const event of mapBackendEvent(sessionId, backendEvent)) {
        await eventLog.append(event);
      }
    }
    await eventLog.append(base(sessionId, { type: "workflow.completed", workflowId: plan.workflowId, planId: plan.id }));
  } catch (error) {
    await eventLog.append(
      base(sessionId, {
        type: "workflow.failed",
        workflowId: plan.workflowId,
        message: error instanceof Error ? error.message : String(error)
      })
    );
    throw error;
  }
}

function mapBackendEvent(sessionId: string, event: BackendEvent): AgentEvent[] {
  switch (event.type) {
    case "agent.started":
      return [base(sessionId, { type: "agent.started", nodeId: event.node.id, role: event.node.role })];
    case "model.route.selected":
      return [
        base(sessionId, {
          type: "model.route.selected",
          nodeId: event.node.id,
          route: event.node.route ?? event.node.role,
          selectedModel: event.model,
          reason: event.reason,
          fallbackModels: event.fallback
        })
      ];
    case "model.request.completed":
      return [
        base(sessionId, {
          type: "model.request.completed",
          nodeId: event.node.id,
          model: event.model,
          content: event.content
        }),
        base(sessionId, {
          type: "cost.updated",
          nodeId: event.node.id,
          model: event.model,
          inputTokens: event.inputTokens,
          outputTokens: event.outputTokens,
          estimatedUsd: event.estimatedUsd
        })
      ];
    case "permission.policy.loaded":
      return [
        base(sessionId, {
          type: "permission.policy.loaded",
          source: event.source,
          defaultDecision: event.defaultDecision,
          policy: event.policy
        })
      ];
    case "tool.call.requested":
      return [base(sessionId, { type: "tool.call.requested", nodeId: event.node.id, toolName: event.toolName })];
    case "permission.checked":
      return [
        base(sessionId, {
          type: "permission.checked",
          nodeId: event.node.id,
          scope: event.scope,
          decision: event.decision,
          ...(event.reason ? { reason: event.reason } : {}),
          ...(event.source ? { source: event.source } : {})
        })
      ];
    case "tool.call.completed":
      return [
        base(sessionId, {
          type: "tool.call.completed",
          nodeId: event.node.id,
          toolName: event.toolName,
          summary: event.summary
        })
      ];
    case "artifact.created":
      return [base(sessionId, { type: "artifact.created", nodeId: event.node.id, artifact: event.artifact })];
    case "agent.completed":
      return [base(sessionId, { type: "agent.completed", nodeId: event.node.id, status: event.status })];
  }
}

function base<T extends Omit<AgentEvent, "id" | "sessionId" | "timestamp">>(sessionId: string, event: T): AgentEvent {
  return {
    id: createId("event"),
    sessionId,
    timestamp: nowIso(),
    ...event
  } as unknown as AgentEvent;
}
