import type { ProviderProfile } from "./types.ts";

export const builtInProviderProfiles: Record<string, ProviderProfile> = {
  deepseek: {
    id: "deepseek",
    protocol: "openai_chat_completions",
    baseUrl: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    authHeader: "authorization_bearer",
    defaultModel: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
    defaultTemperature: Number(process.env.DEEPSEEK_TEMPERATURE ?? 0)
  },
  kimi: {
    id: "kimi",
    protocol: "openai_chat_completions",
    baseUrl: process.env.KIMI_BASE_URL ?? "https://api.moonshot.cn/v1",
    apiKeyEnv: "KIMI_API_KEY",
    authHeader: "authorization_bearer",
    defaultModel: process.env.KIMI_MODEL ?? "kimi-k2.6",
    defaultTemperature: Number(process.env.KIMI_TEMPERATURE ?? 1)
  },
  custom: customProfile()
};

export function getProviderProfile(providerId: string): ProviderProfile {
  const provider = getProviderProfileForPreflight(providerId);
  if (!provider) {
    throw new Error(`Unknown provider '${providerId}'. Available providers: ${Object.keys(builtInProviderProfiles).join(", ")}`);
  }
  if (!provider.baseUrl) {
    throw new Error(`Provider '${providerId}' is missing baseUrl.`);
  }
  if (!provider.defaultModel) {
    throw new Error(`Provider '${providerId}' is missing defaultModel.`);
  }
  return provider;
}

export function getProviderProfileForPreflight(providerId: string): ProviderProfile | undefined {
  return builtInProviderProfiles[providerId];
}

function customProfile(): ProviderProfile {
  return {
    id: process.env.AGENT_CANVAS_PROVIDER ?? "custom",
    protocol: parseProtocol(process.env.AGENT_CANVAS_WIRE_API),
    baseUrl: process.env.AGENT_CANVAS_API_BASE_URL ?? "",
    ...(process.env.AGENT_CANVAS_API_KEY || process.env.AGENT_CANVAS_API_KEY_ENV
      ? { apiKeyEnv: process.env.AGENT_CANVAS_API_KEY_ENV ?? "AGENT_CANVAS_API_KEY" }
      : {}),
    authHeader: parseAuthHeader(process.env.AGENT_CANVAS_AUTH_HEADER),
    requiresOpenAIAuth: process.env.AGENT_CANVAS_REQUIRES_OPENAI_AUTH === "true",
    defaultModel: process.env.AGENT_CANVAS_MODEL ?? "",
    ...(process.env.AGENT_CANVAS_REASONING_EFFORT
      ? { defaultReasoningEffort: parseReasoningEffort(process.env.AGENT_CANVAS_REASONING_EFFORT) }
      : {}),
    ...(process.env.AGENT_CANVAS_DISABLE_RESPONSE_STORAGE
      ? { disableResponseStorage: process.env.AGENT_CANVAS_DISABLE_RESPONSE_STORAGE === "true" }
      : {}),
    ...(process.env.AGENT_CANVAS_TEMPERATURE ? { defaultTemperature: Number(process.env.AGENT_CANVAS_TEMPERATURE) } : {})
  };
}

function parseAuthHeader(value: string | undefined): NonNullable<ProviderProfile["authHeader"]> {
  if (value === "x-api-key" || value === "x-goog-api-key" || value === "authorization_bearer") return value;
  return "authorization_bearer";
}

function parseProtocol(value: string | undefined): ProviderProfile["protocol"] {
  if (value === "responses" || value === "openai_responses") return "openai_responses";
  return "openai_chat_completions";
}

function parseReasoningEffort(value: string): NonNullable<ProviderProfile["defaultReasoningEffort"]> {
  if (value === "minimal" || value === "low" || value === "medium" || value === "high") return value;
  throw new Error(`Invalid reasoning effort '${value}'.`);
}
