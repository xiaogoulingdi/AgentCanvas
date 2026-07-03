import { getProviderProfile, getProviderProfileForPreflight } from "../../../packages/models/src/provider-profiles.ts";
import { OpenAICompatibleAdapter } from "../../../packages/models/src/openai-compatible-adapter.ts";
import { OpenAIResponsesAdapter } from "../../../packages/models/src/openai-responses-adapter.ts";
import { formatPreflightIssues, preflightProvider } from "../../../packages/models/src/preflight.ts";

const providerId = readArg("--provider") ?? process.env.AGENT_CANVAS_PROVIDER ?? "custom";
const prompt = readArg("--prompt") ?? "Say ok in one short sentence.";
const model = readArg("--model");

const preflightProviderProfile = getProviderProfileForPreflight(providerId);
if (!preflightProviderProfile) {
  console.error(`Unknown provider '${providerId}'.`);
  process.exit(1);
}
const preflight = {
  ok: true,
  issues: preflightProvider(preflightProviderProfile)
};
preflight.ok = preflight.issues.every((issue) => issue.level !== "error");
if (!preflight.ok) {
  console.error("Provider preflight failed:");
  console.error(formatPreflightIssues(preflight));
  process.exit(1);
}

const provider = getProviderProfile(providerId);
const adapter = provider.protocol === "openai_responses" ? new OpenAIResponsesAdapter() : new OpenAICompatibleAdapter();

const startedAt = Date.now();
const response = await adapter.complete({
  provider,
  messages: [
    {
      role: "system",
      content: "You are a concise API probe. Return only the requested answer."
    },
    {
      role: "user",
      content: prompt
    }
  ],
  maxTokens: 64,
  ...(model ? { model } : {})
});
const latencyMs = Date.now() - startedAt;

console.log(
  JSON.stringify(
    {
      provider: provider.id,
      protocol: provider.protocol,
      model: response.model,
      latencyMs,
      content: response.content,
      usage: response.usage
    },
    null,
    2
  )
);

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
