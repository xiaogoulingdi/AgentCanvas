import { JsonlEventLog } from "../../../packages/events/src/jsonl-event-log.ts";
import { projectArtifacts } from "../../../packages/events/src/projections.ts";
import { renderTraceJson } from "../../../packages/trace/src/render-json.ts";
import { renderTraceText } from "../../../packages/trace/src/render-text.ts";

const sessionIdArg = readArg("--session-id");
const latest = process.argv.includes("--latest");
const json = process.argv.includes("--json");
const artifacts = process.argv.includes("--artifacts");
const log = new JsonlEventLog();
const run = latest || !sessionIdArg ? await log.latestRun() : undefined;
const sessionId = sessionIdArg ?? run?.sessionId;

if (!sessionId) {
  console.error("Usage: npm.cmd run run:inspect -- --session-id <id> [--json] [--artifacts]");
  console.error("       npm.cmd run run:inspect -- --latest [--json] [--artifacts]");
  process.exit(1);
}

const events = await log.list(sessionId);
if (events.length === 0) {
  console.error(`No events found for session: ${sessionId}`);
  process.exit(1);
}

if (json) {
  console.log(renderTraceJson(events));
} else {
  console.log(renderTraceText(events));
}

if (artifacts && !json) {
  const projected = projectArtifacts(events);
  if (projected.length > 0) {
    console.log("");
    console.log("Artifacts");
    console.log("---------");
    for (const artifact of projected) {
      console.log(`${artifact.id} [${artifact.kind}] ${artifact.title}`);
    }
  }
}

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
