import { createId } from "../../shared/src/ids.ts";
import { createOpenCodeConnection } from "../../opencode/src/client.ts";
import { parseOpenCodeResult, renderDiffMarkdown } from "../../opencode/src/result-parser.ts";
import { runOpenCodePrompt } from "../../opencode/src/session-runner.ts";
import { captureTrackedWorkspaceSnapshot, diffWorkspaceSnapshots } from "../../opencode/src/workspace-diff.ts";
import { createReadOnlyPermissionBroker, createWorkspaceWritePermissionBroker } from "../../permissions/src/static-permission-broker.ts";
import type { PermissionBroker } from "../../permissions/src/types.ts";
import type { AgentBackend, BackendEvent, BackendRunRequest } from "./types.ts";
import type { OpenCodeConnection } from "../../opencode/src/client.ts";
import type { OpenCodePromptInput, OpenCodePromptResult } from "../../opencode/src/session-runner.ts";
import { createOpenCodePermissionPolicy } from "../../opencode/src/permission-policy.ts";
import type { PlanNode } from "../../workflow/src/types.ts";

export type OpenCodeBackendOptions = {
  directory: string;
  providerId?: string;
  modelId?: string;
  allowEdits?: boolean;
  allowShell?: boolean;
  allowNetwork?: boolean;
  baseUrl?: string;
  maxNodes?: number;
  promptTimeoutMs?: number;
  permissionBroker?: PermissionBroker;
  connectionFactory?: OpenCodeConnectionFactory;
  promptRunner?: OpenCodePromptRunner;
};

export type OpenCodeConnectionFactory = (input: { baseUrl?: string; hostname?: string; timeout?: number }) => Promise<OpenCodeConnection>;
export type OpenCodePromptRunner = (input: OpenCodePromptInput) => Promise<OpenCodePromptResult>;

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
    const connectionFactory = this.options.connectionFactory ?? createOpenCodeConnection;
    const promptRunner = this.options.promptRunner ?? runOpenCodePrompt;
    const connection = await connectionFactory({
      ...(this.options.baseUrl
        ? { baseUrl: this.options.baseUrl }
        : {
            hostname: "127.0.0.1",
            timeout: 10000,
            allowEdits: this.options.allowEdits ?? false,
            allowShell: this.options.allowShell ?? false,
            allowNetwork: this.options.allowNetwork ?? false
          })
    });

    try {
      const opencodePolicy = createOpenCodePermissionPolicy({
        allowEdits: this.options.allowEdits ?? false,
        allowShell: this.options.allowShell ?? false,
        allowNetwork: this.options.allowNetwork ?? false
      });
      yield {
        type: "permission.policy.loaded",
        source: "opencode-tool-policy",
        defaultDecision: "deny",
        policy: flattenOpenCodePolicy(opencodePolicy)
      };

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
          const permission = await explainPermission(this.permissionBroker, { sessionId: request.sessionId, node, scope });
          yield permissionCheckedEvent({ node, scope, ...permission });
        }

        const beforeSnapshot = this.options.allowEdits ? await captureTrackedWorkspaceSnapshot(this.options.directory) : undefined;
        const result = await promptRunner({
          client: connection.client,
          directory: this.options.directory,
          prompt: buildOpenCodeNodePrompt(request.prompt, node.role),
          title: `Agent Canvas ${request.sessionId} ${node.id}`,
          providerId,
          modelId,
          allowEdits: this.options.allowEdits ?? false,
          allowShell: this.options.allowShell ?? false,
          ...(this.options.promptTimeoutMs ? { timeoutMs: this.options.promptTimeoutMs } : {})
        });
        const parsed = parseOpenCodeResult(result);
        const fallbackDiffs =
          parsed.diffCount > 0 || !beforeSnapshot
            ? []
            : diffWorkspaceSnapshots(beforeSnapshot, await captureTrackedWorkspaceSnapshot(this.options.directory));
        const effectiveDiffs = parsed.diffCount > 0 ? parsed.diffs : fallbackDiffs;
        const effectiveDiffMarkdown = parsed.diffCount > 0 ? parsed.diffMarkdown : renderDiffMarkdown(fallbackDiffs);

        yield {
          type: "backend.session.observed",
          node,
          backend: "opencode",
          externalSessionId: result.sessionId,
          status: parsed.status,
          messageCount: parsed.messageCount,
          diffCount: effectiveDiffs.length,
          metadata: {
            providerId,
            modelId,
            diffSource: parsed.diffCount > 0 ? "opencode-sdk" : fallbackDiffs.length > 0 ? "git-snapshot" : "none"
          }
        };

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
            kind: "report",
            title: `OpenCode ${node.id} result`,
            content: parsed.text || "OpenCode returned no text output."
          }
        };

        if (effectiveDiffs.length > 0) {
          yield {
            type: "artifact.created",
            node,
            artifact: {
              id: createId("artifact"),
              kind: "patch",
              title: `OpenCode ${node.id} diff`,
              content: effectiveDiffMarkdown,
              metadata: {
                source: "opencode",
                opencodeSessionId: result.sessionId,
                diffSource: parsed.diffCount > 0 ? "opencode-sdk" : "git-snapshot",
                diffs: effectiveDiffs
              }
            }
          };
        }

        yield { type: "agent.completed", node, status: "completed" };
      }
    } finally {
      connection.close();
    }
  }
}

function permissionCheckedEvent(input: {
  node: PlanNode;
  scope: string;
  decision: "allow" | "ask" | "deny";
  reason?: string;
  source?: string;
}): BackendEvent {
  return {
    type: "permission.checked",
    node: input.node,
    scope: input.scope,
    decision: input.decision,
    ...(input.reason ? { reason: input.reason } : {}),
    ...(input.source ? { source: input.source } : {})
  };
}

async function explainPermission(
  broker: PermissionBroker,
  request: Parameters<PermissionBroker["check"]>[0]
): Promise<{ decision: "allow" | "ask" | "deny"; reason?: string; source?: string }> {
  if (broker.explain) return broker.explain(request);
  return { decision: await broker.check(request) };
}

function flattenOpenCodePolicy(policy: ReturnType<typeof createOpenCodePermissionPolicy>): Record<string, "allow" | "ask" | "deny"> {
  return {
    edit: policy.edit,
    bash: typeof policy.bash === "string" ? policy.bash : "ask",
    webfetch: policy.webfetch,
    doom_loop: policy.doom_loop,
    external_directory: policy.external_directory
  };
}

function buildOpenCodeNodePrompt(prompt: string, role: string): string {
  return [
    `User prompt: ${prompt}`,
    `Agent Canvas node role: ${role}`,
    "Keep the response concise.",
    "Do not edit files unless editing tools are explicitly enabled."
  ].join("\n\n");
}
