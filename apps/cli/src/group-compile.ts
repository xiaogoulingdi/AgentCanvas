import { readFile } from "node:fs/promises";
import { compileGroupToWorkflow } from "../../../packages/groups/src/compiler.ts";
import type { MultiAgentGroupDefinition } from "../../../packages/groups/src/types.ts";

const groupPath = readArg("--group") ?? "examples/groups/balanced-coding-group.json";

const group = JSON.parse(await readFile(groupPath, "utf8")) as MultiAgentGroupDefinition;
console.log(JSON.stringify(compileGroupToWorkflow(group), null, 2));

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
