import type { AgentEvent } from "../../events/src/events.ts";
import { projectArtifacts, projectTotalEstimatedUsd } from "../../events/src/projections.ts";

export function renderTraceJson(events: AgentEvent[]): string {
  return JSON.stringify(
    {
      sessionId: events[0]?.sessionId ?? null,
      status: events.some((event) => event.type === "workflow.failed") ? "failed" : "completed",
      estimatedUsd: projectTotalEstimatedUsd(events),
      artifacts: projectArtifacts(events),
      events
    },
    null,
    2
  );
}
