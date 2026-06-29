import type { OpencodeClient } from "@opencode-ai/sdk";

export type OpenCodeConnectionOptions = {
  baseUrl?: string;
  hostname?: string;
  port?: number;
  timeout?: number;
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

  const opencode = await sdk.createOpencode({
    hostname: options.hostname ?? "127.0.0.1",
    port: options.port ?? 4096,
    timeout: options.timeout ?? 5000
  });

  return {
    client: opencode.client,
    close() {
      opencode.server.close();
    }
  };
}
