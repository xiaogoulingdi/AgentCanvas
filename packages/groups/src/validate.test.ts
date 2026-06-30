import { describe, expect, it } from "vitest";
import { validateMultiAgentGroup } from "./validate.ts";
import type { MultiAgentGroupDefinition } from "./types.ts";

const validGroup: MultiAgentGroupDefinition = {
  id: "balanced-coding-group",
  name: "Balanced Coding Group",
  version: "0.1.0",
  entryStrategy: "supervisor",
  limits: {
    maxDepth: 2,
    maxStrategyCalls: 6,
    maxSteps: 12,
    maxDiscussionRounds: 2,
    maxEstimatedUsd: 1,
    maxRuntimeSeconds: 600
  },
  strategies: {
    supervisor: {
      role: "supervisor",
      intent: "Plan the coding task and call sub-strategies explicitly.",
      model: {
        provider: "deepseek",
        model: "deepseek-v4-flash",
        reason: "Balanced planning model selected by the user for normal coding tasks."
      },
      canCall: [{ strategy: "coder", when: "Implementation is required.", maxCalls: 2 }]
    },
    coder: {
      role: "coder",
      intent: "Use OpenCode for bounded file edits.",
      model: {
        provider: "opencode",
        model: "deepseek-v4-flash",
        reason: "OpenCode is the user-selected coding backend."
      },
      permissions: ["filesystem.read", "filesystem.patch"]
    }
  }
};

describe("validateMultiAgentGroup", () => {
  it("accepts a bounded user-configured strategy group", () => {
    expect(validateMultiAgentGroup(validGroup)).toEqual([]);
  });

  it("rejects unknown sub-strategy calls and unsafe limits", () => {
    const supervisor = validGroup.strategies.supervisor;
    if (!supervisor) throw new Error("Test fixture is missing supervisor.");

    const invalidGroup: MultiAgentGroupDefinition = {
      ...validGroup,
      limits: {
        ...validGroup.limits,
        maxDepth: 99
      },
      strategies: {
        ...validGroup.strategies,
        supervisor: {
          role: supervisor.role,
          intent: supervisor.intent,
          model: supervisor.model,
          canCall: [{ strategy: "missing", when: "", maxCalls: 0 }]
        }
      }
    };

    expect(validateMultiAgentGroup(invalidGroup)).toEqual([
      "Strategy 'supervisor' canCall target 'missing' does not exist.",
      "Strategy 'supervisor' canCall 'missing' must define when.",
      "Strategy 'supervisor' canCall 'missing' maxCalls must be at least 1.",
      "limits.maxDepth must not exceed 4 in Phase 1."
    ]);
  });
});
