import { describe, expect, it } from "vitest";
import { configToEngineRoutes, configToProviderProfiles, type AgentCanvasConfig } from "./types.ts";
import { validateAgentCanvasConfig } from "./validate.ts";

const validConfig: AgentCanvasConfig = {
  version: "0.1.0",
  defaultEngine: "balanced-coding-group",
  opencodeDefault: "deepseek/deepseek-v4-flash",
  providers: {
    deepseek: {
      type: "openai_compatible",
      baseUrl: "https://api.deepseek.com",
      apiKeyEnv: "DEEPSEEK_API_KEY",
      wireApi: "chat_completions",
      models: {
        default: "deepseek-v4-flash"
      }
    }
  },
  models: {
    default: "deepseek/deepseek-v4-flash",
    code: "deepseek/deepseek-v4-flash"
  },
  tools: {
    "filesystem.read": "allow",
    shell: "deny"
  }
};

describe("Agent Canvas config", () => {
  it("validates project configuration", () => {
    expect(validateAgentCanvasConfig(validConfig)).toEqual([]);
  });

  it("rejects embedded-looking API keys and unknown providers", () => {
    expect(
      validateAgentCanvasConfig({
        ...validConfig,
        providers: {
          deepseek: {
            type: "openai_compatible",
            baseUrl: "https://api.deepseek.com",
            apiKeyEnv: "sk-secret"
          }
        },
        models: {
          default: "missing/model"
        }
      })
    ).toEqual(
      expect.arrayContaining([
        "Provider 'deepseek' apiKeyEnv must name an environment variable, not contain a key.",
        "Provider 'deepseek' models.default is required for model runtime.",
        "Model route 'default' references unknown provider 'missing'."
      ])
    );
  });

  it("projects model routes for existing CLI runtime", () => {
    expect(configToEngineRoutes(validConfig)).toEqual({
      id: "balanced-coding-group",
      name: "balanced-coding-group",
      routes: {
        default: {
          provider: "deepseek",
          model: "deepseek-v4-flash",
          reason: "Route 'default' selected by agentcanvas config."
        },
        code: {
          provider: "deepseek",
          model: "deepseek-v4-flash",
          reason: "Route 'code' selected by agentcanvas config."
        }
      }
    });
  });

  it("projects provider profiles for model runtime", () => {
    expect(configToProviderProfiles(validConfig).deepseek).toMatchObject({
      id: "deepseek",
      protocol: "openai_chat_completions",
      baseUrl: "https://api.deepseek.com",
      apiKeyEnv: "DEEPSEEK_API_KEY",
      defaultModel: "deepseek-v4-flash"
    });
  });
});
