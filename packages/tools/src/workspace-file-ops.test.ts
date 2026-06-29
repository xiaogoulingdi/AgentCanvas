import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { editWorkspaceFile, resolveWorkspacePath } from "./workspace-file-ops.ts";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

describe("workspace file ops", () => {
  it("rejects paths that escape the workspace", async () => {
    const root = await createRoot();

    expect(() => resolveWorkspacePath(root, "../outside.txt")).toThrow("Path escapes workspace");
    expect(() => resolveWorkspacePath(root, ".git/config")).toThrow("protected path");
    expect(() => resolveWorkspacePath(root, "node_modules/pkg/index.js")).toThrow("protected path");
  });

  it("supports dry-run edits without writing files", async () => {
    const root = await createRoot();

    const result = await editWorkspaceFile({
      workspaceRoot: root,
      path: "notes/dry-run.md",
      content: "hello",
      mode: "replace",
      allowWrite: false
    });

    expect(result.changed).toBe(false);
    await expect(readFile(join(root, "notes", "dry-run.md"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("writes inside the workspace when explicitly allowed", async () => {
    const root = await createRoot();

    const result = await editWorkspaceFile({
      workspaceRoot: root,
      path: "notes/result.md",
      content: "hello",
      mode: "replace",
      allowWrite: true
    });

    expect(result.changed).toBe(true);
    await expect(readFile(join(root, "notes", "result.md"), "utf8")).resolves.toBe("hello");
  });
});

async function createRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "agent-canvas-tools-"));
  roots.push(root);
  return root;
}
