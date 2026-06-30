import type { PermissionDecision } from "../../permissions/src/types.ts";
import type { EngineRouteConfig, RouteTarget } from "../../models/src/model-router.ts";

export type AgentCanvasConfig = {
  $schema?: string;
  version: string;
  defaultEngine?: string;
  opencodeDefault?: string;
  providers: Record<string, ProviderConfig>;
  models?: Record<string, string>;
  mcpServers?: Record<string, McpServerConfig>;
  tools?: Record<string, PermissionDecision>;
  groups?: string[];
  workflows?: string[];
};

export type ProviderConfig = {
  type: "openai_compatible" | "openai_responses" | "anthropic_compatible" | "opencode" | "custom";
  baseUrl: string;
  apiKeyEnv: string;
  wireApi?: "chat_completions" | "responses" | "messages";
  requiresOpenAIAuth?: boolean;
  disableResponseStorage?: boolean;
  models?: Record<string, string>;
};

export type McpServerConfig = {
  command: string;
  args?: string[];
  env?: Record<string, string>;
};

export function configToEngineRoutes(config: AgentCanvasConfig): EngineRouteConfig {
  const routes: Record<string, RouteTarget> = {};
  for (const [route, binding] of Object.entries(config.models ?? {})) {
    const [provider, ...modelParts] = binding.split("/");
    const model = modelParts.join("/");
    if (!provider || !model) continue;
    routes[route] = {
      provider,
      model,
      reason: `Route '${route}' selected by agentcanvas config.`
    };
  }

  return {
    id: config.defaultEngine ?? "agentcanvas-config",
    name: config.defaultEngine ?? "Agent Canvas Config",
    routes
  };
}
