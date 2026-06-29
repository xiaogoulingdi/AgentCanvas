import type { AgentEvent } from "../../events/src/events.ts";
import { projectTotalEstimatedUsd } from "../../events/src/projections.ts";

export function renderTraceText(events: AgentEvent[]): string {
  const lines = events.map((event) => {
    switch (event.type) {
      case "engine.selected":
        return `[${event.type}] ${event.engineId}`;
      case "workflow.compiled":
        return `[${event.type}] nodes=${event.nodeCount} edges=${event.edgeCount}`;
      case "agent.started":
        return `[${event.type}] ${event.nodeId} role=${event.role}`;
      case "backend.session.observed":
        return `[${event.type}] ${event.nodeId} ${event.backend}/${event.externalSessionId} status=${event.status} messages=${event.messageCount} diffs=${event.diffCount}`;
      case "model.route.selected":
        return `[${event.type}] ${event.nodeId} -> ${event.selectedModel} (${event.reason})`;
      case "model.request.completed":
        return `[${event.type}] ${event.nodeId} ${event.model}\n  ${formatSnippet(event.content)}`;
      case "permission.policy.loaded":
        return `[${event.type}] ${event.source} default=${event.defaultDecision} scopes=${Object.keys(event.policy).length}`;
      case "permission.checked":
        return `[${event.type}] ${event.nodeId} ${event.scope} -> ${event.decision}${event.reason ? ` (${event.reason})` : ""}`;
      case "tool.call.requested":
        return `[${event.type}] ${event.nodeId} ${event.toolName}`;
      case "tool.call.completed":
        return `[${event.type}] ${event.nodeId} ${event.toolName}: ${formatSnippet(event.summary, 180)}`;
      case "cost.updated":
        return `[${event.type}] ${event.nodeId} ${event.model} ~$${event.estimatedUsd.toFixed(4)}`;
      case "artifact.created":
        return `[${event.type}] ${event.artifact.kind}: ${event.artifact.title}\n  ${formatSnippet(event.artifact.content)}`;
      case "workflow.failed":
        return `[${event.type}] ${event.message}`;
      default:
        return `[${event.type}]`;
    }
  });

  lines.push(`[trace.cost.total] ~$${projectTotalEstimatedUsd(events).toFixed(4)}`);
  return lines.join("\n");
}

function formatSnippet(value: string, maxLength = 360): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "(empty)";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
}
