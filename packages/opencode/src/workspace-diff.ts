import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import type { OpenCodeFileDiff } from "./result-parser.ts";

const execFileAsync = promisify(execFile);

export type WorkspaceSnapshot = Record<string, string>;

export async function captureTrackedWorkspaceSnapshot(directory: string): Promise<WorkspaceSnapshot> {
  const files = await listTrackedFiles(directory);
  const snapshot: WorkspaceSnapshot = {};
  for (const file of files) {
    const content = await readTextFileIfPossible(join(directory, file));
    if (content !== undefined) snapshot[file] = content;
  }
  return snapshot;
}

export function diffWorkspaceSnapshots(before: WorkspaceSnapshot, after: WorkspaceSnapshot): OpenCodeFileDiff[] {
  const files = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  return files.flatMap((file) => {
    const beforeContent = before[file] ?? "";
    const afterContent = after[file] ?? "";
    if (beforeContent === afterContent) return [];
    return [
      {
        file,
        before: beforeContent,
        after: afterContent,
        additions: countLines(afterContent),
        deletions: countLines(beforeContent)
      }
    ];
  });
}

async function listTrackedFiles(directory: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("git", ["ls-files", "-z"], {
      cwd: directory,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024
    });
    return stdout.split("\0").filter(Boolean);
  } catch {
    return [];
  }
}

async function readTextFileIfPossible(path: string): Promise<string | undefined> {
  try {
    const content = await readFile(path, "utf8");
    if (content.includes("\u0000")) return undefined;
    return content;
  } catch {
    return undefined;
  }
}

function countLines(content: string): number {
  if (!content) return 0;
  return content.replace(/\r\n/g, "\n").split("\n").filter((line, index, lines) => line.length > 0 || index < lines.length - 1).length;
}
