import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AgentCanvasConfig } from "./types.ts";
import { formatConfigIssues, validateAgentCanvasConfig } from "./validate.ts";

export async function loadAgentCanvasConfig(path = "agentcanvas.config.json"): Promise<AgentCanvasConfig> {
  const absolutePath = resolve(path);
  const config = JSON.parse(await readFile(absolutePath, "utf8")) as AgentCanvasConfig;
  const errors = validateAgentCanvasConfig(config);
  if (errors.length > 0) {
    throw new Error(`Invalid Agent Canvas config '${path}':\n${formatConfigIssues(errors)}`);
  }
  return config;
}
