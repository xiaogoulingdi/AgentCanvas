import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { JsonlEventLog } from "../../packages/events/src/jsonl-event-log.ts";
import { renderTraceJson } from "../../packages/trace/src/render-json.ts";
import { createRun } from "./run-api.ts";

const port = Number(readArg("--port") ?? process.env.AGENT_CANVAS_TRACE_PORT ?? "4317");
const host = readArg("--host") ?? "127.0.0.1";
const staticRoot = resolve("apps/trace-observer");
const eventLog = new JsonlEventLog();

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${host}:${port}`}`);
    if (request.method === "POST" && url.pathname === "/api/runs") {
      const body = JSON.parse(await readBody(request)) as unknown;
      sendJson(response, 201, await createRun(body as Parameters<typeof createRun>[0]));
      return;
    }

    if (request.method !== "GET") {
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    if (url.pathname === "/api/runs") {
      const limit = Number(url.searchParams.get("limit") ?? "50");
      sendJson(response, 200, { runs: (await eventLog.listRuns()).slice(0, limit) });
      return;
    }

    if (url.pathname === "/api/runs/latest") {
      const latest = await eventLog.latestRun();
      if (!latest) {
        sendJson(response, 404, { error: "No runs found" });
        return;
      }
      const events = await eventLog.list(latest.sessionId);
      sendJson(response, 200, JSON.parse(renderTraceJson(events)));
      return;
    }

    const runMatch = url.pathname.match(/^\/api\/runs\/([^/]+)$/);
    if (runMatch?.[1]) {
      const sessionId = decodeURIComponent(runMatch[1]);
      const events = await eventLog.list(sessionId);
      if (events.length === 0) {
        sendJson(response, 404, { error: `No events found for session: ${sessionId}` });
        return;
      }
      sendJson(response, 200, JSON.parse(renderTraceJson(events)));
      return;
    }

    serveStatic(url.pathname, response);
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(port, host, () => {
  console.log(`Trace Observer: http://${host}:${port}`);
});

function serveStatic(pathname: string, response: Parameters<typeof sendJson>[0]): void {
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const absolutePath = resolve(staticRoot, relativePath);
  if (absolutePath !== staticRoot && !absolutePath.startsWith(`${staticRoot}\\`) && !absolutePath.startsWith(`${staticRoot}/`)) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  const stream = createReadStream(absolutePath);
  stream.on("error", () => sendJson(response, 404, { error: "Not found" }));
  response.writeHead(200, { "Content-Type": contentType(absolutePath) });
  stream.pipe(response);
}

function sendJson(response: import("node:http").ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload, null, 2));
}

async function readBody(request: import("node:http").IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function contentType(path: string): string {
  switch (extname(path)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
