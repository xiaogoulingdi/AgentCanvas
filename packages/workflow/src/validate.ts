import type { WorkflowDefinition } from "./types.ts";

export function validateWorkflow(workflow: WorkflowDefinition): string[] {
  const errors: string[] = [];

  if (!workflow.id) errors.push("Workflow id is required.");
  if (!workflow.name) errors.push("Workflow name is required.");
  if (!workflow.version) errors.push("Workflow version is required.");
  if (!workflow.entry) errors.push("Workflow entry is required.");

  const nodeIds = Object.keys(workflow.nodes ?? {});
  if (nodeIds.length === 0) errors.push("Workflow must define at least one node.");
  if (workflow.entry && !workflow.nodes[workflow.entry]) {
    errors.push(`Entry node '${workflow.entry}' does not exist.`);
  }

  for (const edge of workflow.edges ?? []) {
    if (!workflow.nodes[edge.from]) errors.push(`Edge source '${edge.from}' does not exist.`);
    if (!workflow.nodes[edge.to]) errors.push(`Edge target '${edge.to}' does not exist.`);
  }

  for (const discussion of workflow.discussions ?? []) {
    if (discussion.maxRounds < 1) errors.push("Discussion maxRounds must be at least 1.");
    if (discussion.maxRounds > 5) errors.push("Discussion maxRounds must not exceed 5 in Phase 1.");
    for (const participant of discussion.participants) {
      if (!workflow.nodes[participant]) {
        errors.push(`Discussion participant '${participant}' does not exist.`);
      }
    }
  }

  if ((workflow.limits?.maxSteps ?? 1) < 1) errors.push("maxSteps must be at least 1.");
  if ((workflow.limits?.maxDiscussionRounds ?? 1) > 5) {
    errors.push("maxDiscussionRounds must not exceed 5 in Phase 1.");
  }

  return errors;
}
