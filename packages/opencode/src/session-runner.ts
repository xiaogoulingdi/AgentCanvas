import type { OpencodeClient } from "@opencode-ai/sdk";
import { createOpenCodeToolPolicy } from "./permission-policy.ts";

export type OpenCodePromptInput = {
  client: OpencodeClient;
  directory: string;
  prompt: string;
  title?: string;
  providerId?: string;
  modelId?: string;
  allowEdits?: boolean;
  allowShell?: boolean;
  timeoutMs?: number;
};

export type OpenCodePromptResult = {
  sessionId: string;
  message: unknown;
  messages: unknown;
  diff: unknown;
};

export async function runOpenCodePrompt(input: OpenCodePromptInput): Promise<OpenCodePromptResult> {
  const session = await input.client.session.create({
    query: {
      directory: input.directory
    },
    body: {
      title: input.title ?? "Agent Canvas probe"
    }
  });

  if (!session.data) {
    throw new Error("OpenCode did not return a session.");
  }

  const sessionId = session.data.id;
  const message = await withTimeout(
    input.client.session.prompt({
      path: {
        id: sessionId
      },
      query: {
        directory: input.directory
      },
      body: {
        ...(input.providerId && input.modelId ? { model: { providerID: input.providerId, modelID: input.modelId } } : {}),
        tools: createOpenCodeToolPolicy({ allowEdits: input.allowEdits ?? false, allowShell: input.allowShell ?? false }),
        parts: [
          {
            type: "text",
            text: input.prompt
          }
        ]
      }
    }),
    input.timeoutMs ?? 60000,
    `OpenCode prompt timed out after ${input.timeoutMs ?? 60000}ms`
  );
  assertNoSdkError(message, "OpenCode prompt failed", sessionId);

  const [messages, diff] = await Promise.all([
    input.client.session.messages({
      path: {
        id: sessionId
      },
      query: {
        directory: input.directory,
        limit: 20
      }
    }),
    input.client.session.diff({
      path: {
        id: sessionId
      },
      query: {
        directory: input.directory
      }
    })
  ]);

  return {
    sessionId,
    message,
    messages,
    diff
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function assertNoSdkError(value: unknown, message: string, sessionId: string): void {
  const directError = value && typeof value === "object" && "error" in value ? value.error : undefined;
  const data = value && typeof value === "object" && "data" in value ? value.data : undefined;
  const info = data && typeof data === "object" && "info" in data ? data.info : undefined;
  const nestedError = info && typeof info === "object" && "error" in info ? info.error : undefined;
  const error = (directError ?? nestedError) as { name?: string; data?: { message?: string; ref?: string; statusCode?: number } } | undefined;
  if (!error) return;

  const detail = error.data?.message ?? error.name ?? "unknown error";
  const ref = error.data?.ref ? ` ref=${error.data.ref}` : "";
  const status = error.data?.statusCode ? ` status=${error.data.statusCode}` : "";
  throw new Error(`${message}: ${detail}; session=${sessionId}${status}${ref}`);
}
