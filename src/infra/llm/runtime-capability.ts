import type { RuntimeModelCapability } from "../../domain/contracts/model-runtime";
import type { ModelProvider } from "./provider";

export async function getRuntimeModelCapability(provider: ModelProvider | null): Promise<RuntimeModelCapability> {
  if (!provider) {
    return unavailableRuntimeCapability("no-model", null);
  }

  const mode = inferRuntimeMode(provider.name);

  try {
    const available = await provider.isAvailable();

    if (!available) {
      return unavailableRuntimeCapability(mode, provider.name);
    }
  } catch {
    return unavailableRuntimeCapability(mode, provider.name);
  }

  try {
    return {
      mode,
      provider: provider.name,
      ...(await provider.getCapabilities()),
    };
  } catch {
    return unavailableRuntimeCapability(mode, provider.name);
  }
}

function inferRuntimeMode(providerName: string): RuntimeModelCapability["mode"] {
  return providerName === "local-openai-compatible" ? "local-model" : "hosted-model";
}

function unavailableRuntimeCapability(mode: RuntimeModelCapability["mode"], provider: string | null): RuntimeModelCapability {
  return {
    mode,
    provider,
    available: false,
    supportsStructuredOutput: false,
    supportsStreaming: false,
    maxContextClass: "unknown",
  };
}
