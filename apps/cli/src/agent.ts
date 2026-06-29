import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createId } from "../../../packages/shared/src/ids.ts";
import { compileWorkflow } from "../../../packages/workflow/src/compiler.ts";
import type { WorkflowDefinition } from "../../../packages/workflow/src/types.ts";
import type { EngineRouteConfig } from "../../../packages/models/src/model-router.ts";
import { ModelRouter } from "../../../packages/models/src/model-router.ts";
import { formatPreflightIssues, preflightEngineRoutes } from "../../../packages/models/src/preflight.ts";
import { ModelBackedBackendAdapter } from "../../../packages/backends/src/model-backed-backend.ts";
import { FakeBackendAdapter } from "../../../packages/backends/src/fake-backend.ts";
import { OpenCodeBackendAdapter } from "../../../packages/backends/src/opencode-backend.ts";
import { projectArtifacts } from "../../../packages/events/src/projections.ts";
import { runWorkflow } from "../../../packages/runtime/src/run-workflow.ts";
import { renderTraceText } from "../../../packages/trace/src/render-text.ts";
import { createReadOnlyPermissionBroker, createWorkspaceWritePermissionBroker } from "../../../packages/permissions/src/static-permission-broker.ts";
import { WorkspaceToolBroker } from "../../../packages/tools/src/workspace-tool-broker.ts";
import type { ExecutionEngine } from "../../../packages/engines/src/types.ts";
import type { AgentBackend } from "../../../packages/backends/src/types.ts";
import { createCliEventLog } from "./run-log.ts";

type EngineOption =
  | {
      label: string;
      mode: "fake";
      id: string;
      requiredEnv: string[];
    }
  | {
      label: string;
      mode: "model";
      path: string;
      requiredEnv: string[];
    }
  | {
      label: string;
      mode: "opencode";
      id: string;
      providerId: string;
      modelId: string;
      requiredEnv: string[];
    };

const engines: EngineOption[] = [
  {
    label: "Fake Balanced (no API key, safest smoke test)",
    mode: "fake",
    id: "fake-balanced",
    requiredEnv: []
  },
  {
    label: "DeepSeek + Kimi Balanced",
    mode: "model",
    path: "examples/engines/deepseek-kimi-balanced.json",
    requiredEnv: ["DEEPSEEK_API_KEY", "KIMI_API_KEY"]
  },
  {
    label: "Sub2API Balanced",
    mode: "model",
    path: "examples/engines/sub2api-balanced.json",
    requiredEnv: ["AGENT_CANVAS_API_KEY", "AGENT_CANVAS_API_BASE_URL", "AGENT_CANVAS_MODEL", "AGENT_CANVAS_WIRE_API"]
  },
  {
    label: "OpenCode + DeepSeek",
    mode: "opencode",
    id: "opencode-deepseek",
    providerId: "deepseek",
    modelId: "deepseek-v4-flash",
    requiredEnv: ["DEEPSEEK_API_KEY"]
  }
];
const workflows = [
  { label: "Research + Code", path: "examples/workflows/research-code.json" },
  { label: "OpenCode Single Node", path: "examples/workflows/opencode-single.json" }
];
const workspaceTools = process.argv.includes("--workspace-tools");
const allowFileEdits = process.argv.includes("--allow-file-edits");
const allowOpenCodeEdits = process.argv.includes("--allow-opencode-edits");
const allowOpenCodeShell = process.argv.includes("--allow-opencode-shell");
const allowOpenCodeNetwork = process.argv.includes("--allow-opencode-network");
const opencodeTimeoutMs = Number(readArg("--opencode-timeout-ms") ?? "90000");
const opencodeMaxNodes = Number(readArg("--opencode-max-nodes") ?? "1");

const promptSession = createPromptSession();
console.log("Agent Canvas CLI");
console.log("================");
console.log("OpenCode-like terminal test mode.");
console.log(
  workspaceTools
    ? "Safety: shell execution is disabled. Workspace tools are bounded to this repository."
    : "Safety: Phase 1 does not edit files or run shell commands. Tools are mocked."
);
console.log("");
if (workspaceTools) {
  console.log(`Workspace tools: enabled (${allowFileEdits ? "writes allowed for artifacts" : "dry run"}).`);
  console.log("Shell execution is still disabled.\n");
}

const engineChoice = await choose("Engine", engines.map((engine) => engine.label));
const workflowChoice = await choose("Workflow", workflows.map((workflow) => workflow.label));
const selectedEngine = engines[engineChoice];
const selectedWorkflow = workflows[workflowChoice];
if (!selectedEngine || !selectedWorkflow) throw new Error("Missing engine or workflow.");

showEnvNotice(selectedEngine);

