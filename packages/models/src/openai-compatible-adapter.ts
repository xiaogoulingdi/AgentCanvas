import type { ModelAdapter, ModelRequest, ModelResponse, ModelUsage } from "./types.ts";

type OpenAIChatCompletionResponse = {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: OpenAIMessage;
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

type OpenAIMessage = {
  content?: string | Array<{ type?: string; text?: string }> | null;
  reasoning_content?: string | null;
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

    const content = extractMessageContent(raw.choices?.[0]?.message);
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

function extractMessageContent(message: OpenAIMessage | undefined): string {
  if (!message || typeof message !== "object") return "";
  const content = "content" in message ? message.content : undefined;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => part.text ?? "").join("").trim();
  }
  if ("reasoning_content" in message && typeof message.reasoning_content === "string") {
    return message.reasoning_content;
  }
  return "";
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
