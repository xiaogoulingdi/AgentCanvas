import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { JsonlEventLog } from "../../events/src/jsonl-event-log.ts";
import { applyPatchRecord, listPatchRecords, rejectPatchRecord, revertPatchRecord } from "./patch-store.ts";
import type { AgentEvent } from "../../events/src/events.ts";

describe("patch-store", () => {
  it("applies and reverts structured patch artifacts with precondition checks", async () => {
    const dir = await mkdtemp(join(tmpdir(), "agent-canvas-patch-"));
    try {
      const workspaceRoot = join(dir, "workspace");
      const eventLog = new JsonlEventLog(join(dir, "runs"));
      const statusDir = join(dir, "patches");
      await mkdir(workspaceRoot, { recursive: true });
      await writeFile(join(workspaceRoot, "README.md"), "old", "utf8");
      await eventLog.append(
        event({
          type: "artifact.created",
          nodeId: "coder",
          artifact: {
            id: "artifact-patch",
            kind: "patch",
            title: "Patch",
            content: "diff",
            metadata: {
              diffs: [{ file: "README.md", before: "old", after: "new", additions: 1, deletions: 1 }]
            }
          }
        })
      );

      expect(await listPatchRecords({ eventLog, sessionId: "session-test", statusDir })).toMatchObject([
        { structured: true, status: "proposed" }
      ]);

      const dryRun = await applyPatchRecord({ workspaceRoot, eventLog, sessionId: "session-test", artifactId: "artifact-patch", yes: false, statusDir });
      expect(dryRun.changed).toBe(false);
      expect(await readFile(join(workspaceRoot, "README.md"), "utf8")).toBe("old");

      await applyPatchRecord({ workspaceRoot, eventLog, sessionId: "session-test", artifactId: "artifact-patch", yes: true, statusDir });
      expect(await readFile(join(workspaceRoot, "README.md"), "utf8")).toBe("new");

      await revertPatchRecord({ workspaceRoot, eventLog, sessionId: "session-test", artifactId: "artifact-patch", yes: true, statusDir });
      expect(await readFile(join(workspaceRoot, "README.md"), "utf8")).toBe("old");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects a proposed patch", async () => {
    const dir = await mkdtemp(join(tmpdir(), "agent-canvas-patch-"));
    try {
      const eventLog = new JsonlEventLog(join(dir, "runs"));
      const statusDir = join(dir, "patches");
      await eventLog.append(
        event({
          type: "artifact.created",
          nodeId: "coder",
          artifact: {
            id: "artifact-patch",
            kind: "patch",
            title: "Patch",
            content: "text-only"
          }
        })
      );

      await rejectPatchRecord({ eventLog, sessionId: "session-test", artifactId: "artifact-patch", statusDir });
      expect(await listPatchRecords({ eventLog, sessionId: "session-test", statusDir })).toMatchObject([{ status: "rejected" }]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("treats already-applied patch artifacts as applied", async () => {
    const dir = await mkdtemp(join(tmpdir(), "agent-canvas-patch-"));
    try {
      const eventLog = new JsonlEventLog(join(dir, "runs"));
      await eventLog.append(
        event({
          type: "artifact.created",
          nodeId: "coder",
          artifact: {
            id: "artifact-applied",
            kind: "patch",
            title: "Applied Patch",
            content: "diff",
            metadata: {
              alreadyApplied: true,
              diffs: [{ file: "README.md", before: "old", after: "new", additions: 1, deletions: 1 }]
            }
          }
        })
      );

      expect(await listPatchRecords({ eventLog, sessionId: "session-test", statusDir: join(dir, "patches") })).toMatchObject([
        { status: "applied", structured: true }
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

function event<T extends Omit<AgentEvent, "id" | "sessionId" | "timestamp">>(input: T): AgentEvent {
  return {
    id: `event-${input.type}`,
    sessionId: "session-test",
    timestamp: "2026-06-29T00:00:00.000Z",
    ...input
  } as unknown as AgentEvent;
}
