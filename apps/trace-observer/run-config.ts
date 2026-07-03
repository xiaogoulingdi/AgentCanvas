export function opencodeModelFromBinding(binding: string | undefined): { providerId?: string; modelId?: string } {
  if (!binding) return {};
  const [providerId, ...modelParts] = binding.split("/");
  const modelId = modelParts.join("/");
  if (!providerId || !modelId) return {};
  return { providerId, modelId };
}
