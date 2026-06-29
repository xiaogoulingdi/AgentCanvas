export type OpenCodeTextResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  diffCount: number;
};

export function parseOpenCodeResult(result: { message: unknown; diff: unknown }): OpenCodeTextResult {
  const messageData = readData(result.message);
  const parts = readArray(readProp(messageData, "parts"));
  const info = readObject(readProp(messageData, "info"));
  const tokens = readObject(readProp(info, "tokens"));
  const diffData = readData(result.diff);

  return {
    text: parts
      .filter((part) => readProp(part, "type") === "text")
      .map((part) => String(readProp(part, "text") ?? ""))
      .join("")
      .trim(),
    inputTokens: Number(readProp(tokens, "input") ?? 0),
    outputTokens: Number(readProp(tokens, "output") ?? 0),
    totalTokens: Number(readProp(tokens, "total") ?? 0),
    cost: Number(readProp(info, "cost") ?? 0),
    diffCount: readArray(diffData).length
  };
}

function readData(value: unknown): unknown {
  if (!value || typeof value !== "object") return undefined;
  return "data" in value ? value.data : undefined;
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
}

function readProp(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object") return undefined;
  return (value as Record<string, unknown>)[key];
}
