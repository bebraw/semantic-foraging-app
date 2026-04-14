import { describe, expect, it, vi } from "vitest";
import type { ModelProvider } from "../../infra/llm/provider";
import { explainDecision } from "./use-explanation";

function createProvider(overrides: Partial<ModelProvider> = {}): ModelProvider {
  return {
    name: "test-provider",
    isAvailable: vi.fn().mockResolvedValue(true),
    getCapabilities: vi.fn(),
    completeText: vi.fn(),
    completeJson: vi.fn(),
    ...overrides,
  };
}

describe("explainDecision", () => {
  const input = {
    title: "Search result selected",
    facts: ["The query matched the title", "The result has a recent timestamp"],
  };

  it("returns deterministic copy when no provider is configured", async () => {
    await expect(explainDecision(null, input)).resolves.toEqual({
      explanation: "Search result selected. This result is based on the available structured information in the application.",
      provenance: {
        source: "deterministic-fallback",
        provider: null,
        reason: "no-model-provider",
      },
    });
  });

  it("returns model output when inference succeeds", async () => {
    const provider = createProvider({
      completeText: vi.fn().mockResolvedValue("The title and recency best match the request."),
    });

    await expect(explainDecision(provider, input)).resolves.toEqual({
      explanation: "The title and recency best match the request.",
      provenance: {
        source: "model",
        provider: "test-provider",
        reason: "structured-inference",
      },
    });
  });

  it("falls back to deterministic copy when inference throws", async () => {
    const provider = createProvider({
      completeText: vi.fn().mockRejectedValue(new Error("model unavailable")),
    });

    await expect(explainDecision(provider, input)).resolves.toEqual({
      explanation: "Search result selected. This result is based on the available structured information in the application.",
      provenance: {
        source: "deterministic-fallback",
        provider: null,
        reason: "model-inference-failed",
      },
    });
  });

  it("falls back to deterministic copy when the availability check throws", async () => {
    const provider = createProvider({
      isAvailable: vi.fn().mockRejectedValue(new Error("availability probe failed")),
    });

    await expect(explainDecision(provider, input)).resolves.toEqual({
      explanation: "Search result selected. This result is based on the available structured information in the application.",
      provenance: {
        source: "deterministic-fallback",
        provider: null,
        reason: "provider-unavailable",
      },
    });
  });
});
