import { readFile } from "node:fs/promises";
import { createId } from "../../../packages/shared/src/ids.ts";
import { compileWorkflow } from "../../../packages/workflow/src/compiler.ts";
import type { WorkflowDefinition } from "../../../packages/workflow/src/types.ts";
import { MemoryEventLog } from "../../../packages/events/src/memory-event-log.ts";
import { FakeBackendAdapter } from "../../../packages/backends/src/fake-backend.ts";
import { runWorkflow } from "../../../packages/runtime/src/run-workflow.ts";
import { renderTraceText } from "../../../packages/trace/src/render-text.ts";
import { renderTraceJson } from "../../../packages/trace/src/render-json.ts";
import type { ExecutionEngine } from "../../../packages/engines/src/types.ts";

const workflowPath = process.argv[2];
const promptIndex = process.argv.indexOf("--prompt");
const json = process.argv.includes("--json");
const prompt = promptIndex >= 0 ? process.argv[promptIndex + 1] : undefined;

if (!workflowPath || !prompt) {
  console.error("Usage: node --experimental-strip-types apps/cli/src/run.ts <workflow.json> --prompt <prompt> [--json]");
  process.exit(1);
}

const workflow = JSON.parse(await readFile(workflowPath, "utf8")) as WorkflowDefinition;
const plan = compileWorkflow(workflow);
const sessionId = createId("session");
const eventLog = new MemoryEventLog();
const backend = new FakeBackendAdapter();
const engine: ExecutionEngine = {
  id: workflow.id,
  type: "workflow",
  workflowPath
};

await runWorkflow({
  sessionId,
  prompt,
  engine,
  plan,
  backend,
  eventLog
});

const events = await eventLog.list(sessionId);
console.log(json ? renderTraceJson(events) : renderTraceText(events));
