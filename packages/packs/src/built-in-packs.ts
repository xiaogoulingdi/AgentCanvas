import type { MultiAgentGroupDefinition } from "../../groups/src/types.ts";

export type BuiltInAgentPackId = "deepseek-solo" | "deepseek-kimi" | "deepseek-kimi-openai";

export type BuiltInAgentPack = {
  id: BuiltInAgentPackId;
  name: string;
  tagline: string;
  description: string;
  group: MultiAgentGroupDefinition;
};

export function listBuiltInAgentPacks(): BuiltInAgentPack[] {
  return builtInAgentPacks;
}

export function getBuiltInAgentPack(id: string): BuiltInAgentPack | undefined {
  return builtInAgentPacks.find((pack) => pack.id === id);
}

export function getBuiltInAgentPackOrThrow(id: string): BuiltInAgentPack {
  const pack = getBuiltInAgentPack(id);
  if (!pack) {
    throw new Error(`Unknown Agent Pack '${id}'. Available packs: ${builtInAgentPacks.map((item) => item.id).join(", ")}`);
  }
  return pack;
}

const commonLimits = {
  maxDepth: 2,
  maxStrategyCalls: 6,
  maxSteps: 12,
  maxDiscussionRounds: 2,
  maxEstimatedUsd: 1,
  maxRuntimeSeconds: 600
} as const;

