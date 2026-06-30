import { builtInProviderProfiles, getProviderProfileForPreflight } from "./provider-profiles.ts";
import type { EngineRouteConfig, RouteTarget } from "./model-router.ts";
import type { ProviderProfile } from "./types.ts";

export type ProviderPreflightIssue = {
  providerId: string;
  route?: string;
  level: "error" | "warning";
  message: string;
};

export type ProviderPreflightResult = {
  ok: boolean;
  issues: ProviderPreflightIssue[];
};

export function preflightProvider(provider: ProviderProfile, route?: string): ProviderPreflightIssue[] {
  const issues: ProviderPreflightIssue[] = [];
  const context = issueContext(provider.id, route);

  if (!provider.baseUrl) {
    issues.push({
      ...context,
      level: "error",
      message: "Provider baseUrl is empty. Set the provider base URL environment variable."
    });
  }

  if (!provider.defaultModel) {
    issues.push({
      ...context,
      level: "error",
      message: "Provider default model is empty. Set the model environment variable or route model."
    });
  }

  if (provider.apiKeyEnv && !process.env[provider.apiKeyEnv]) {
    issues.push({
      ...context,
      level: "error",
      message: `Missing API key environment variable '${provider.apiKeyEnv}'.`
    });
  }

  if (!provider.apiKeyEnv && provider.requiresOpenAIAuth) {
    issues.push({
      ...context,
      level: "error",
      message: "Provider requires auth but no apiKeyEnv is configured."
    });
  }

  if (provider.protocol === "openai_chat_completions" && provider.baseUrl.endsWith("/responses")) {
    issues.push({
      ...context,
      level: "warning",
      message: "Chat Completions provider baseUrl ends with /responses; expected a /v1 or /chat/completions URL."
    });
  }

  if (provider.protocol === "openai_responses" && provider.baseUrl.endsWith("/chat/completions")) {
    issues.push({
      ...context,
      level: "warning",
      message: "Responses provider baseUrl ends with /chat/completions; expected a /v1 or /responses URL."
    });
  }

  return issues;
}

export function preflightEngineRoutes(
  config: EngineRouteConfig,
  providerRegistry: Record<string, ProviderProfile> = builtInProviderProfiles
): ProviderPreflightResult {
  const issues = Object.entries(config.routes).flatMap(([route, target]) => preflightTarget(route, target, providerRegistry));
  return {
    ok: issues.every((issue) => issue.level !== "error"),
    issues
  };
}

export function formatPreflightIssues(result: ProviderPreflightResult): string {
  if (result.issues.length === 0) return "Preflight passed.";

  return result.issues
    .map((issue) => {
      const route = issue.route ? ` route=${issue.route}` : "";
      return `[${issue.level}] provider=${issue.providerId}${route}: ${issue.message}`;
    })
    .join("\n");
}

function preflightTarget(route: string, target: RouteTarget, providerRegistry: Record<string, ProviderProfile>): ProviderPreflightIssue[] {
  const baseProvider = getProviderProfileForPreflight(target.provider, providerRegistry);
  if (!baseProvider) {
    return [
      {
        providerId: target.provider,
        route,
        level: "error",
        message: "Unknown provider."
      }
    ];
  }

  const provider = {
    ...baseProvider,
    ...(target.model ? { defaultModel: target.model } : {})
  };
  const primaryIssues = preflightProvider(provider, route);
  const fallbackIssues = (target.fallback ?? []).flatMap((fallback, index) => preflightTarget(`${route}.fallback.${index}`, fallback, providerRegistry));
  return [...primaryIssues, ...fallbackIssues];
}

function issueContext(providerId: string, route: string | undefined): Pick<ProviderPreflightIssue, "providerId" | "route"> {
  return {
    providerId,
    ...(route ? { route } : {})
  };
}
