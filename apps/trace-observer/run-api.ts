import { readFile } from "node:fs/promises";
import { createId } from "../../packages/shared/src/ids.ts";
import { compileWorkflow } from "../../packages/workflow/src/compiler.ts";
import type { WorkflowDefinition } from "../../packages/workflow/src/types.ts";
import { JsonlEventLog } from "../../packages/events/src/jsonl-event-log.ts";
import { runWorkflow } from "../../packages/runtime/src/run-workflow.ts";
import { renderTraceJson } from "../../packages/trace/src/render-json.ts";
import { FakeBackendAdapter } from "../../packages/backends/src/fake-backend.ts";
import { OpenCodeBackendAdapter } from "../../packages/backends/src/opencode-backend.ts";
import type { ExecutionEngine } from "../../packages/engines/src/types.ts";
import { loadAgentCanvasConfig } from "../../packages/config/src/loader.ts";
import { configToPermissionBroker } from "../../packages/config/src/types.ts";
import { compileGroupToWorkflow } from "../../packages/groups/src/compiler.ts";
import type { MultiAgentGroupDefinition } from "../../packages/groups/src/types.ts";
import { getBuiltInAgentPackOrThrow } from "../../packages/packs/src/built-in-packs.ts";
import { opencodeModelFromBinding } from "./run-config.ts";

export type CreateRunRequest = {
  prompt: string;
  engine?: "fake" | "opencode";
  pack?: string;
  workflow?: string;
  group?: string;
  config?: string;
  allowOpenCodeEdits?: boolean;
  allowOpenCodeShell?: boolean;
  allowOpenCodeNetwork?: boolean;
  timeoutMs?: number;
  maxNodes?: number;
};

export async function createRun(input: CreateRunRequest): Promise<unknown> {
  if (!input.prompt?.trim()) throw new Error("prompt is required.");
  const eventLog = new JsonlEventLog();
  const sessionId = createId("session");
  const config = input.config ? await loadAgentCanvasConfig(input.config) : undefined;
  const workflow = await resolveWorkflow(input);
  const plan = compileWorkflow(workflow);
  const engineType = input.engine ?? "fake";
  const permissionBroker = config ? configToPermissionBroker(config) : undefined;

  const engine: ExecutionEngine = {
    id: input.pack ?? (input.group ? workflow.id : engineType),
    type: "workflow",
    workflowPath: input.pack ? `built-in-pack:${input.pack}` : input.group ?? input.workflow ?? "examples/workflows/research-code.json"
  };

  await runWorkflow({
    sessionId,
    prompt: input.prompt,
    engine,
    plan,
    backend:
      engineType === "opencode"
        ? new OpenCodeBackendAdapter({
            directory: process.cwd(),
            ...opencodeModelFromBinding(config?.opencodeDefault),
            allowEdits: input.allowOpenCodeEdits ?? false,
            allowShell: input.allowOpenCodeShell ?? false,
            allowNetwork: input.allowOpenCodeNetwork ?? false,
            maxNodes: input.maxNodes ?? 1,
            promptTimeoutMs: input.timeoutMs ?? 90000,
            ...(permissionBroker ? { permissionBroker } : {})
          })
        : new FakeBackendAdapter({
            ...(permissionBroker ? { permissionBroker } : {})
          }),
    eventLog
  });

  const events = await eventLog.list(sessionId);
  return JSON.parse(renderTraceJson(events));
}

async function loadWorkflow(path: string): Promise<WorkflowDefinition> {
  return JSON.parse(await readFile(path, "utf8")) as WorkflowDefinition;
}

async function loadGroupWorkflow(path: string): Promise<WorkflowDefinition> {
  const group = JSON.parse(await readFile(path, "utf8")) as MultiAgentGroupDefinition;
  return compileGroupToWorkflow(group);
}

async function resolveWorkflow(input: CreateRunRequest): Promise<WorkflowDefinition> {
  if (input.pack) return compileGroupToWorkflow(getBuiltInAgentPackOrThrow(input.pack).group);
  if (input.group) return loadGroupWorkflow(input.group);
  return loadWorkflow(input.workflow ?? "examples/workflows/research-code.json");
}
