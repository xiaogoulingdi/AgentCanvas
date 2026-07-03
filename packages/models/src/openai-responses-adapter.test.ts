import { describe, expect, it } from "vitest";
import { buildResponsesUrl } from "./openai-responses-adapter.ts";

describe("buildResponsesUrl", () => {
  it("appends responses path to provider base URLs", () => {
    expect(buildResponsesUrl("https://router.example")).toBe("https://router.example/responses");
    expect(buildResponsesUrl("https://example.com/v1")).toBe("https://example.com/v1/responses");
  });

  it("keeps a full responses URL unchanged", () => {
    expect(buildResponsesUrl("https://example.com/v1/responses")).toBe("https://example.com/v1/responses");
  });
});
