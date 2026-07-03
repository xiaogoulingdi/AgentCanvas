import { OpenAICompatibleAdapter } from "./openai-compatible-adapter.ts";
import { OpenAIResponsesAdapter } from "./openai-responses-adapter.ts";
import { builtInProviderProfiles, getProviderProfileFromRegistry } from "./provider-profiles.ts";
import type { ModelAdapter, ModelRequest, ProviderProfile } from "./types.ts";

export type EngineRouteConfig = {
  id: string;
  name: string;
  routes: Record<string, RouteTarget>;
};

export type RouteTarget = {
  provider: string;
  model?: string;
  reason?: string;
  fallback?: RouteTarget[];
};

export type ResolvedModelRoute = {
  route: string;
  provider: ProviderProfile;
  model: string;
  reason: string;
  fallback: RouteTarget[];
  adapter: ModelAdapter;
};

export class ModelRouter {
  private readonly config: EngineRouteConfig;
  private readonly providerRegistry: Record<string, ProviderProfile>;

  constructor(config: EngineRouteConfig, providerRegistry: Record<string, ProviderProfile> = builtInProviderProfiles) {
    this.config = config;
    this.providerRegistry = providerRegistry;
  }

  resolve(route: string): ResolvedModelRoute {
    const target = this.config.routes[route] ?? this.config.routes.default;
    if (!target) {
      throw new Error(`No model route '${route}' and no default route configured in engine '${this.config.id}'.`);
    }

    const provider = getProviderProfileFromRegistry(target.provider, this.providerRegistry);
    return {
      route,
      provider,
      model: target.model ?? provider.defaultModel,
      reason: target.reason ?? `Route '${route}' selected ${provider.id}/${target.model ?? provider.defaultModel}.`,
      fallback: target.fallback ?? [],
      adapter: provider.protocol === "openai_responses" ? new OpenAIResponsesAdapter() : new OpenAICompatibleAdapter()
    };
  }

  async complete(route: string, request: Omit<ModelRequest, "provider" | "model">) {
    const resolved = this.resolve(route);
    return {
      resolved,
      response: await resolved.adapter.complete({
        ...request,
        provider: resolved.provider,
        model: resolved.model
      })
    };
  }
}
