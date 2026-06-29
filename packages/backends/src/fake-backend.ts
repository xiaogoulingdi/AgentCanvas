import { createId } from "../../shared/src/ids.ts";
import { createReadOnlyPermissionBroker } from "../../permissions/src/static-permission-broker.ts";
import type { PermissionBroker } from "../../permissions/src/types.ts";
import { MockToolBroker } from "../../tools/src/mock-tool-broker.ts";
import type { ToolBroker } from "../../tools/src/types.ts";
import type { AgentBackend, BackendEvent, BackendRunRequest } from "./types.ts";

export class FakeBackendAdapter implements AgentBackend {
  private readonly permissionBroker: PermissionBroker;
  private readonly toolBroker: ToolBroker;

  readonly id = "fake-backend";
  readonly capabilities = {
    supportsTools: true,
    supportsStreaming: false,
    supportsPermissions: true,
    supportsArtifacts: true
  };

  constructor(input: { permissionBroker?: PermissionBroker; toolBroker?: ToolBroker } = {}) {
    this.permissionBroker = input.permissionBroker ?? createReadOnlyPermissionBroker();
    this.toolBroker = input.toolBroker ?? new MockToolBroker();
  }

  async *run(request: BackendRunRequest): AsyncIterable<BackendEvent> {
    for (const node of request.plan.nodes) {
      yield { type: "agent.started", node };

      const model = node.model ?? modelForRoute(node.route ?? node.role);
      yield {
        type: "model.route.selected",
        node,
        model,
        reason: reasonForNode(node.role, model),
        fallback: ["fake-balanced"]
      };

      yield {
        type: "model.request.completed",
        node,
        model,
        content: `Fake ${node.role} response for prompt: ${request.prompt}`,
        inputTokens: 120,
        outputTokens: 80,
        estimatedUsd: node.role.includes("review") ? 0.05 : 0.01
      };

      for (const scope of node.permissions ?? []) {
        const decision = await this.permissionBroker.check({ sessionId: request.sessionId, node, scope });
        yield { type: "permission.checked", node, scope, decision };
      }

      for (const toolName of node.tools ?? []) {
        yield { type: "tool.call.requested", node, toolName };
        const result = await this.toolBroker.execute({
          sessionId: request.sessionId,
          node,
          toolName,
          prompt: request.prompt,
          modelOutput: `Fake ${node.role} response for prompt: ${request.prompt}`
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
            title: "Proposed patch",
            content: "Fake patch artifact. No files were modified."
          }
        };
      }

      yield { type: "agent.completed", node, status: "completed" };
    }
  }
}

function modelForRoute(route: string): string {
  if (route.includes("research")) return "fake-cheap-long-context";
  if (route.includes("review")) return "fake-strong-reviewer";
  if (route.includes("code")) return "fake-balanced-coder";
  return "fake-balanced";
}

function reasonForNode(role: string, model: string): string {
  if (role.includes("research")) return `Using ${model} because research is low-risk and context-heavy.`;
  if (role.includes("review")) return `Using ${model} because review is quality-sensitive.`;
  if (role.includes("coder")) return `Using ${model} because code changes need balanced cost and quality.`;
  return `Using ${model} as a balanced default.`;
}
