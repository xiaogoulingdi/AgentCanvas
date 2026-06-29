import { readdir, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createId } from "../../shared/src/ids.ts";
import type { ToolBroker, ToolExecutionRequest, ToolExecutionResult } from "./types.ts";
import { readWorkspaceFile } from "./workspace-file-ops.ts";

export class WorkspaceToolBroker implements ToolBroker {
  private readonly workspaceRoot: string;
  private readonly allowWrites: boolean;

  constructor(input: { workspaceRoot: string; allowWrites?: boolean }) {
    this.workspaceRoot = input.workspaceRoot;
    this.allowWrites = input.allowWrites ?? false;
  }

  async execute(request: ToolExecutionRequest): Promise<ToolExecutionResult> {
    if (request.toolName === "project_search") {
      const files = await listProjectFiles(this.workspaceRoot);
      return {
        summary: `Found ${files.length} project files. First files: ${files.slice(0, 8).join(", ") || "(none)"}.`
      };
    }

    if (request.toolName === "read_file") {
      const readme = await readWorkspaceFile(this.workspaceRoot, "README.md");
      return {
        summary: `Read README.md (${readme.content.length} chars).`
      };
    }

    if (request.toolName === "propose_patch") {
      const artifact = {
        id: createId("artifact"),
        kind: "patch" as const,
        title: "Model proposed change summary",
        content: request.modelOutput || "No model content returned."
      };

      if (!this.allowWrites) {
        return {
          summary: "Dry run: captured model proposal as an artifact. No files were changed.",
          artifacts: [artifact]
        };
      }

      const artifactPath = join(this.workspaceRoot, ".agent-canvas", "proposed-changes", `${request.sessionId}-${request.node.id}.md`);
      await mkdir(join(this.workspaceRoot, ".agent-canvas", "proposed-changes"), { recursive: true });
      await writeFile(artifactPath, artifact.content, "utf8");
      return {
        summary: `Wrote model proposal artifact to ${artifactPath}. Source files were not modified.`,
        artifacts: [artifact]
      };
    }

    return {
      summary: `Tool '${request.toolName}' is not implemented by WorkspaceToolBroker. No files were changed.`
    };
  }
}

async function listProjectFiles(root: string): Promise<string[]> {
  const results: string[] = [];
  await walk(root, "", results);
  return results;
}

async function walk(root: string, relativeDir: string, results: string[]): Promise<void> {
  if (results.length >= 64) return;
  const absoluteDir = join(root, relativeDir);
  const entries = await readdir(absoluteDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const relativePath = relativeDir ? join(relativeDir, entry.name) : entry.name;
    if (entry.isDirectory()) {
      await walk(root, relativePath, results);
    } else {
      results.push(relativePath);
    }
    if (results.length >= 64) return;
  }
}
