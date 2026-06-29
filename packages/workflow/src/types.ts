export type WorkflowDefinition = {
  id: string;
  name: string;
  version: string;
  entry: string;
  nodes: Record<string, WorkflowNode>;
  edges: WorkflowEdge[];
  limits?: WorkflowLimits;
  discussions?: WorkflowDiscussion[];
};

export type WorkflowNode = {
  type: "agent" | "tool";
  role: string;
  model?: string;
  route?: string;
  tools?: string[];
  permissions?: PermissionScope[];
};

export type WorkflowEdge = {
  from: string;
  to: string;
  when?: string;
};

export type WorkflowLimits = {
  maxSteps?: number;
  maxDiscussionRounds?: number;
  maxEstimatedUsd?: number;
  maxRuntimeSeconds?: number;
};

export type WorkflowDiscussion = {
  participants: string[];
  maxRounds: number;
  stopWhen?: string;
};

export type PermissionScope =
  | "filesystem.read"
  | "filesystem.patch"
  | "shell"
  | "network"
  | "browser"
  | "model.cost";

export type ExecutionPlan = {
  id: string;
  workflowId: string;
  workflowName: string;
  entryNodeId: string;
  nodes: PlanNode[];
  edges: WorkflowEdge[];
  limits: Required<WorkflowLimits>;
  requiredTools: string[];
  requiredModels: string[];
  permissionScopes: PermissionScope[];
  discussions: WorkflowDiscussion[];
};

export type PlanNode = WorkflowNode & {
  id: string;
};
