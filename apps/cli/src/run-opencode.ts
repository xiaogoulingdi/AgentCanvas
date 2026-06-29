import { readFile } from "node:fs/promises";
import { createId } from "../../../packages/shared/src/ids.ts";
import { compileWorkflow } from "../../../packages/workflow/src/compiler.ts";
import type { WorkflowDefinition } from "../../../packages/workflow/src/types.ts";
import { OpenCodeBackendAdapter } from "../../../packages/backends/src/opencode-backend.ts";
import { MemoryEventLog } from "../../../packages/events/src/memory-event-log.ts";
import { runWorkflow } from "../../../packages/runtime/src/run-workflow.ts";
import { renderTraceText } from "../../../packages/trace/src/render-text.ts";
import { renderTraceJson } from "../../../packages/trace/src/render-json.ts";
import type { ExecutionEngine } from "../../../packages/engines/src/types.ts";

const workflowPath = readArg("--workflow") ?? "examples/workflows/research-code.json";
const prompt = readArg("--prompt");
const providerId = readArg("--provider-id") ?? "deepseek";
const modelId = readArg("--model-id") ?? "deepseek-v4-flash";
const maxNodes = Number(readArg("--max-nodes") ?? "1");
const timeoutMs = Number(readArg("--timeout-ms") ?? "60000");
const json = process.argv.includes("--json");
const allowEdits = process.argv.includes("--allow-opencode-edits");

if (!prompt) {
  console.error(
    "Usage: npm.cmd run run:opencode -- --workflow <workflow.json> --prompt <prompt> [--provider-id <id>] [--model-id <id>] [--max-nodes <n>] [--timeout-ms <ms>] [--allow-opencode-edits] [--json]"
  );
  process.exit(1);
}

const workflow = JSON.parse(await readFile(workflowPath, "utf8")) as WorkflowDefinition;
const plan = compileWorkflow(workflow);
const eventLog = new MemoryEventLog();
const sessionId = createId("session");
const engine: ExecutionEngine = {
  id: "opencode",
  type: "workflow",
  workflowPath
};

try {
  await runWorkflow({
    sessionId,
    prompt,
    engine,
    plan,
    backend: new OpenCodeBackendAdapter({
      directory: process.cwd(),
      providerId,
      modelId,
      allowEdits,
      maxNodes,
      promptTimeoutMs: timeoutMs
    }),
    eventLog
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

const events = await eventLog.list(sessionId);
console.log(json ? renderTraceJson(events) : renderTraceText(events));

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
