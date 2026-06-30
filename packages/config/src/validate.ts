import type { AgentCanvasConfig } from "./types.ts";

const providerTypes = new Set(["openai_compatible", "openai_responses", "anthropic_compatible", "opencode", "custom"]);
const wireApis = new Set(["chat_completions", "responses", "messages"]);
const permissionDecisions = new Set(["allow", "ask", "deny"]);

export function validateAgentCanvasConfig(config: AgentCanvasConfig): string[] {
  const errors: string[] = [];

  if (!config.version) errors.push("Config version is required.");
  if (!config.providers || Object.keys(config.providers).length === 0) errors.push("At least one provider is required.");

  for (const [providerId, provider] of Object.entries(config.providers ?? {})) {
    if (!providerTypes.has(provider.type)) errors.push(`Provider '${providerId}' has invalid type '${provider.type}'.`);
    if (!provider.baseUrl) errors.push(`Provider '${providerId}' baseUrl is required.`);
    if (!provider.apiKeyEnv) errors.push(`Provider '${providerId}' apiKeyEnv is required.`);
    if (provider.wireApi && !wireApis.has(provider.wireApi)) errors.push(`Provider '${providerId}' has invalid wireApi '${provider.wireApi}'.`);
    if (provider.apiKeyEnv && provider.apiKeyEnv.toLowerCase().includes("sk-")) {
      errors.push(`Provider '${providerId}' apiKeyEnv must name an environment variable, not contain a key.`);
    }
  }

  for (const [route, binding] of Object.entries(config.models ?? {})) {
    const [provider, ...modelParts] = binding.split("/");
    if (!provider || modelParts.length === 0 || !modelParts.join("/")) {
      errors.push(`Model route '${route}' must use provider/model format.`);
    } else if (!config.providers?.[provider] && provider !== "opencode") {
      errors.push(`Model route '${route}' references unknown provider '${provider}'.`);
    }
  }

  for (const [serverId, server] of Object.entries(config.mcpServers ?? {})) {
    if (!server.command) errors.push(`MCP server '${serverId}' command is required.`);
  }

  for (const [scope, decision] of Object.entries(config.tools ?? {})) {
    if (!permissionDecisions.has(decision)) errors.push(`Tool '${scope}' has invalid decision '${decision}'.`);
  }

  return errors;
}

export function formatConfigIssues(errors: string[]): string {
  return errors.map((error) => `- ${error}`).join("\n");
}
