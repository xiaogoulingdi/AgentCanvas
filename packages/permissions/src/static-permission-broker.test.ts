import { describe, expect, it } from "vitest";
import { createReadOnlyPermissionBroker, createWorkspaceWritePermissionBroker } from "./static-permission-broker.ts";
import type { PlanNode } from "../../workflow/src/types.ts";

const node: PlanNode = {
  id: "coder",
  type: "agent",
  role: "coder"
};

describe("StaticPermissionBroker", () => {
  it("explains configured and default decisions", async () => {
    const broker = createReadOnlyPermissionBroker();

    await expect(broker.explain({ sessionId: "session", node, scope: "filesystem.patch" })).resolves.toMatchObject({
      decision: "ask",
      reason: "Scope filesystem.patch matched configured static policy.",
      source: "static-policy"
    });

    expect(broker.describe()).toMatchObject({
      source: "static-policy",
      defaultDecision: "deny",
      policy: {
        "filesystem.read": "allow",
        "filesystem.patch": "ask"
      }
    });
  });

  it("allows patch writes in workspace-write mode", async () => {
    const broker = createWorkspaceWritePermissionBroker();
    await expect(broker.explain({ sessionId: "session", node, scope: "filesystem.patch" })).resolves.toMatchObject({
      decision: "allow"
    });
  });
});
