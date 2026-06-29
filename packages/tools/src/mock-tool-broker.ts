import type { ToolBroker, ToolExecutionRequest, ToolExecutionResult } from "./types.ts";

export class MockToolBroker implements ToolBroker {
  async execute(request: ToolExecutionRequest): Promise<ToolExecutionResult> {
    return {
      summary: `Tool '${request.toolName}' is mocked. No files were changed.`
    };
  }
}
