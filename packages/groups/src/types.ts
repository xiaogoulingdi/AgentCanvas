import type { PermissionScope, WorkflowLimits } from "../../workflow/src/types.ts";

export type MultiAgentGroupDefinition = {
  id: string;
  name: string;
  version: string;
  description?: string;
  entryStrategy: string;
  strategies: Record<string, AgentStrategyDefinition>;
  limits: MultiAgentGroupLimits;
};

export type AgentStrategyDefinition = {
  role: string;
  intent: string;
  model: ModelBinding;
  tools?: string[];
  permissions?: PermissionScope[];
  canCall?: StrategyCallRule[];
  budget?: StrategyBudget;
};

export type ModelBinding = {
  provider: string;
  model: string;
  reason: string;
  fallback?: Array<{
    provider: string;
    model: string;
    reason: string;
  }>;
};

export type StrategyCallRule = {
  strategy: string;
  when: string;
  maxCalls: number;
};

export type StrategyBudget = {
  maxEstimatedUsd?: number;
  maxRuntimeSeconds?: number;
};

export type MultiAgentGroupLimits = Required<
  Pick<WorkflowLimits, "maxSteps" | "maxDiscussionRounds" | "maxEstimatedUsd" | "maxRuntimeSeconds">
> & {
  maxStrategyCalls: number;
  maxDepth: number;
};
