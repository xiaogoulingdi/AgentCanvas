import { createOpenCodeConnection } from "../../../packages/opencode/src/client.ts";

const baseUrl = readArg("--base-url") ?? process.env.OPENCODE_BASE_URL;
const hostname = readArg("--hostname") ?? "127.0.0.1";
const port = Number(readArg("--port") ?? "4096");
const timeout = Number(readArg("--timeout") ?? "10000");

const connection = await createOpenCodeConnection({
  ...(baseUrl ? { baseUrl } : { hostname, port, timeout })
});

try {
  const [project, path, vcs] = await Promise.all([
    connection.client.project.current(),
    connection.client.path.get(),
    connection.client.vcs.get()
  ]);
  console.log(
    JSON.stringify(
      {
        ok: true,
        project,
        path,
        vcs
      },
      null,
      2
    )
  );
} finally {
  connection.close();
}

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
