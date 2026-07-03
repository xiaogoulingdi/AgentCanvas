import { readFile } from "node:fs/promises";
import { editWorkspaceFile } from "../../../packages/tools/src/workspace-file-ops.ts";

const path = readArg("--path");
const inlineContent = readArg("--content");
const contentFile = readArg("--content-file");
const append = process.argv.includes("--append");
const yes = process.argv.includes("--yes");

if (!path || (!inlineContent && !contentFile)) {
  console.error("Usage: npm.cmd run file:edit -- --path <workspace-relative-path> (--content <text> | --content-file <path>) [--append] [--yes]");
  console.error("Default mode is dry-run. Add --yes to write.");
  process.exit(1);
}

const content = contentFile ? await readFile(contentFile, "utf8") : inlineContent ?? "";
const result = await editWorkspaceFile({
  workspaceRoot: process.cwd(),
  path,
  content,
  mode: append ? "append" : "replace",
  allowWrite: yes
});

console.log(
  JSON.stringify(
    {
      path,
      absolutePath: result.absolutePath,
      changed: result.changed,
      summary: result.summary
    },
    null,
    2
  )
);

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
