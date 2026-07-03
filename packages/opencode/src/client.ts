import type { OpencodeClient } from "@opencode-ai/sdk";
import { createServer } from "node:net";
import { createOpenCodePermissionPolicy } from "./permission-policy.ts";

export type OpenCodeConnectionOptions = {
  baseUrl?: string;
  hostname?: string;
  port?: number;
  timeout?: number;
  allowEdits?: boolean;
  allowShell?: boolean;
  allowNetwork?: boolean;
};

export type OpenCodeConnection = {
  client: OpencodeClient;
  close(): void;
};

export async function createOpenCodeConnection(options: OpenCodeConnectionOptions = {}): Promise<OpenCodeConnection> {
  const sdk = await import("@opencode-ai/sdk");

  if (options.baseUrl) {
    const client = sdk.createOpencodeClient({ baseUrl: options.baseUrl });
    return {
      client,
      close() {
        // Client-only mode does not own the server process.
      }
    };
  }

  const port = options.port ?? (await findFreePort());
  const opencode = await sdk.createOpencode({
    hostname: options.hostname ?? "127.0.0.1",
    port,
    timeout: options.timeout ?? 5000,
    config: {
      agent: {
        build: {
          permission: createOpenCodePermissionPolicy({
            allowEdits: options.allowEdits ?? false,
            allowShell: options.allowShell ?? false,
            allowNetwork: options.allowNetwork ?? false
          })
        }
      }
    }
  });

  return {
    client: opencode.client,
    close() {
      opencode.server.close();
    }
  };
}

async function findFreePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === "object") {
          resolve(address.port);
        } else {
          reject(new Error("Failed to allocate an OpenCode server port."));
        }
      });
    });
    server.on("error", reject);
  });
}
