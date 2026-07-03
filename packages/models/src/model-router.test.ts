import { describe, expect, it } from "vitest";
import { ModelRouter } from "./model-router.ts";

describe("ModelRouter", () => {
  it("resolves route targets to provider profiles", () => {
    const router = new ModelRouter({
      id: "test",
      name: "Test",
      routes: {
        research: {
          provider: "deepseek",
          model: "deepseek-v4-flash",
          reason: "cheap research"
        }
      }
    });

    const resolved = router.resolve("research");

    expect(resolved.provider.id).toBe("deepseek");
    expect(resolved.model).toBe("deepseek-v4-flash");
    expect(resolved.reason).toBe("cheap research");
  });

  it("uses default route when a route is missing", () => {
    const router = new ModelRouter({
      id: "test",
      name: "Test",
      routes: {
        default: {
          provider: "kimi",
          model: "kimi-k2.6"
        }
      }
    });

    expect(router.resolve("review").provider.id).toBe("kimi");
  });
});
