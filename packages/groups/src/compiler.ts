import type { WorkflowDefinition, WorkflowNode } from "../../workflow/src/types.ts";
import type { MultiAgentGroupDefinition } from "./types.ts";
import { validateMultiAgentGroup } from "./validate.ts";

export function compileGroupToWorkflow(group: MultiAgentGroupDefinition): WorkflowDefinition {
  const errors = validateMultiAgentGroup(group);
  if (errors.length > 0) {
    throw new Error(`Invalid Multi-Agent Group '${group.id}':\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }

  const nodes: Record<string, WorkflowNode> = {};
  for (const [strategyId, strategy] of Object.entries(group.strategies)) {
    nodes[strategyId] = {
      type: "agent",
      role: strategy.role,
      route: strategyId,
      model: `${strategy.model.provider}/${strategy.model.model}`,
      ...(strategy.tools ? { tools: strategy.tools } : {}),
      ...(strategy.permissions ? { permissions: strategy.permissions } : {})
    };
  }

  return {
    id: group.id,
    name: group.name,
    version: group.version,
    entry: group.entryStrategy,
    nodes,
    edges: Object.entries(group.strategies).flatMap(([strategyId, strategy]) =>
      (strategy.canCall ?? []).map((rule) => ({
        from: strategyId,
        to: rule.strategy,
        when: `${rule.when} maxCalls=${rule.maxCalls}`
      }))
    ),
    limits: {
      maxSteps: group.limits.maxSteps,
      maxDiscussionRounds: group.limits.maxDiscussionRounds,
      maxEstimatedUsd: group.limits.maxEstimatedUsd,
      maxRuntimeSeconds: group.limits.maxRuntimeSeconds
    }
  };
}
