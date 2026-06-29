import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AgentEvent, Artifact, ArtifactCreatedEvent } from "../../events/src/events.ts";
import type { JsonlEventLog } from "../../events/src/jsonl-event-log.ts";
import type { OpenCodeFileDiff } from "../../opencode/src/result-parser.ts";
import { resolveWorkspacePath } from "../../tools/src/workspace-file-ops.ts";

export type PatchRecord = {
  sessionId: string;
  artifact: Artifact;
  status: "proposed" | "applied" | "rejected" | "reverted";
  structured: boolean;
  updatedAt?: string;
};

export type PatchStoreOptions = {
  statusDir?: string;
};

export async function listPatchRecords(input: { eventLog: JsonlEventLog; sessionId: string } & PatchStoreOptions): Promise<PatchRecord[]> {
  const events = await input.eventLog.list(input.sessionId);
  const patches = events
    .filter(isPatchArtifactEvent)
    .map((event) => ({
      sessionId: input.sessionId,
      artifact: event.artifact,
      status: "proposed" as const,
      structured: readDiffs(event.artifact).length > 0
    }));
  const statuses = await readStatuses(input.statusDir);
  return patches.map((patch) => {
    const status = statuses[statusKey(patch.sessionId, patch.artifact.id)];
    return status ? { ...patch, status: status.status, updatedAt: status.updatedAt } : patch;
  });
}

function isPatchArtifactEvent(event: AgentEvent): event is ArtifactCreatedEvent {
  return event.type === "artifact.created" && event.artifact.kind === "patch";
}

export async function findPatchRecord(input: { eventLog: JsonlEventLog; sessionId: string; artifactId: string } & PatchStoreOptions): Promise<PatchRecord> {
  const record = (await listPatchRecords(input)).find((patch) => patch.artifact.id === input.artifactId);
  if (!record) throw new Error(`Patch artifact not found: ${input.artifactId}`);
  return record;
}

export async function applyPatchRecord(input: {
  workspaceRoot: string;
  eventLog: JsonlEventLog;
  sessionId: string;
  artifactId: string;
  yes: boolean;
} & PatchStoreOptions): Promise<PatchApplyResult> {
  const record = await findPatchRecord(input);
  if (record.status === "rejected") throw new Error(`Patch was rejected: ${input.artifactId}`);
  if (record.status === "applied") throw new Error(`Patch is already applied: ${input.artifactId}`);
  const diffs = requireStructuredDiffs(record.artifact);
  const changes = await applyDiffs({ workspaceRoot: input.workspaceRoot, diffs, direction: "forward", yes: input.yes });
  if (input.yes) await writeStatus(input.sessionId, input.artifactId, "applied", input.statusDir);
  return { artifactId: input.artifactId, changed: input.yes, changes };
}

export async function revertPatchRecord(input: {
  workspaceRoot: string;
  eventLog: JsonlEventLog;
  sessionId: string;
  artifactId: string;
  yes: boolean;
} & PatchStoreOptions): Promise<PatchApplyResult> {
  const record = await findPatchRecord(input);
  if (record.status !== "applied") throw new Error(`Only applied patches can be reverted. Current status: ${record.status}`);
  const diffs = requireStructuredDiffs(record.artifact);
  const changes = await applyDiffs({ workspaceRoot: input.workspaceRoot, diffs, direction: "reverse", yes: input.yes });
  if (input.yes) await writeStatus(input.sessionId, input.artifactId, "reverted", input.statusDir);
  return { artifactId: input.artifactId, changed: input.yes, changes };
}

export async function rejectPatchRecord(input: { eventLog: JsonlEventLog; sessionId: string; artifactId: string } & PatchStoreOptions): Promise<PatchRecord> {
  const record = await findPatchRecord(input);
  if (record.status === "applied") throw new Error("Applied patches must be reverted before they can be rejected.");
  await writeStatus(input.sessionId, input.artifactId, "rejected", input.statusDir);
  return { ...record, status: "rejected", updatedAt: new Date().toISOString() };
}

export type PatchApplyResult = {
  artifactId: string;
  changed: boolean;
  changes: Array<{
    file: string;
    absolutePath: string;
    action: "create" | "replace" | "noop";
  }>;
};

type StoredPatchStatus = {
  sessionId: string;
  artifactId: string;
  status: "applied" | "rejected" | "reverted";
  updatedAt: string;
};

async function applyDiffs(input: {
  workspaceRoot: string;
  diffs: OpenCodeFileDiff[];
  direction: "forward" | "reverse";
  yes: boolean;
}): Promise<PatchApplyResult["changes"]> {
  const changes: PatchApplyResult["changes"] = [];
  for (const diff of input.diffs) {
    const absolutePath = resolveWorkspacePath(input.workspaceRoot, diff.file);
    const expected = input.direction === "forward" ? diff.before : diff.after;
    const next = input.direction === "forward" ? diff.after : diff.before;
    const current = await readTextIfExists(absolutePath);
    if (current !== expected) {
      throw new Error(`Patch precondition failed for ${diff.file}. The file content no longer matches the expected ${input.direction === "forward" ? "before" : "after"} snapshot.`);
    }

    const action = current === "" && next !== "" ? "create" : next === current ? "noop" : "replace";
    changes.push({ file: diff.file, absolutePath, action });
    if (input.yes && action !== "noop") {
      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, next, "utf8");
    }
  }
  return changes;
}

function requireStructuredDiffs(artifact: Artifact): OpenCodeFileDiff[] {
  const diffs = readDiffs(artifact);
  if (diffs.length === 0) {
    throw new Error(`Patch artifact is not structured and cannot be safely applied: ${artifact.id}`);
  }
  return diffs;
}

function readDiffs(artifact: Artifact): OpenCodeFileDiff[] {
  const diffs = artifact.metadata?.diffs;
  if (!Array.isArray(diffs)) return [];
  return diffs
    .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object")
    .map((value) => ({
      file: String(value.file ?? ""),
      before: String(value.before ?? ""),
      after: String(value.after ?? ""),
      additions: Number(value.additions ?? 0),
      deletions: Number(value.deletions ?? 0)
    }))
    .filter((diff) => diff.file.length > 0);
}

async function readStatuses(statusDir?: string): Promise<Record<string, StoredPatchStatus>> {
  const content = await readTextIfExists(statusPath(statusDir));
  const statuses: Record<string, StoredPatchStatus> = {};
  for (const line of content.split(/\r?\n/).filter(Boolean)) {
    const status = JSON.parse(line) as StoredPatchStatus;
    statuses[statusKey(status.sessionId, status.artifactId)] = status;
  }
  return statuses;
}

async function writeStatus(sessionId: string, artifactId: string, status: StoredPatchStatus["status"], statusDir?: string): Promise<void> {
  const path = statusPath(statusDir);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify({ sessionId, artifactId, status, updatedAt: new Date().toISOString() } satisfies StoredPatchStatus)}\n`, {
    encoding: "utf8",
    flag: "a"
  });
}

function statusKey(sessionId: string, artifactId: string): string {
  return `${sessionId}:${artifactId}`;
}

function statusPath(statusDir = join(".agent-canvas", "patches")): string {
  return join(statusDir, "status.jsonl");
}

async function readTextIfExists(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return "";
    throw error;
  }
}
