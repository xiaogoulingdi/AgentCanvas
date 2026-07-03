import type { Artifact } from "../../events/src/events.ts";
import type { PlanNode } from "../../workflow/src/types.ts";

export type ToolExecutionRequest = {
  sessionId: string;
  node: PlanNode;
  toolName: string;
  prompt: string;
  modelOutput: string;
};

export type ToolExecutionResult = {
  summary: string;
  artifacts?: Artifact[];
};

export interface ToolBroker {
  execute(request: ToolExecutionRequest): Promise<ToolExecutionResult>;
}
