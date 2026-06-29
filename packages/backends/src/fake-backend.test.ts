import { describe, expect, it } from "vitest";
import { compileWorkflow } from "../../workflow/src/compiler.ts";
import { FakeBackendAdapter } from "./fake-backend.ts";

describe("FakeBackendAdapter", () => {
  it("emits model, permission, tool, artifact, and completion events", async () => {
    const plan = compileWorkflow({
      id: "test",
      name: "Test",
      version: "0.1.0",
      entry: "coder",
      nodes: {
        coder: {
          type: "agent",
          role: "coder",
          route: "code",
          tools: ["propose_patch"],
          permissions: ["filesystem.patch"]
        }
      },
      edges: []
    });

    const backend = new FakeBackendAdapter();
    const events = [];
    for await (const event of backend.run({ sessionId: "session", prompt: "fix", plan })) {
      events.push(event);
    }

    expect(events.map((event) => event.type)).toContain("artifact.created");
    expect(events.at(-1)?.type).toBe("agent.completed");
  });
});
