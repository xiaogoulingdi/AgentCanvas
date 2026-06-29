import { createId } from "../../shared/src/ids.ts";
import type { ModelRouter } from "../../models/src/model-router.ts";
import type { AgentBackend, BackendEvent, BackendRunRequest } from "./types.ts";

export class ModelBackedBackendAdapter implements AgentBackend {
  private readonly router: ModelRouter;

  readonly id = "model-backed-backend";
  readonly capabilities = {
    supportsTools: true,
    supportsStreaming: false,
    supportsPermissions: true,
    supportsArtifacts: true
  };

  constructor(router: ModelRouter) {
    this.router = router;
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
        yield { type: "permission.checked", node, scope, decision: scope === "shell" ? "ask" : "allow" };
      }

      for (const toolName of node.tools ?? []) {
        yield { type: "tool.call.requested", node, toolName };
        yield {
          type: "tool.call.completed",
          node,
          toolName,
          summary: `Tool '${toolName}' is mocked in model-backed mode. No files were changed.`
        };
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
