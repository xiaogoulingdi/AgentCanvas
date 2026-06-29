import type { PermissionScope } from "../../workflow/src/types.ts";
import type { PermissionBroker, PermissionDecision, PermissionDecisionRecord, PermissionRequest } from "./types.ts";

export type StaticPermissionPolicy = Partial<Record<PermissionScope, PermissionDecision>>;

export class StaticPermissionBroker implements PermissionBroker {
  private readonly policy: StaticPermissionPolicy;
  private readonly defaultDecision: PermissionDecision;
  private readonly source: string;

  constructor(input: { policy?: StaticPermissionPolicy; defaultDecision?: PermissionDecision } = {}) {
    this.policy = input.policy ?? {};
    this.defaultDecision = input.defaultDecision ?? "deny";
    this.source = "static-policy";
  }

  async check(request: PermissionRequest): Promise<PermissionDecision> {
    return this.policy[request.scope] ?? this.defaultDecision;
  }

  async explain(request: PermissionRequest): Promise<PermissionDecisionRecord> {
    const configured = this.policy[request.scope];
    const decision = configured ?? this.defaultDecision;
    return {
      scope: request.scope,
      decision,
      source: this.source,
      reason: configured
        ? `Scope ${request.scope} matched configured static policy.`
        : `Scope ${request.scope} used default static decision ${this.defaultDecision}.`
    };
  }

  describe(): { source: string; defaultDecision: PermissionDecision; policy: StaticPermissionPolicy } {
    return {
      source: this.source,
      defaultDecision: this.defaultDecision,
      policy: this.policy
    };
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
