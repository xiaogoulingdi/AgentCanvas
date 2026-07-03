import type { ModelAdapter, ModelMessage, ModelRequest, ModelResponse, ModelUsage } from "./types.ts";

type OpenAIResponsesResponse = {
  id?: string;
  model?: string;
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

export class OpenAIResponsesAdapter implements ModelAdapter {
  async complete(request: ModelRequest): Promise<ModelResponse> {
    if (request.stream) {
      throw new Error("Streaming is not implemented in Phase 1 responses probe adapter.");
    }

    const apiKey = request.provider.apiKeyEnv ? process.env[request.provider.apiKeyEnv] : undefined;
    const model = request.model ?? request.provider.defaultModel;
    const url = buildResponsesUrl(request.provider.baseUrl);
    const body = {
      model,
      input: toResponsesInput(request.messages),
      max_output_tokens: request.maxTokens ?? 64,
      store: request.store ?? !request.provider.disableResponseStorage,
      ...(request.reasoningEffort ?? request.provider.defaultReasoningEffort
        ? { reasoning: { effort: request.reasoningEffort ?? request.provider.defaultReasoningEffort } }
        : {}),
      ...(request.responseFormat === "json" ? { text: { format: { type: "json_object" } } } : {})
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? buildAuthHeader(request.provider.authHeader ?? "authorization_bearer", apiKey) : {}),
        ...request.provider.defaultHeaders
      },
      body: JSON.stringify(body)
    });

    const raw = (await response.json()) as OpenAIResponsesResponse;
    if (!response.ok) {
      const detail = raw.error?.message ?? response.statusText;
      throw new Error(`Responses request failed (${response.status}): ${detail}`);
    }

    const usage = normalizeResponsesUsage(raw.usage);
    return {
      id: raw.id ?? "unknown",
      providerId: request.provider.id,
      model: raw.model ?? model,
      content: extractResponseText(raw),
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

export function buildResponsesUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (trimmed.endsWith("/responses")) return trimmed;
  return `${trimmed}/responses`;
}

function toResponsesInput(messages: ModelMessage[]): Array<{ role: string; content: string }> {
  return messages.map((message) => ({
    role: message.role === "system" ? "developer" : message.role,
    content: message.content
  }));
}

function extractResponseText(raw: OpenAIResponsesResponse): string {
  if (raw.output_text) return raw.output_text;
  return (
    raw.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? "")
      .join("")
      .trim() ?? ""
  );
}

function normalizeResponsesUsage(usage: OpenAIResponsesResponse["usage"]): ModelUsage | undefined {
  if (!usage) return undefined;
  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    totalTokens: usage.total_tokens ?? (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0)
  };
}
