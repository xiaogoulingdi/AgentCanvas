import { readFile } from "node:fs/promises";
import { createId } from "../../../packages/shared/src/ids.ts";
import { compileWorkflow } from "../../../packages/workflow/src/compiler.ts";
import type { WorkflowDefinition } from "../../../packages/workflow/src/types.ts";
import type { EngineRouteConfig } from "../../../packages/models/src/model-router.ts";
import { ModelRouter } from "../../../packages/models/src/model-router.ts";
import { formatPreflightIssues, preflightEngineRoutes } from "../../../packages/models/src/preflight.ts";
import { ModelBackedBackendAdapter } from "../../../packages/backends/src/model-backed-backend.ts";
import { createReadOnlyPermissionBroker, createWorkspaceWritePermissionBroker } from "../../../packages/permissions/src/static-permission-broker.ts";
import { WorkspaceToolBroker } from "../../../packages/tools/src/workspace-tool-broker.ts";
import { runWorkflow } from "../../../packages/runtime/src/run-workflow.ts";
import { renderTraceText } from "../../../packages/trace/src/render-text.ts";
import { renderTraceJson } from "../../../packages/trace/src/render-json.ts";
import type { ExecutionEngine } from "../../../packages/engines/src/types.ts";
import { createCliEventLog, printSessionFooter } from "./run-log.ts";
import { engineRoutesFromConfig, loadCliConfig, permissionBrokerFromConfig, providerProfilesFromConfig, readArg } from "./config.ts";

const workflowPath = readArg("--workflow") ?? "examples/workflows/research-code.json";
const enginePath = readArg("--engine") ?? "examples/engines/deepseek-kimi-balanced.json";
const prompt = readArg("--prompt");
const json = process.argv.includes("--json");
const workspaceTools = process.argv.includes("--workspace-tools");
const allowFileEdits = process.argv.includes("--allow-file-edits");

if (!prompt) {
  console.error(
    "Usage: npm.cmd run run:model -- --engine <engine.json> --workflow <workflow.json> --prompt <prompt> [--config <agentcanvas.config.json>] [--json] [--workspace-tools] [--allow-file-edits]"
  );
  process.exit(1);
}

const workflow = JSON.parse(await readFile(workflowPath, "utf8")) as WorkflowDefinition;
const cliConfig = await loadCliConfig();
const engineConfig = cliConfig ? engineRoutesFromConfig(cliConfig) : (JSON.parse(await readFile(enginePath, "utf8")) as EngineRouteConfig);
const providerRegistry = providerProfilesFromConfig(cliConfig);
const configPermissionBroker = permissionBrokerFromConfig(cliConfig);
const preflight = preflightEngineRoutes(engineConfig, providerRegistry);
if (!preflight.ok) {
  console.error("Model route preflight failed:");
  console.error(formatPreflightIssues(preflight));
  process.exit(1);
}

const plan = compileWorkflow(workflow);
const router = new ModelRouter(engineConfig, providerRegistry);
const backend = new ModelBackedBackendAdapter(router, {
  ...(workspaceTools
    ? {
        toolBroker: new WorkspaceToolBroker({ workspaceRoot: process.cwd(), allowWrites: allowFileEdits }),
        permissionBroker: allowFileEdits ? createWorkspaceWritePermissionBroker() : configPermissionBroker ?? createReadOnlyPermissionBroker()
      }
    : {})
});
const eventLog = createCliEventLog();
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
if (!json) printSessionFooter(sessionId);
