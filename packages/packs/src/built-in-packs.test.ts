import { describe, expect, it } from "vitest";
import { compileGroupToWorkflow } from "../../groups/src/compiler.ts";
import { getBuiltInAgentPackOrThrow, listBuiltInAgentPacks } from "./built-in-packs.ts";

describe("built-in Agent Packs", () => {
  it("defines the three first-version presets", () => {
    expect(listBuiltInAgentPacks().map((pack) => pack.id)).toEqual(["deepseek-solo", "deepseek-kimi", "deepseek-kimi-openai"]);
  });

  it("compiles every built-in pack to a workflow", () => {
    for (const pack of listBuiltInAgentPacks()) {
      const workflow = compileGroupToWorkflow(pack.group);
      expect(workflow.id).toBe(pack.group.id);
      expect(workflow.nodes.supervisor?.model).toContain("/");
      expect(workflow.edges.length).toBeGreaterThan(0);
    }
  });

  it("keeps the requested role split for the strongest pack", () => {
    const pack = getBuiltInAgentPackOrThrow("deepseek-kimi-openai");
    expect(pack.group.strategies.supervisor?.model.provider).toBe("deepseek");
    expect(pack.group.strategies.coder?.model.provider).toBe("kimi");
    expect(pack.group.strategies.reviewer?.model.provider).toBe("sub2api");
  });
});
