import { dirname, resolve } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

export type WorkspaceEditMode = "replace" | "append";

export type WorkspaceFileEdit = {
  workspaceRoot: string;
  path: string;
  content: string;
  mode: WorkspaceEditMode;
  allowWrite: boolean;
};

export type WorkspaceFileEditResult = {
  absolutePath: string;
  changed: boolean;
  summary: string;
};

export async function readWorkspaceFile(workspaceRoot: string, path: string): Promise<{ absolutePath: string; content: string }> {
  const absolutePath = resolveWorkspacePath(workspaceRoot, path);
  return {
    absolutePath,
    content: await readFile(absolutePath, "utf8")
  };
}

export async function editWorkspaceFile(input: WorkspaceFileEdit): Promise<WorkspaceFileEditResult> {
  const absolutePath = resolveWorkspacePath(input.workspaceRoot, input.path);
  if (!input.allowWrite) {
    return {
      absolutePath,
      changed: false,
      summary: `Dry run: would ${input.mode} ${absolutePath}.`
    };
  }

  const current = input.mode === "append" ? await readExistingOrEmpty(absolutePath) : "";
  const next = input.mode === "append" ? `${current}${input.content}` : input.content;
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, next, "utf8");

  return {
    absolutePath,
    changed: true,
    summary: `${input.mode === "append" ? "Appended to" : "Replaced"} ${absolutePath}.`
  };
}

export function resolveWorkspacePath(workspaceRoot: string, path: string): string {
  const root = resolve(workspaceRoot);
  const absolutePath = resolve(root, path);
  const relative = absolutePath.slice(root.length).replace(/^[\\/]/, "");

  if (absolutePath !== root && !absolutePath.startsWith(`${root}\\`) && !absolutePath.startsWith(`${root}/`)) {
    throw new Error(`Path escapes workspace: ${path}`);
  }
  if (!relative) {
    throw new Error("Refusing to operate on workspace root.");
  }
  if (relative.split(/[\\/]/).some((part) => part === ".git" || part === "node_modules")) {
    throw new Error(`Refusing to operate inside protected path: ${path}`);
  }

  return absolutePath;
}

async function readExistingOrEmpty(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return "";
    throw error;
  }
}
