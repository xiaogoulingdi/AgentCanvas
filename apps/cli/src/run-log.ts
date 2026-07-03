import { JsonlEventLog } from "../../../packages/events/src/jsonl-event-log.ts";
import type { EventLog } from "../../../packages/events/src/memory-event-log.ts";

export function createCliEventLog(): EventLog {
  return new JsonlEventLog();
}

export function printSessionFooter(sessionId: string): void {
  console.log("");
  console.log(`Session: ${sessionId}`);
  console.log("Inspect: npm.cmd run run:inspect -- --session-id " + sessionId);
}
