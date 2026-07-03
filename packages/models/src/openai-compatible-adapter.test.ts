import { describe, expect, it } from "vitest";
import { buildChatCompletionsUrl } from "./openai-compatible-adapter.ts";

describe("buildChatCompletionsUrl", () => {
  it("appends chat completions path to provider base URLs", () => {
    expect(buildChatCompletionsUrl("https://api.deepseek.com")).toBe("https://api.deepseek.com/chat/completions");
    expect(buildChatCompletionsUrl("https://api.moonshot.ai/v1")).toBe("https://api.moonshot.ai/v1/chat/completions");
  });

  it("keeps a full chat completions URL unchanged", () => {
    expect(buildChatCompletionsUrl("https://example.com/v1/chat/completions")).toBe("https://example.com/v1/chat/completions");
  });
});
