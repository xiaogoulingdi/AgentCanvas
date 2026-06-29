import type { ModelAdapter, ModelRequest, ModelResponse, ModelUsage } from "./types.ts";

type OpenAIChatCompletionResponse = {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | null;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

export class OpenAICompatibleAdapter implements ModelAdapter {
  async complete(request: ModelRequest): Promise<ModelResponse> {
    if (request.stream) {
      throw new Error("Streaming is not implemented in Phase 1 probe adapter.");
    }

    const apiKey = request.provider.apiKeyEnv ? process.env[request.provider.apiKeyEnv] : undefined;
    if (!apiKey) {
      throw new Error(`Missing API key environment variable '${request.provider.apiKeyEnv ?? "unknown"}'.`);
    }

    const model = request.model ?? request.provider.defaultModel;
    const url = buildChatCompletionsUrl(request.provider.baseUrl);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeader(request.provider.authHeader ?? "authorization_bearer", apiKey),
        ...request.provider.defaultHeaders
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        stream: false,
        temperature: request.temperature ?? request.provider.defaultTemperature ?? 0,
        max_tokens: request.maxTokens ?? 64,
        ...(request.responseFormat === "json" ? { response_format: { type: "json_object" } } : {})
      })
    });

    const raw = (await response.json()) as OpenAIChatCompletionResponse;
    if (!response.ok) {
      const detail = raw.error?.message ?? response.statusText;
      throw new Error(`Model request failed (${response.status}): ${detail}`);
    }

    const content = raw.choices?.[0]?.message?.content ?? "";
    const usage = normalizeUsage(raw.usage);
    return {
      id: raw.id ?? "unknown",
      providerId: request.provider.id,
      model: raw.model ?? model,
      content,
      raw,
      ...(usage ? { usage } : {})
    };
  }
}

export function buildAuthHeader(
  authHeader: "authorization_bearer" | "x-api-key" | "x-goog-api-key",
  apiKey: string
): Record<string, string> {
  if (authHeader === "x-api-key") return { "x-api-key": apiKey };
  if (authHeader === "x-goog-api-key") return { "x-goog-api-key": apiKey };
  return { Authorization: `Bearer ${apiKey}` };
}

export function buildChatCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  return `${trimmed}/chat/completions`;
}

function normalizeUsage(usage: OpenAIChatCompletionResponse["usage"]): ModelUsage | undefined {
  if (!usage) return undefined;
  return {
    inputTokens: usage.prompt_tokens ?? 0,
    outputTokens: usage.completion_tokens ?? 0,
    totalTokens: usage.total_tokens ?? (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0)
  };
}
