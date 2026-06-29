import { describe, expect, it } from "vitest";
import { MemoryEventLog } from "./memory-event-log.ts";

describe("MemoryEventLog", () => {
  it("lists events by session id", async () => {
    const log = new MemoryEventLog();

    await log.append({
      id: "event_1",
      sessionId: "session_a",
      timestamp: "2026-06-29T00:00:00.000Z",
      type: "user.prompt.submitted",
      prompt: "hello"
    });
    await log.append({
      id: "event_2",
      sessionId: "session_b",
      timestamp: "2026-06-29T00:00:00.000Z",
      type: "user.prompt.submitted",
      prompt: "world"
    });

    await expect(log.list("session_a")).resolves.toHaveLength(1);
  });
});