const workflow = JSON.parse(await readFile(selectedWorkflow.path, "utf8")) as WorkflowDefinition;
const plan = compileWorkflow(workflow);

console.log("\nType a prompt and press Enter. Submit an empty prompt to exit.\n");

while (true) {
  const prompt = await promptSession.question("Prompt> ");
  if (!prompt.trim()) break;

  const { backend, engine } = await createRunContext(selectedEngine, selectedWorkflow.path);
  const eventLog = createCliEventLog();
  const sessionId = createId("session");

  try {
    await runWorkflow({
      sessionId,
      prompt,
      engine,
      plan,
      backend,
      eventLog
    });
  } catch (error) {
    console.error(`\nRun failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  const events = await eventLog.list(sessionId);
  console.log("\nTrace");
  console.log("-----");
  console.log(renderTraceText(events));
  console.log(`\nSession: ${sessionId}`);
  console.log("Inspect: npm.cmd run run:inspect -- --session-id " + sessionId);

  const artifacts = projectArtifacts(events);
  if (artifacts.length > 0) {
    console.log("\nArtifacts");
    console.log("---------");
    for (const artifact of artifacts) {
      console.log(`[${artifact.kind}] ${artifact.title}`);
      console.log(formatBlock(artifact.content));
    }
  }
  console.log("");
}

promptSession.close();
console.log("Bye.");

async function choose(label: string, options: string[]): Promise<number> {
  console.log(`${label}:`);
  options.forEach((option, index) => console.log(`  ${index + 1}. ${option}`));
  const answer = await promptSession.question(`Choose ${label.toLowerCase()} [1]: `);
  const parsed = Number(answer.trim() || "1");
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > options.length) {
    throw new Error(`Invalid ${label.toLowerCase()} choice.`);
  }
  return parsed - 1;
}

async function createRunContext(
  selectedEngine: EngineOption,
  workflowPath: string
): Promise<{ backend: AgentBackend; engine: ExecutionEngine }> {
  if (selectedEngine.mode === "fake") {
    return {
      backend: new FakeBackendAdapter(createBrokerOptions()),
      engine: {
        id: selectedEngine.id,
        type: "workflow",
        workflowPath
      }
    };
  }

  if (selectedEngine.mode === "opencode") {
    return {
      backend: new OpenCodeBackendAdapter({
        directory: process.cwd(),
        providerId: selectedEngine.providerId,
        modelId: selectedEngine.modelId,
        allowEdits: allowOpenCodeEdits,
        allowShell: allowOpenCodeShell,
        allowNetwork: allowOpenCodeNetwork,
        maxNodes: opencodeMaxNodes,
        promptTimeoutMs: opencodeTimeoutMs
      }),
      engine: {
        id: selectedEngine.id,
        type: "workflow",
        workflowPath
      }
    };
  }

  const engineConfig = JSON.parse(await readFile(selectedEngine.path, "utf8")) as EngineRouteConfig;
  const preflight = preflightEngineRoutes(engineConfig);
  if (!preflight.ok) {
    throw new Error(`Model route preflight failed:\n${formatPreflightIssues(preflight)}`);
  }

  return {
    backend: new ModelBackedBackendAdapter(new ModelRouter(engineConfig), createBrokerOptions()),
    engine: {
      id: engineConfig.id,
      type: "workflow",
      workflowPath
    }
  };
}

function createBrokerOptions() {
  if (!workspaceTools) return {};
  return {
    toolBroker: new WorkspaceToolBroker({ workspaceRoot: process.cwd(), allowWrites: allowFileEdits }),
    permissionBroker: allowFileEdits ? createWorkspaceWritePermissionBroker() : createReadOnlyPermissionBroker()
  };
}

function showEnvNotice(selectedEngine: EngineOption): void {
  if (selectedEngine.requiredEnv.length === 0) return;

  const missing = selectedEngine.requiredEnv.filter((name) => !process.env[name]);
  if (missing.length === 0) {
    console.log("\nEnvironment: required API variables are present.");
    return;
  }

  console.log("\nEnvironment: missing variables for the selected engine:");
  for (const name of missing) {
    console.log(`  - ${name}`);
  }
  console.log("The run can still start, but model calls will fail until these are set.\n");
}

function formatBlock(value: string): string {
  return value
    .trim()
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
}

function createPromptSession(): { question(prompt: string): Promise<string>; close(): void } {
  if (input.isTTY) {
    return createInterface({ input, output });
  }

  const lines = readFileSync(0, "utf8").split(/\r?\n/);
  let index = 0;
  return {
    async question(prompt: string): Promise<string> {
      const answer = lines[index++] ?? "";
      output.write(prompt);
      output.write(`${answer}\n`);
      return answer;
    },
    close() {
      // No-op for piped input.
    }
  };
}

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
