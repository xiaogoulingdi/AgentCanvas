import type { MultiAgentGroupDefinition } from "./types.ts";

export function validateMultiAgentGroup(group: MultiAgentGroupDefinition): string[] {
  const errors: string[] = [];

  if (!group.id) errors.push("Group id is required.");
  if (!group.name) errors.push("Group name is required.");
  if (!group.version) errors.push("Group version is required.");
  if (!group.entryStrategy) errors.push("Group entryStrategy is required.");

  const strategyIds = Object.keys(group.strategies ?? {});
  if (strategyIds.length === 0) errors.push("Group must define at least one strategy.");
  if (group.entryStrategy && !group.strategies?.[group.entryStrategy]) {
    errors.push(`Entry strategy '${group.entryStrategy}' does not exist.`);
  }

  for (const [strategyId, strategy] of Object.entries(group.strategies ?? {})) {
    if (!strategy.role) errors.push(`Strategy '${strategyId}' role is required.`);
    if (!strategy.intent) errors.push(`Strategy '${strategyId}' intent is required.`);
    if (!strategy.model?.provider) errors.push(`Strategy '${strategyId}' model.provider is required.`);
    if (!strategy.model?.model) errors.push(`Strategy '${strategyId}' model.model is required.`);
    if (!strategy.model?.reason) errors.push(`Strategy '${strategyId}' model.reason is required.`);

    for (const rule of strategy.canCall ?? []) {
      if (!group.strategies?.[rule.strategy]) errors.push(`Strategy '${strategyId}' canCall target '${rule.strategy}' does not exist.`);
      if (!rule.when) errors.push(`Strategy '${strategyId}' canCall '${rule.strategy}' must define when.`);
      if (!Number.isInteger(rule.maxCalls) || rule.maxCalls < 1) {
        errors.push(`Strategy '${strategyId}' canCall '${rule.strategy}' maxCalls must be at least 1.`);
      }
    }
  }

  if (!group.limits) {
    errors.push("Group limits are required.");
    return errors;
  }

  if (group.limits.maxDepth < 1) errors.push("limits.maxDepth must be at least 1.");
  if (group.limits.maxDepth > 4) errors.push("limits.maxDepth must not exceed 4 in Phase 1.");
  if (group.limits.maxStrategyCalls < 1) errors.push("limits.maxStrategyCalls must be at least 1.");
  if (group.limits.maxStrategyCalls > 20) errors.push("limits.maxStrategyCalls must not exceed 20 in Phase 1.");
  if (group.limits.maxDiscussionRounds < 0) errors.push("limits.maxDiscussionRounds must be at least 0.");
  if (group.limits.maxDiscussionRounds > 5) errors.push("limits.maxDiscussionRounds must not exceed 5 in Phase 1.");
  if (group.limits.maxSteps < 1) errors.push("limits.maxSteps must be at least 1.");
  if (group.limits.maxRuntimeSeconds < 1) errors.push("limits.maxRuntimeSeconds must be at least 1.");
  if (group.limits.maxEstimatedUsd < 0) errors.push("limits.maxEstimatedUsd must be at least 0.");

  return errors;
}
