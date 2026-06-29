import type { PermissionScope } from "../../workflow/src/types.ts";
import type { PermissionBroker, PermissionDecision, PermissionRequest } from "./types.ts";

export type StaticPermissionPolicy = Partial<Record<PermissionScope, PermissionDecision>>;

export class StaticPermissionBroker implements PermissionBroker {
  private readonly policy: StaticPermissionPolicy;
  private readonly defaultDecision: PermissionDecision;

  constructor(input: { policy?: StaticPermissionPolicy; defaultDecision?: PermissionDecision } = {}) {
    this.policy = input.policy ?? {};
    this.defaultDecision = input.defaultDecision ?? "deny";
  }

  async check(request: PermissionRequest): Promise<PermissionDecision> {
    return this.policy[request.scope] ?? this.defaultDecision;
  }
}

export function createReadOnlyPermissionBroker(): StaticPermissionBroker {
  return new StaticPermissionBroker({
    defaultDecision: "deny",
    policy: {
      "filesystem.read": "allow",
      "filesystem.patch": "ask",
      "model.cost": "allow",
      network: "ask",
      shell: "deny",
      browser: "ask"
    }
  });
}

export function createWorkspaceWritePermissionBroker(): StaticPermissionBroker {
  return new StaticPermissionBroker({
    defaultDecision: "deny",
    policy: {
      "filesystem.read": "allow",
      "filesystem.patch": "allow",
      "model.cost": "allow",
      network: "ask",
      shell: "deny",
      browser: "ask"
    }
  });
}
