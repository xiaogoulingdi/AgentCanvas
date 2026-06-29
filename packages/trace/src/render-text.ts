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
      case "model.route.selected":
        return `[${event.type}] ${event.nodeId} -> ${event.selectedModel} (${event.reason})`;
      case "cost.updated":
        return `[${event.type}] ${event.nodeId} ${event.model} ~$${event.estimatedUsd.toFixed(4)}`;
      case "artifact.created":
        return `[${event.type}] ${event.artifact.kind}: ${event.artifact.title}`;
      default:
        return `[${event.type}]`;
    }
  });

  lines.push(`[trace.cost.total] ~$${projectTotalEstimatedUsd(events).toFixed(4)}`);
  return lines.join("\n");
}
