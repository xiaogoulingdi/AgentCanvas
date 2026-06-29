import { JsonlEventLog } from "../../../packages/events/src/jsonl-event-log.ts";
import { listPatchRecords } from "../../../packages/patches/src/patch-store.ts";

const sessionIdArg = readArg("--session-id");
const latest = process.argv.includes("--latest");
const json = process.argv.includes("--json");
const eventLog = new JsonlEventLog();
const latestRun = latest || !sessionIdArg ? await eventLog.latestRun() : undefined;
const sessionId = sessionIdArg ?? latestRun?.sessionId;

if (!sessionId) {
  console.error("Usage: npm.cmd run patch:list -- --session-id <id> [--json]");
  console.error("       npm.cmd run patch:list -- --latest [--json]");
  process.exit(1);
}

const patches = await listPatchRecords({ eventLog, sessionId });

if (json) {
  console.log(JSON.stringify(patches, null, 2));
} else if (patches.length === 0) {
  console.log(`No patch artifacts found for session: ${sessionId}`);
} else {
  for (const patch of patches) {
    console.log(`${patch.artifact.id} ${patch.status} structured=${patch.structured} title="${patch.artifact.title}"`);
  }
}

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
