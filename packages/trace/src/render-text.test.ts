import { describe, expect, it } from "vitest";
import { renderTraceText } from "./render-text.ts";
import type { AgentEvent } from "../../events/src/events.ts";

describe("renderTraceText", () => {
  it("renders permission policy and decision details", () => {
    const text = renderTraceText([
      event({
        type: "permission.policy.loaded",
        source: "opencode-tool-policy",
        defaultDecision: "deny",
        policy: {
          edit: "deny",
          bash: "deny"
        }
      }),
      event({
        type: "permission.checked",
        nodeId: "coder",
        scope: "filesystem.patch",
        decision: "ask",
        reason: "Scope filesystem.patch matched configured static policy.",
        source: "static-policy"
      })
    ]);

    expect(text).toContain("[permission.policy.loaded] opencode-tool-policy default=deny scopes=2");
    expect(text).toContain("[permission.checked] coder filesystem.patch -> ask");
    expect(text).toContain("matched configured static policy");
  });
});

function event<T extends Omit<AgentEvent, "id" | "sessionId" | "timestamp">>(input: T): AgentEvent {
  return {
    id: `event-${input.type}`,
    sessionId: "session-test",
    timestamp: "2026-06-29T00:00:00.000Z",
    ...input
  } as unknown as AgentEvent;
}
