import { JsonlEventLog } from "../../../packages/events/src/jsonl-event-log.ts";
import { revertPatchRecord } from "../../../packages/patches/src/patch-store.ts";

const sessionId = readArg("--session-id");
const artifactId = readArg("--artifact-id");
const yes = process.argv.includes("--yes");

if (!sessionId || !artifactId) {
  console.error("Usage: npm.cmd run patch:revert -- --session-id <id> --artifact-id <artifact-id> [--yes]");
  console.error("Default mode is dry-run. Add --yes to write files.");
  process.exit(1);
}

try {
  const result = await revertPatchRecord({
    workspaceRoot: process.cwd(),
    eventLog: new JsonlEventLog(),
    sessionId,
    artifactId,
    yes
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
