import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { JsonlEventLog } from "./jsonl-event-log.ts";
import type { AgentEvent } from "./events.ts";

describe("JsonlEventLog", () => {
  it("persists events and projects run records", async () => {
    const dir = await mkdtemp(join(tmpdir(), "agent-canvas-runs-"));
    try {
      const log = new JsonlEventLog(dir);
      const events: AgentEvent[] = [
        base({ type: "user.prompt.submitted", prompt: "hello" }),
        base({ type: "engine.selected", engineId: "fake", engineType: "workflow" }),
        base({ type: "workflow.loaded", workflowId: "wf", workflowName: "Workflow" }),
        base({ type: "workflow.completed", workflowId: "wf", planId: "plan" })
      ];

      for (const event of events) await log.append(event);

      expect(await log.list("session-test")).toEqual(events);
      expect(await log.listRuns()).toMatchObject([
        {
          sessionId: "session-test",
          status: "completed",
          engineId: "fake",
          workflowId: "wf",
          workflowName: "Workflow",
          prompt: "hello",
          eventCount: 4
        }
      ]);
      expect((await log.latestRun())?.sessionId).toBe("session-test");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

function base<T extends Omit<AgentEvent, "id" | "sessionId" | "timestamp">>(event: T): AgentEvent {
  return {
    id: `event-${event.type}`,
    sessionId: "session-test",
    timestamp: new Date("2026-06-29T00:00:00.000Z").toISOString(),
    ...event
  } as unknown as AgentEvent;
}
