import { createOpenCodeConnection } from "../../../packages/opencode/src/client.ts";

const providerFilter = readArg("--provider");
const search = readArg("--search")?.toLowerCase();
const limit = Number(readArg("--limit") ?? "30");

const connection = await createOpenCodeConnection({
  hostname: "127.0.0.1",
  timeout: 10000
});

try {
  const providers = await connection.client.provider.list();
  const all = readArray(readProp(readData(providers), "all"));
  const rows = all
    .filter((provider) => !providerFilter || readProp(provider, "id") === providerFilter)
    .flatMap((provider) => {
      const providerId = String(readProp(provider, "id") ?? "");
      const models = readObject(readProp(provider, "models"));
      return Object.values(models).map((model) => ({
        providerId,
        modelId: String(readProp(model, "id") ?? ""),
        name: String(readProp(model, "name") ?? ""),
        status: String(readProp(model, "status") ?? ""),
        context: readProp(readObject(readProp(model, "limit")), "context") ?? null,
        output: readProp(readObject(readProp(model, "limit")), "output") ?? null
      }));
    })
    .filter((model) => !search || `${model.providerId} ${model.modelId} ${model.name}`.toLowerCase().includes(search))
    .slice(0, limit);

  console.log(JSON.stringify(rows, null, 2));
} finally {
  connection.close();
}

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readData(value: unknown): unknown {
  if (!value || typeof value !== "object") return undefined;
  return "data" in value ? value.data : undefined;
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
}

function readProp(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object") return undefined;
  return (value as Record<string, unknown>)[key];
}
