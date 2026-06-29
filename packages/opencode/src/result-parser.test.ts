import { describe, expect, it } from "vitest";
import { parseOpenCodeResult } from "./result-parser.ts";

describe("parseOpenCodeResult", () => {
  it("extracts assistant text, token usage, cost, and diff count", () => {
    const parsed = parseOpenCodeResult({
      message: {
        data: {
          info: {
            cost: 0.001,
            tokens: {
              input: 10,
              output: 2,
              total: 12
            }
          },
          parts: [
            { type: "reasoning", text: "thinking" },
            { type: "text", text: "OK" }
          ]
        }
      },
      diff: {
        data: [{ file: "README.md", before: "", after: "OK", additions: 1, deletions: 0 }]
      }
    });

    expect(parsed).toEqual({
      text: "OK",
      inputTokens: 10,
      outputTokens: 2,
      totalTokens: 12,
      cost: 0.001,
      diffCount: 1
    });
  });
});
