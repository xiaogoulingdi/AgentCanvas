import { createId } from "../../shared/src/ids.ts";
import type { ModelRouter } from "../../models/src/model-router.ts";
import { createReadOnlyPermissionBroker } from "../../permissions/src/static-permission-broker.ts";
import type { PermissionBroker } from "../../permissions/src/types.ts";
import { MockToolBroker } from "../../tools/src/mock-tool-broker.ts";
import type { ToolBroker } from "../../tools/src/types.ts";
import type { AgentBackend, BackendEvent, BackendRunRequest } from "./types.ts";
import type { PlanNode } from "../../workflow/src/types.ts";

export class ModelBackedBackendAdapter implements AgentBackend {
  private readonly router: ModelRouter;
  private readonly permissionBroker: PermissionBroker;
  private readonly toolBroker: ToolBroker;

  readonly id = "model-backed-backend";
  readonly capabilities = {
    supportsTools: true,
    supportsStreaming: false,
    supportsPermissions: true,
    supportsArtifacts: true
  };

  constructor(router: ModelRouter, input: { permissionBroker?: PermissionBroker; toolBroker?: ToolBroker } = {}) {
    this.router = router;
    this.permissionBroker = input.permissionBroker ?? createReadOnlyPermissionBroker();
    this.toolBroker = input.toolBroker ?? new MockToolBroker();
  }

  async *run(request: BackendRunRequest): AsyncIterable<BackendEvent> {
    const priorOutputs: string[] = [];

    for (const node of request.plan.nodes) {
      yield { type: "agent.started", node };

      const route = node.route ?? node.role;
      const resolved = this.router.resolve(route);
      yield {
        type: "model.route.selected",
        node,
        model: `${resolved.provider.id}/${resolved.model}`,
        reason: resolved.reason,
        fallback: resolved.fallback.map((fallback) => `${fallback.provider}/${fallback.model ?? "default"}`)
      };

      const { response } = await this.router.complete(route, {
        messages: [
          {
            role: "system",
            content: systemPromptForNode(node.role)
          },
          {
            role: "user",
            content: buildNodePrompt(request.prompt, node.role, priorOutputs)
          }
        ],
        maxTokens: 320
      });

      priorOutputs.push(`${node.id}: ${response.content}`);
      yield {
        type: "model.request.completed",
        node,
        model: `${response.providerId}/${response.model}`,
        content: response.content,
        inputTokens: response.usage?.inputTokens ?? 0,
        outputTokens: response.usage?.outputTokens ?? 0,
        estimatedUsd: 0
      };

      for (const scope of node.permissions ?? []) {
        const permission = await explainPermission(this.permissionBroker, { sessionId: request.sessionId, node, scope });
        yield permissionCheckedEvent({ node, scope, ...permission });
      }

      for (const toolName of node.tools ?? []) {
        yield { type: "tool.call.requested", node, toolName };
        const result = await this.toolBroker.execute({
          sessionId: request.sessionId,
          node,
          toolName,
          prompt: request.prompt,
          modelOutput: response.content
        });
        yield {
          type: "tool.call.completed",
          node,
          toolName,
          summary: result.summary
        };
        for (const artifact of result.artifacts ?? []) {
          yield { type: "artifact.created", node, artifact };
        }
      }

      if (node.role.includes("coder")) {
        yield {
          type: "artifact.created",
          node,
          artifact: {
            id: createId("artifact"),
            kind: "patch",
            title: "Model proposed change summary",
            content: response.content || "No model content returned."
          }
        };
      }

      yield { type: "agent.completed", node, status: "completed" };
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

function systemPromptForNode(role: string): string {
  if (role.includes("research")) {
    return "You are a repository research agent. Summarize relevant context. Do not claim you changed files.";
  }
  if (role.includes("coder")) {
    return "You are a coding agent. Propose a safe patch plan in text only. Do not claim you actually edited files.";
  }
  if (role.includes("review")) {
    return "You are a code review agent. Review the proposed plan and list risks and verification steps.";
  }
  return "You are a supervisor agent. Coordinate a bounded coding workflow and keep the answer concise.";
}

function buildNodePrompt(prompt: string, role: string, priorOutputs: string[]): string {
  return [
    `User prompt: ${prompt}`,
    `Current agent role: ${role}`,
    priorOutputs.length > 0 ? `Previous outputs:\n${priorOutputs.join("\n\n")}` : "No previous outputs.",
    "Return concise, actionable output for this role."
  ].join("\n\n");
}
