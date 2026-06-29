export type OpenCodeTextResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  diffCount: number;
  diffs: OpenCodeFileDiff[];
  diffMarkdown: string;
};

export type OpenCodeFileDiff = {
  file: string;
  before: string;
  after: string;
  additions: number;
  deletions: number;
};

export function parseOpenCodeResult(result: { message: unknown; diff: unknown }): OpenCodeTextResult {
  const messageData = readData(result.message);
  const parts = readArray(readProp(messageData, "parts"));
  const info = readObject(readProp(messageData, "info"));
  const tokens = readObject(readProp(info, "tokens"));
  const diffData = readData(result.diff);
  const diffs = readArray(diffData).map(toFileDiff);

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
    diffCount: diffs.length,
    diffs,
    diffMarkdown: renderDiffMarkdown(diffs)
  };
}

export function renderDiffMarkdown(diffs: OpenCodeFileDiff[]): string {
  if (diffs.length === 0) return "";
  return diffs.map(renderFileDiff).join("\n\n");
}

function renderFileDiff(diff: OpenCodeFileDiff): string {
  return [
    `### ${diff.file}`,
    "",
    `Additions: ${diff.additions}`,
    `Deletions: ${diff.deletions}`,
    "",
    "```diff",
    renderUnifiedDiff(diff),
    "```"
  ].join("\n");
}

function renderUnifiedDiff(diff: OpenCodeFileDiff): string {
  if (!diff.before && !diff.after) return "";

  const beforeLines = diff.before.split(/\r?\n/);
  const afterLines = diff.after.split(/\r?\n/);
  const lines = [`--- a/${diff.file}`, `+++ b/${diff.file}`];

  for (const line of beforeLines) {
    if (line.length > 0) lines.push(`-${line}`);
  }
  for (const line of afterLines) {
    if (line.length > 0) lines.push(`+${line}`);
  }

  return lines.join("\n");
}

function toFileDiff(value: Record<string, unknown>): OpenCodeFileDiff {
  return {
    file: String(readProp(value, "file") ?? "unknown"),
    before: String(readProp(value, "before") ?? ""),
    after: String(readProp(value, "after") ?? ""),
    additions: Number(readProp(value, "additions") ?? 0),
    deletions: Number(readProp(value, "deletions") ?? 0)
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
