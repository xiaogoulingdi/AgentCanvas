import { describe, expect, it } from "vitest";
import { compileGroupToWorkflow } from "./compiler.ts";
import type { MultiAgentGroupDefinition } from "./types.ts";

const group: MultiAgentGroupDefinition = {
  id: "group",
  name: "Group",
  version: "0.1.0",
  entryStrategy: "supervisor",
  limits: {
    maxDepth: 2,
    maxStrategyCalls: 4,
    maxSteps: 8,
    maxDiscussionRounds: 1,
    maxEstimatedUsd: 1,
    maxRuntimeSeconds: 300
  },
  strategies: {
    supervisor: {
      role: "supervisor",
      intent: "Call sub strategies.",
      model: {
        provider: "deepseek",
        model: "deepseek-v4-flash",
        reason: "User selected planning model."
      },
      permissions: ["filesystem.read"],
      canCall: [{ strategy: "coder", when: "Need code.", maxCalls: 1 }]
    },
    coder: {
      role: "coder",
      intent: "Edit files.",
      model: {
        provider: "deepseek",
        model: "deepseek-v4-flash",
        reason: "User selected coding model."
      },
      tools: ["read_file"],
      permissions: ["filesystem.read", "filesystem.patch"]
    }
  }
};

describe("compileGroupToWorkflow", () => {
  it("converts a multi-agent group into a workflow definition", () => {
    expect(compileGroupToWorkflow(group)).toMatchObject({
      id: "group",
      entry: "supervisor",
      nodes: {
        supervisor: {
          type: "agent",
          role: "supervisor",
          route: "supervisor",
          model: "deepseek/deepseek-v4-flash",
          permissions: ["filesystem.read"]
        },
        coder: {
          type: "agent",
          role: "coder",
          route: "coder",
          tools: ["read_file"]
        }
      },
      edges: [{ from: "supervisor", to: "coder", when: "Need code. maxCalls=1" }],
      limits: {
        maxSteps: 8,
        maxDiscussionRounds: 1,
        maxEstimatedUsd: 1,
        maxRuntimeSeconds: 300
      }
    });
  });
});
