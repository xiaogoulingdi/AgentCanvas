import { JsonlEventLog } from "../../../packages/events/src/jsonl-event-log.ts";
import { rejectPatchRecord } from "../../../packages/patches/src/patch-store.ts";

const sessionId = readArg("--session-id");
const artifactId = readArg("--artifact-id");

if (!sessionId || !artifactId) {
  console.error("Usage: npm.cmd run patch:reject -- --session-id <id> --artifact-id <artifact-id>");
  process.exit(1);
}

try {
  const result = await rejectPatchRecord({
    eventLog: new JsonlEventLog(),
    sessionId,
    artifactId
  });

  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
