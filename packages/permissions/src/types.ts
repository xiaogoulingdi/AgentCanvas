import type { PermissionScope, PlanNode } from "../../workflow/src/types.ts";

export type PermissionDecision = "allow" | "ask" | "deny";

export type PermissionRequest = {
  sessionId: string;
  node: PlanNode;
  scope: PermissionScope;
  reason?: string;
};

export interface PermissionBroker {
  check(request: PermissionRequest): Promise<PermissionDecision>;
}
