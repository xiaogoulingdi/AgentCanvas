import type { OpencodeClient } from "@opencode-ai/sdk";

export type OpenCodePromptInput = {
  client: OpencodeClient;
  directory: string;
  prompt: string;
  title?: string;
  providerId?: string;
  modelId?: string;
  allowEdits?: boolean;
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
  const message = await input.client.session.prompt({
    path: {
      id: sessionId
    },
    query: {
      directory: input.directory
    },
    body: {
      ...(input.providerId && input.modelId ? { model: { providerID: input.providerId, modelID: input.modelId } } : {}),
      tools: defaultToolPolicy(input.allowEdits ?? false),
      parts: [
        {
          type: "text",
          text: input.prompt
        }
      ]
    }
  });
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

function assertNoSdkError(value: unknown, message: string, sessionId: string): void {
  if (!value || typeof value !== "object" || !("error" in value)) return;
  const error = value.error as { name?: string; data?: { message?: string; ref?: string } };
  if (!error) return;

  const detail = error.data?.message ?? error.name ?? "unknown error";
  const ref = error.data?.ref ? ` ref=${error.data.ref}` : "";
  throw new Error(`${message}: ${detail}; session=${sessionId}${ref}`);
}

function defaultToolPolicy(allowEdits: boolean): Record<string, boolean> {
  return {
    bash: false,
    shell: false,
    write: allowEdits,
    edit: allowEdits,
    patch: allowEdits
  };
}
