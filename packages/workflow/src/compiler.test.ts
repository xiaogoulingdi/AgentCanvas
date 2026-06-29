import { describe, expect, it } from "vitest";
import { compileWorkflow } from "./compiler.ts";
import type { WorkflowDefinition } from "./types.ts";

describe("compileWorkflow", () => {
  it("compiles a bounded workflow into an execution plan", () => {
    const workflow: WorkflowDefinition = {
      id: "test",
      name: "Test",
      version: "0.1.0",
      entry: "planner",
      nodes: {
        planner: {
          type: "agent",
          role: "planner",
          route: "planning",
          tools: ["project_search"],
          permissions: ["filesystem.read"]
        },
        reviewer: {
          type: "agent",
          role: "reviewer",
          route: "review",
          tools: ["diff"],
          permissions: ["filesystem.read"]
        }
      },
      edges: [{ from: "planner", to: "reviewer" }],
      discussions: [{ participants: ["planner", "reviewer"], maxRounds: 2 }]
    };

    const plan = compileWorkflow(workflow);

    expect(plan.workflowId).toBe("test");
    expect(plan.requiredTools).toEqual(["project_search", "diff"]);
    expect(plan.permissionScopes).toEqual(["filesystem.read"]);
    expect(plan.discussions[0]?.maxRounds).toBe(2);
  });

  it("rejects unbounded discussion rounds in phase 1", () => {
    const workflow: WorkflowDefinition = {
      id: "bad",
      name: "Bad",
      version: "0.1.0",
      entry: "a",
      nodes: {
        a: { type: "agent", role: "a" },
        b: { type: "agent", role: "b" }
      },
      edges: [{ from: "a", to: "b" }],
      discussions: [{ participants: ["a", "b"], maxRounds: 99 }]
    };

    expect(() => compileWorkflow(workflow)).toThrow("maxRounds must not exceed 5");
  });
});
