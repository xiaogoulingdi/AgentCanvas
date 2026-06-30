import { loadAgentCanvasConfig } from "../../../packages/config/src/loader.ts";
import { configToEngineRoutes, configToProviderProfiles, type AgentCanvasConfig } from "../../../packages/config/src/types.ts";
import type { EngineRouteConfig } from "../../../packages/models/src/model-router.ts";
import type { ProviderProfile } from "../../../packages/models/src/types.ts";

export async function loadCliConfig(): Promise<AgentCanvasConfig | undefined> {
  const configPath = readArg("--config");
  return configPath ? loadAgentCanvasConfig(configPath) : undefined;
}

export function engineRoutesFromConfig(config: AgentCanvasConfig): EngineRouteConfig {
  return configToEngineRoutes(config);
}

export function providerProfilesFromConfig(config: AgentCanvasConfig | undefined): Record<string, ProviderProfile> | undefined {
  return config ? configToProviderProfiles(config) : undefined;
}

export function opencodeModelFromConfig(config: AgentCanvasConfig | undefined): { providerId?: string; modelId?: string } {
  const binding = config?.opencodeDefault ?? config?.models?.code ?? config?.models?.default;
  if (!binding) return {};
  const [providerId, ...modelParts] = binding.split("/");
  const modelId = modelParts.join("/");
  if (!providerId || !modelId) return {};
  if (providerId === "opencode") {
    const [nestedProvider, ...nestedModelParts] = modelId.split("/");
    const nestedModel = nestedModelParts.join("/");
    return nestedProvider && nestedModel ? { providerId: nestedProvider, modelId: nestedModel } : { modelId };
  }
  return { providerId, modelId };
}

export function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
