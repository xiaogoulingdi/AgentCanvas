import { readFile } from "node:fs/promises";
import { createId } from "../../../packages/shared/src/ids.ts";
import { compileWorkflow } from "../../../packages/workflow/src/compiler.ts";
import type { WorkflowDefinition } from "../../../packages/workflow/src/types.ts";
import type { EngineRouteConfig } from "../../../packages/models/src/model-router.ts";
import { ModelRouter } from "../../../packages/models/src/model-router.ts";
import { formatPreflightIssues, preflightEngineRoutes } from "../../../packages/models/src/preflight.ts";
import { ModelBackedBackendAdapter } from "../../../packages/backends/src/model-backed-backend.ts";
import { MemoryEventLog } from "../../../packages/events/src/memory-event-log.ts";
import { runWorkflow } from "../../../packages/runtime/src/run-workflow.ts";
import { renderTraceText } from "../../../packages/trace/src/render-text.ts";
import { renderTraceJson } from "../../../packages/trace/src/render-json.ts";
import type { ExecutionEngine } from "../../../packages/engines/src/types.ts";

const workflowPath = readArg("--workflow") ?? "examples/workflows/research-code.json";
const enginePath = readArg("--engine") ?? "examples/engines/deepseek-kimi-balanced.json";
const prompt = readArg("--prompt");
const json = process.argv.includes("--json");

if (!prompt) {
  console.error("Usage: npm.cmd run run:model -- --engine <engine.json> --workflow <workflow.json> --prompt <prompt> [--json]");
  process.exit(1);
}

const workflow = JSON.parse(await readFile(workflowPath, "utf8")) as WorkflowDefinition;
const engineConfig = JSON.parse(await readFile(enginePath, "utf8")) as EngineRouteConfig;
const preflight = preflightEngineRoutes(engineConfig);
if (!preflight.ok) {
  console.error("Model route preflight failed:");
  console.error(formatPreflightIssues(preflight));
  process.exit(1);
}

const plan = compileWorkflow(workflow);
const router = new ModelRouter(engineConfig);
const backend = new ModelBackedBackendAdapter(router);
const eventLog = new MemoryEventLog();
const sessionId = createId("session");
const engine: ExecutionEngine = {
  id: engineConfig.id,
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

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
