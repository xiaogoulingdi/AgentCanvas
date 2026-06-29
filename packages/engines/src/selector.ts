import type { ExecutionEngine } from "./types.ts";

export function selectEngine(engines: ExecutionEngine[], engineId: string): ExecutionEngine {
  const engine = engines.find((candidate) => candidate.id === engineId);
  if (!engine) {
    throw new Error(`Engine '${engineId}' does not exist.`);
  }
  return engine;
}

export function resolveModelForRoute(
  routes: Record<string, { model: string; reason?: string; fallback?: string[] }>,
  route: string
): { model: string; reason: string; fallback: string[] } {
  const resolved = routes[route] ?? routes.default;
  if (!resolved) {
    return {
      model: "fake-balanced",
      reason: `No route '${route}' configured; using fake-balanced fallback.`,
      fallback: []
    };
  }

  return {
    model: resolved.model,
    reason: resolved.reason ?? `Route '${route}' selected model '${resolved.model}'.`,
    fallback: resolved.fallback ?? []
  };
}
