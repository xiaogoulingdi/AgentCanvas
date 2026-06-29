import { createId } from "../../shared/src/ids.ts";
import { validateWorkflow } from "./validate.ts";
import type { ExecutionPlan, PermissionScope, WorkflowDefinition, WorkflowLimits } from "./types.ts";

const defaultLimits: Required<WorkflowLimits> = {
  maxSteps: 20,
  maxDiscussionRounds: 3,
  maxEstimatedUsd: 1,
  maxRuntimeSeconds: 300
};

export function compileWorkflow(workflow: WorkflowDefinition): ExecutionPlan {
  const errors = validateWorkflow(workflow);
  if (errors.length > 0) {
    throw new Error(`Invalid workflow:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }

  const nodes = Object.entries(workflow.nodes).map(([id, node]) => ({ id, ...node }));
  const requiredTools = unique(nodes.flatMap((node) => node.tools ?? []));
  const requiredModels = unique(nodes.flatMap((node) => (node.model ? [node.model] : [])));
  const permissionScopes = unique(nodes.flatMap((node) => node.permissions ?? []));

  return {
    id: createId("plan"),
    workflowId: workflow.id,
    workflowName: workflow.name,
    entryNodeId: workflow.entry,
    nodes,
    edges: workflow.edges,
    limits: { ...defaultLimits, ...workflow.limits },
    requiredTools,
    requiredModels,
    permissionScopes: permissionScopes as PermissionScope[],
    discussions: workflow.discussions ?? []
  };
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}
