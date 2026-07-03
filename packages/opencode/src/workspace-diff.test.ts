import { describe, expect, it } from "vitest";
import { diffWorkspaceSnapshots } from "./workspace-diff.ts";

describe("diffWorkspaceSnapshots", () => {
  it("creates structured diffs from tracked file snapshots", () => {
    expect(
      diffWorkspaceSnapshots(
        {
          "README.md": "before\n"
        },
        {
          "README.md": "after\n",
          "docs/unchanged.md": "same"
        }
      )
    ).toEqual([
      {
        file: "README.md",
        before: "before\n",
        after: "after\n",
        additions: 1,
        deletions: 1
      },
      {
        file: "docs/unchanged.md",
        before: "",
        after: "same",
        additions: 1,
        deletions: 0
      }
    ]);
  });
});
