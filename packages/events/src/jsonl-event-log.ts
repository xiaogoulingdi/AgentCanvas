import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AgentEvent } from "./events.ts";
import type { EventLog } from "./memory-event-log.ts";

export type RunRecord = {
  sessionId: string;
  startedAt: string;
  updatedAt: string;
  status: "running" | "completed" | "failed";
  engineId?: string;
  workflowId?: string;
  workflowName?: string;
  prompt?: string;
  eventCount: number;
  eventPath: string;
};

export class JsonlEventLog implements EventLog {
  private readonly rootDir: string;
  private readonly indexPath: string;

  constructor(rootDir = ".agent-canvas/runs") {
    this.rootDir = rootDir;
    this.indexPath = join(rootDir, "index.jsonl");
  }

  async append(event: AgentEvent): Promise<void> {
    await mkdir(this.rootDir, { recursive: true });
    const eventPath = this.eventPath(event.sessionId);
    await mkdir(dirname(eventPath), { recursive: true });
    await writeFile(eventPath, `${JSON.stringify(event)}\n`, { encoding: "utf8", flag: "a" });
    await this.upsertRunRecord(event);
  }

  async list(sessionId: string): Promise<AgentEvent[]> {
    const content = await readTextIfExists(this.eventPath(sessionId));
    if (!content.trim()) return [];
    return content
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AgentEvent);
  }

  async listRuns(): Promise<RunRecord[]> {
    const content = await readTextIfExists(this.indexPath);
    if (!content.trim()) return [];
    const latest = new Map<string, RunRecord>();
    for (const line of content.split(/\r?\n/).filter(Boolean)) {
      const record = JSON.parse(line) as RunRecord;
      latest.set(record.sessionId, record);
    }
    return [...latest.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async latestRun(): Promise<RunRecord | undefined> {
    return (await this.listRuns())[0];
  }

  eventPath(sessionId: string): string {
    return join(this.rootDir, `${sessionId}.events.jsonl`);
  }

  private async upsertRunRecord(event: AgentEvent): Promise<void> {
    const existing = await this.listRuns();
    const current = existing.find((record) => record.sessionId === event.sessionId);
    const next = mergeRunRecord(current, event, this.eventPath(event.sessionId));
    await writeFile(this.indexPath, `${JSON.stringify(next)}\n`, { encoding: "utf8", flag: "a" });
  }
}

function mergeRunRecord(current: RunRecord | undefined, event: AgentEvent, eventPath: string): RunRecord {
  const base: RunRecord = current ?? {
    sessionId: event.sessionId,
    startedAt: event.timestamp,
    updatedAt: event.timestamp,
    status: "running",
    eventCount: 0,
    eventPath
  };

  const next: RunRecord = {
    ...base,
    updatedAt: event.timestamp,
    eventCount: base.eventCount + 1,
    eventPath
  };

  if (event.type === "user.prompt.submitted") next.prompt = event.prompt;
  if (event.type === "engine.selected") next.engineId = event.engineId;
  if (event.type === "workflow.loaded") {
    next.workflowId = event.workflowId;
    next.workflowName = event.workflowName;
  }
  if (event.type === "workflow.completed") next.status = "completed";
  if (event.type === "workflow.failed") next.status = "failed";

  return next;
}

async function readTextIfExists(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return "";
    throw error;
  }
}
