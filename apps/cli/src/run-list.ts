import { JsonlEventLog } from "../../../packages/events/src/jsonl-event-log.ts";

const json = process.argv.includes("--json");
const limit = Number(readArg("--limit") ?? "20");
const log = new JsonlEventLog();
const runs = (await log.listRuns()).slice(0, limit);

if (json) {
  console.log(JSON.stringify(runs, null, 2));
} else if (runs.length === 0) {
  console.log("No Agent Canvas runs found.");
} else {
  for (const run of runs) {
    const prompt = run.prompt ? ` prompt=${snippet(run.prompt, 80)}` : "";
    console.log(`${run.sessionId} ${run.status} ${run.updatedAt} engine=${run.engineId ?? "unknown"} workflow=${run.workflowName ?? run.workflowId ?? "unknown"} events=${run.eventCount}${prompt}`);
  }
}

function snippet(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 3)}...`;
}

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
