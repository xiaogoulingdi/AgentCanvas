export type ProviderProfile = {
  id: string;
  protocol: "openai_chat_completions" | "openai_responses";
  baseUrl: string;
  apiKeyEnv?: string;
  authHeader?: "authorization_bearer" | "x-api-key" | "x-goog-api-key";
  requiresOpenAIAuth?: boolean;
  defaultModel: string;
  defaultReasoningEffort?: "minimal" | "low" | "medium" | "high";
  disableResponseStorage?: boolean;
  defaultTemperature?: number;
  defaultHeaders?: Record<string, string>;
};

export type ModelMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

export type ModelRequest = {
  provider: ProviderProfile;
  model?: string;
  messages: ModelMessage[];
  responseFormat?: "text" | "json";
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
  reasoningEffort?: "minimal" | "low" | "medium" | "high";
  store?: boolean;
};

export type ModelResponse = {
  id: string;
  providerId: string;
  model: string;
  content: string;
  usage?: ModelUsage;
  raw: unknown;
};

export type ModelUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export interface ModelAdapter {
  complete(request: ModelRequest): Promise<ModelResponse>;
}
