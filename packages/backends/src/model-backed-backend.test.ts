import { describe, expect, it } from "vitest";
import { ModelBackedBackendAdapter } from "./model-backed-backend.ts";
import type { BackendEvent } from "./types.ts";
import type { ExecutionPlan } from "../../workflow/src/types.ts";
import type { ModelRouter } from "../../models/src/model-router.ts";
import { runWorkflow } from "../../runtime/src/run-workflow.ts";
import { MemoryEventLog } from "../../events/src/memory-event-log.ts";

const plan: ExecutionPlan = {
  id: "plan-test",
  workflowId: "workflow-test",
  workflowName: "Workflow Test",
  entryNodeId: "coder",
  nodes: [
    {
      id: "coder",
      type: "agent",
      role: "coder",
      route: "code",
      tools: ["read_file", "propose_patch"],
      permissions: ["filesystem.read", "filesystem.patch"]
    }
  ],
  edges: [],
  limits: {
    maxSteps: 10,
    maxDiscussionRounds: 1,
    maxEstimatedUsd: 1,
    maxRuntimeSeconds: 60
  },
  requiredTools: ["read_file", "propose_patch"],
  requiredModels: [],
  permissionScopes: ["filesystem.read", "filesystem.patch"],
  discussions: []
};

describe("ModelBackedBackendAdapter", () => {
  it("emits route, mocked tool, permission, and artifact events", async () => {
    const backend = new ModelBackedBackendAdapter(createStubRouter());

    const events: BackendEvent[] = [];
    for await (const event of backend.run({ sessionId: "session-test", prompt: "write code", plan })) {
      events.push(event);
    }

    expect(events.map((event) => event.type)).toEqual([
      "agent.started",
      "model.route.selected",
      "model.request.completed",
      "permission.checked",
      "permission.checked",
      "tool.call.requested",
      "tool.call.completed",
      "tool.call.requested",
      "tool.call.completed",
      "artifact.created",
      "agent.completed"
    ]);
    expect(events.find((event) => event.type === "model.route.selected")).toMatchObject({
      model: "stub-provider/stub-code-model",
      reason: "stub route reason",
      fallback: ["stub-fallback/stub-fallback-model"]
    });
    expect(events.find((event) => event.type === "artifact.created")).toMatchObject({
      artifact: {
        kind: "patch",
        title: "Model proposed change summary",
        content: "stub model output for code"
      }
    });
  });

  it("lets runWorkflow record workflow.failed when model routing fails", async () => {
    const backend = new ModelBackedBackendAdapter(createFailingRouter());
    const eventLog = new MemoryEventLog();

    await expect(
      runWorkflow({
        sessionId: "session-fail",
        prompt: "write code",
        engine: {
          id: "test-engine",
          type: "workflow",
          workflowPath: "memory"
        },
        plan,
        backend,
        eventLog
      })
    ).rejects.toThrow("route failed");

    const events = await eventLog.list("session-fail");
    expect(events.at(-1)).toMatchObject({
      type: "workflow.failed",
      workflowId: "workflow-test",
      message: "route failed"
    });
  });
});

function createStubRouter(): ModelRouter {
  const resolved = {
    route: "code",
    provider: {
      id: "stub-provider",
      protocol: "openai_chat_completions" as const,
      baseUrl: "https://example.invalid/v1",
      defaultModel: "stub-code-model"
    },
    model: "stub-code-model",
    reason: "stub route reason",
    fallback: [{ provider: "stub-fallback", model: "stub-fallback-model" }],
    adapter: {
      async complete() {
        throw new Error("adapter should not be called by this test");
      }
    }
  };

  return {
    resolve(route: string) {
      return {
        ...resolved,
        route
      };
    },
    async complete() {
      return {
        resolved,
        response: {
          id: "response-test",
          providerId: "stub-provider",
          model: "stub-code-model",
          content: "stub model output for code",
          usage: {
            inputTokens: 11,
            outputTokens: 7,
            totalTokens: 18
          },
          raw: {}
        }
      };
    }
  } as unknown as ModelRouter;
}

function createFailingRouter(): ModelRouter {
  return {
    resolve() {
      throw new Error("route failed");
    },
    async complete() {
      throw new Error("route failed");
    }
  } as unknown as ModelRouter;
}
