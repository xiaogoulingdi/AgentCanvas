import { describe, expect, it } from "vitest";
import { OpenCodeBackendAdapter } from "./opencode-backend.ts";
import type { BackendEvent } from "./types.ts";
import type { ExecutionPlan } from "../../workflow/src/types.ts";

const plan: ExecutionPlan = {
  id: "plan-opencode",
  workflowId: "workflow-opencode",
  workflowName: "OpenCode Test",
  entryNodeId: "coder",
  nodes: [
    {
      id: "coder",
      type: "agent",
      role: "coder",
      route: "code",
      tools: [],
      permissions: ["filesystem.read", "filesystem.patch"]
    }
  ],
  edges: [],
  limits: {
    maxSteps: 5,
    maxDiscussionRounds: 1,
    maxEstimatedUsd: 1,
    maxRuntimeSeconds: 60
  },
  requiredTools: [],
  requiredModels: [],
  permissionScopes: ["filesystem.read", "filesystem.patch"],
  discussions: []
};

describe("OpenCodeBackendAdapter", () => {
  it("emits report and patch artifacts when OpenCode returns a diff", async () => {
    const backend = new OpenCodeBackendAdapter({
      directory: "memory",
      providerId: "deepseek",
      modelId: "deepseek-v4-flash",
      connectionFactory: async () => ({
        client: {} as never,
        close() {
          // no-op
        }
      }),
      promptRunner: async () => ({
        sessionId: "ses-test",
        message: {
          data: {
            info: {
              cost: 0.1,
              tokens: {
                input: 10,
                output: 3,
                total: 13
              }
            },
            status: "completed",
            parts: [{ type: "text", text: "Implemented change." }]
          }
        },
        messages: { data: [{ id: "msg-1" }, { id: "msg-2" }] },
        diff: {
          data: [{ file: "README.md", before: "old", after: "new", additions: 1, deletions: 1 }]
        }
      })
    });

    const events: BackendEvent[] = [];
    for await (const event of backend.run({ sessionId: "session-test", prompt: "edit", plan })) {
      events.push(event);
    }

    expect(events).toContainEqual(
      expect.objectContaining({
        type: "permission.policy.loaded",
        source: "opencode-tool-policy",
        defaultDecision: "deny",
        policy: expect.objectContaining({
          edit: "deny",
          bash: "deny"
        })
      })
    );

    expect(events).toContainEqual(
      expect.objectContaining({
        type: "backend.session.observed",
        backend: "opencode",
        externalSessionId: "ses-test",
        status: "completed",
        messageCount: 2,
        diffCount: 1
      })
    );

    const artifacts = events.filter((event) => event.type === "artifact.created").map((event) => event.artifact);
    expect(artifacts).toHaveLength(2);
    expect(artifacts[0]).toMatchObject({
      kind: "report",
      title: "OpenCode coder result",
      content: "Implemented change."
    });
    expect(artifacts[1]).toMatchObject({
      kind: "patch",
      title: "OpenCode coder diff"
    });
    expect(artifacts[1]?.content).toContain("### README.md");
    expect(artifacts[1]?.content).toContain("-old");
    expect(artifacts[1]?.content).toContain("+new");
    expect(artifacts[1]?.metadata).toMatchObject({
      source: "opencode",
      opencodeSessionId: "ses-test",
      diffs: [{ file: "README.md", before: "old", after: "new" }]
    });
  });
});
