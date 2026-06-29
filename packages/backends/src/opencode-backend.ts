import { createId } from "../../shared/src/ids.ts";
import { createOpenCodeConnection } from "../../opencode/src/client.ts";
import { parseOpenCodeResult } from "../../opencode/src/result-parser.ts";
import { runOpenCodePrompt } from "../../opencode/src/session-runner.ts";
import { createReadOnlyPermissionBroker, createWorkspaceWritePermissionBroker } from "../../permissions/src/static-permission-broker.ts";
import type { PermissionBroker } from "../../permissions/src/types.ts";
import type { AgentBackend, BackendEvent, BackendRunRequest } from "./types.ts";

export type OpenCodeBackendOptions = {
  directory: string;
  providerId?: string;
  modelId?: string;
  allowEdits?: boolean;
  baseUrl?: string;
  maxNodes?: number;
  promptTimeoutMs?: number;
  permissionBroker?: PermissionBroker;
};

export class OpenCodeBackendAdapter implements AgentBackend {
  private readonly options: OpenCodeBackendOptions;
  private readonly permissionBroker: PermissionBroker;

  readonly id = "opencode-backend";
  readonly capabilities = {
    supportsTools: true,
    supportsStreaming: false,
    supportsPermissions: true,
    supportsArtifacts: true
  };

  constructor(options: OpenCodeBackendOptions) {
    this.options = options;
    this.permissionBroker =
      options.permissionBroker ?? (options.allowEdits ? createWorkspaceWritePermissionBroker() : createReadOnlyPermissionBroker());
  }

  async *run(request: BackendRunRequest): AsyncIterable<BackendEvent> {
    const connection = await createOpenCodeConnection({
      ...(this.options.baseUrl ? { baseUrl: this.options.baseUrl } : { hostname: "127.0.0.1", timeout: 10000 })
    });

    try {
      for (const node of request.plan.nodes.slice(0, this.options.maxNodes ?? request.plan.nodes.length)) {
        yield { type: "agent.started", node };

        const providerId = this.options.providerId ?? "deepseek";
        const modelId = this.options.modelId ?? "deepseek-v4-flash";
        yield {
          type: "model.route.selected",
          node,
          model: `${providerId}/${modelId}`,
          reason: "OpenCode backend selected for coding-agent execution.",
          fallback: []
        };

        for (const scope of node.permissions ?? []) {
          const decision = await this.permissionBroker.check({ sessionId: request.sessionId, node, scope });
          yield { type: "permission.checked", node, scope, decision };
        }

        const result = await runOpenCodePrompt({
          client: connection.client,
          directory: this.options.directory,
          prompt: buildOpenCodeNodePrompt(request.prompt, node.role),
          title: `Agent Canvas ${request.sessionId} ${node.id}`,
          providerId,
          modelId,
          allowEdits: this.options.allowEdits ?? false,
          ...(this.options.promptTimeoutMs ? { timeoutMs: this.options.promptTimeoutMs } : {})
        });
        const parsed = parseOpenCodeResult(result);

        yield {
          type: "model.request.completed",
          node,
          model: `${providerId}/${modelId}`,
          content: parsed.text,
          inputTokens: parsed.inputTokens,
          outputTokens: parsed.outputTokens,
          estimatedUsd: parsed.cost
        };

        yield {
          type: "artifact.created",
          node,
          artifact: {
            id: createId("artifact"),
            kind: parsed.diffCount > 0 ? "patch" : "report",
            title: `OpenCode ${node.id} result`,
            content: parsed.text || "OpenCode returned no text output."
          }
        };

        yield { type: "agent.completed", node, status: "completed" };
      }
    } finally {
      connection.close();
    }
  }
}

function buildOpenCodeNodePrompt(prompt: string, role: string): string {
  return [
    `User prompt: ${prompt}`,
    `Agent Canvas node role: ${role}`,
    "Keep the response concise.",
    "Do not edit files unless editing tools are explicitly enabled."
  ].join("\n\n");
}
