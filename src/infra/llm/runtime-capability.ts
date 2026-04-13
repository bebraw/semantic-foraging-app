import type { ModelProvider } from "./provider";

export async function getRuntimeModelCapability(provider: ModelProvider) {
  const available = await provider.isAvailable();

  if (!available) {
    return {
      provider: provider.name,
      available: false,
      supportsStructuredOutput: false,
      supportsStreaming: false,
      maxContextClass: "unknown" as const,
    };
  }

  return {
    provider: provider.name,
    ...(await provider.getCapabilities()),
  };
}