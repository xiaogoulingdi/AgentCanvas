import type { AgentEvent, Artifact } from "./events.ts";

export function projectArtifacts(events: AgentEvent[]): Artifact[] {
  return events.flatMap((event) => (event.type === "artifact.created" ? [event.artifact] : []));
}

export function projectTotalEstimatedUsd(events: AgentEvent[]): number {
  return events.reduce((total, event) => {
    if (event.type !== "cost.updated") return total;
    return total + event.estimatedUsd;
  }, 0);
}