const builtInAgentPacks: BuiltInAgentPack[] = [
  {
    id: "deepseek-solo",
    name: "DeepSeek Solo",
    tagline: "Low-cost coding baseline",
    description: "A single-provider pack for quick local tests and inexpensive tasks.",
    group: {
      id: "pack-deepseek-solo",
      name: "DeepSeek Solo",
      version: "0.1.0",
      description: "DeepSeek handles planning, coding, and review for a low-cost first pass.",
      entryStrategy: "supervisor",
      limits: commonLimits,
      strategies: {
        supervisor: {
          role: "supervisor",
          intent: "Define task rules, identify constraints, and call the coding strategy when the task is bounded.",
          model: {
            provider: "deepseek",
            model: "deepseek-v4-flash",
            reason: "DeepSeek is selected as the low-cost rules and planning model."
          },
          tools: ["project_search", "read_file"],
          permissions: ["filesystem.read", "model.cost"],
          canCall: [
            {
              strategy: "coder",
              when: "The task requires a bounded code change or implementation proposal.",
              maxCalls: 2
            }
          ],
          budget: {
            maxEstimatedUsd: 0.2,
            maxRuntimeSeconds: 180
          }
        },
        coder: {
          role: "coder",
          intent: "Implement the requested change and emit a patch artifact.",
          model: {
            provider: "deepseek",
            model: "deepseek-v4-flash",
            reason: "DeepSeek is selected for inexpensive implementation work in Solo mode."
          },
          tools: ["read_file", "propose_patch"],
          permissions: ["filesystem.read", "filesystem.patch", "model.cost"],
          budget: {
            maxEstimatedUsd: 0.5,
            maxRuntimeSeconds: 300
          }
        }
      }
    }
  },
  {
    id: "deepseek-kimi",
    name: "DeepSeek + Kimi",
    tagline: "Rules by DeepSeek, code by Kimi",
    description: "DeepSeek plans and sets constraints; Kimi writes code and reviews the local patch.",
    group: {
      id: "pack-deepseek-kimi",
      name: "DeepSeek + Kimi",
      version: "0.1.0",
      description: "DeepSeek handles rules and planning while Kimi handles coding.",
      entryStrategy: "supervisor",
      limits: commonLimits,
      strategies: {
        supervisor: {
          role: "supervisor",
          intent: "Set the task rules, define acceptance criteria, and decide when the coder should act.",
          model: {
            provider: "deepseek",
            model: "deepseek-v4-flash",
            reason: "DeepSeek is selected for rule setting and task planning."
          },
          tools: ["project_search", "read_file"],
          permissions: ["filesystem.read", "model.cost"],
          canCall: [
            {
              strategy: "coder",
              when: "The plan is clear enough for implementation.",
              maxCalls: 2
            },
            {
              strategy: "reviewer",
              when: "A code change needs a second pass before presenting artifacts.",
              maxCalls: 1
            }
          ],
          budget: {
            maxEstimatedUsd: 0.2,
            maxRuntimeSeconds: 180
          }
        },
        coder: {
          role: "coder",
          intent: "Write code, propose file changes, and produce patch artifacts.",
          model: {
            provider: "kimi",
            model: "kimi-k2.6",
            reason: "Kimi is selected by this pack for code writing."
          },
          tools: ["read_file", "propose_patch"],
          permissions: ["filesystem.read", "filesystem.patch", "model.cost"],
          budget: {
            maxEstimatedUsd: 0.5,
            maxRuntimeSeconds: 300
          }
        },
        reviewer: {
          role: "reviewer",
          intent: "Review the patch for correctness, missing context, and obvious risks.",
          model: {
            provider: "kimi",
            model: "kimi-k2.6",
            reason: "Kimi provides an inexpensive review pass when OpenAI review is not selected."
          },
          tools: ["diff", "fake_test"],
          permissions: ["filesystem.read", "model.cost"],
          budget: {
            maxEstimatedUsd: 0.25,
            maxRuntimeSeconds: 180
          }
        }
      }
    }
  },
  {
    id: "deepseek-kimi-openai",
    name: "DeepSeek + Kimi + OpenAI",
    tagline: "Rules, code, strong review",
    description: "DeepSeek sets rules, Kimi writes code, and OpenAI performs the final code review.",
    group: {
      id: "pack-deepseek-kimi-openai",
      name: "DeepSeek + Kimi + OpenAI",
      version: "0.1.0",
      description: "A higher-quality pack with a dedicated OpenAI review role.",
      entryStrategy: "supervisor",
      limits: {
        ...commonLimits,
        maxEstimatedUsd: 2
      },
      strategies: {
        supervisor: {
          role: "supervisor",
          intent: "Set rules, constraints, and acceptance criteria before implementation.",
          model: {
            provider: "deepseek",
            model: "deepseek-v4-flash",
            reason: "DeepSeek is selected for rule setting, planning, and cost control."
          },
          tools: ["project_search", "read_file"],
          permissions: ["filesystem.read", "model.cost"],
          canCall: [
            {
              strategy: "coder",
              when: "The task requires implementation.",
              maxCalls: 2
            },
            {
              strategy: "reviewer",
              when: "The implementation needs final code review.",
              maxCalls: 2
            }
          ],
          budget: {
            maxEstimatedUsd: 0.3,
            maxRuntimeSeconds: 180
          }
        },
        coder: {
          role: "coder",
          intent: "Write code and emit patch artifacts.",
          model: {
            provider: "kimi",
            model: "kimi-k2.6",
            reason: "Kimi is selected for implementation work."
          },
          tools: ["read_file", "propose_patch"],
          permissions: ["filesystem.read", "filesystem.patch", "model.cost"],
          budget: {
            maxEstimatedUsd: 0.6,
            maxRuntimeSeconds: 300
          }
        },
        reviewer: {
          role: "reviewer",
          intent: "Review code quality, risks, edge cases, and final user-facing summary.",
          model: {
            provider: "sub2api",
            model: "gpt-5.4-mini",
            reason: "OpenAI-compatible Sub2API is selected for the final review role.",
            fallback: [
              {
                provider: "kimi",
                model: "kimi-k2.6",
                reason: "Fallback to Kimi when the OpenAI-compatible route is unavailable."
              }
            ]
          },
          tools: ["diff", "fake_test"],
          permissions: ["filesystem.read", "model.cost"],
          budget: {
            maxEstimatedUsd: 0.8,
            maxRuntimeSeconds: 240
          }
        }
      }
    }
  }
];
