import { createOpenCodeConnection } from "../../../packages/opencode/src/client.ts";
import { runOpenCodePrompt } from "../../../packages/opencode/src/session-runner.ts";

const prompt = readArg("--prompt");
const baseUrl = readArg("--base-url") ?? process.env.OPENCODE_BASE_URL;
const providerId = readArg("--provider-id");
const modelId = readArg("--model-id");
const allowEdits = process.argv.includes("--allow-opencode-edits");

if (!prompt) {
  console.error(
    "Usage: npm.cmd run opencode:prompt -- --prompt <prompt> [--base-url <url>] [--provider-id <id> --model-id <id>] [--allow-opencode-edits]"
  );
  process.exit(1);
}

const connection = await createOpenCodeConnection({
  ...(baseUrl ? { baseUrl } : { hostname: "127.0.0.1", port: 4096, timeout: 10000 })
});

try {
  const result = await runOpenCodePrompt({
    client: connection.client,
    directory: process.cwd(),
    prompt,
    allowEdits,
    ...(providerId ? { providerId } : {}),
    ...(modelId ? { modelId } : {})
  });

  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  connection.close();
}

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
