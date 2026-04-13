import { describe, expect, it, vi } from "vitest";
import type { ModelProvider } from "../../infra/llm/provider";
import { classifyIntent } from "./intent-agent";

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

describe("classifyIntent", () => {
  it("uses deterministic explain fallback when no provider is configured", async () => {
    await expect(classifyIntent(null, "Explain why this happened")).resolves.toEqual({
      classification: {
        intent: "explain",
        confidence: 0.72,
        needsClarification: false,
      },
      confidenceBand: "medium",
      provenance: {
        source: "deterministic-fallback",
        provider: null,
        reason: "no-model-provider",
      },
    });
  });

  it("uses deterministic create fallback when inference fails", async () => {
    const provider = createProvider({
      completeJson: vi.fn().mockRejectedValue(new Error("model unavailable")),
    });

    await expect(classifyIntent(provider, "Create a new note")).resolves.toEqual({
      classification: {
        intent: "create",
        confidence: 0.66,
        needsClarification: false,
      },
      confidenceBand: "medium",
      provenance: {
        source: "deterministic-fallback",
        provider: null,
        reason: "model-inference-failed",
      },
    });
  });

  it("uses deterministic search fallback for other inputs", async () => {
    const provider = createProvider({
      isAvailable: vi.fn().mockResolvedValue(false),
    });

    await expect(classifyIntent(provider, "Find similar items")).resolves.toEqual({
      classification: {
        intent: "search",
        confidence: 0.61,
        needsClarification: false,
      },
      confidenceBand: "medium",
      provenance: {
        source: "deterministic-fallback",
        provider: null,
        reason: "provider-unavailable",
      },
    });
  });

  it("uses deterministic clarification fallback for ambiguous inputs", async () => {
    await expect(classifyIntent(null, "Help")).resolves.toEqual({
      classification: {
        intent: "clarify",
        confidence: 0.31,
        needsClarification: true,
      },
      confidenceBand: "low",
      provenance: {
        source: "deterministic-fallback",
        provider: null,
        reason: "no-model-provider",
      },
    });
  });

  it("returns validated model output when inference succeeds", async () => {
    const provider = createProvider({
      completeJson: vi.fn().mockResolvedValue({
        intent: "clarify",
        confidence: 0.87,
        needsClarification: true,
      }),
    });

    await expect(classifyIntent(provider, "I need help")).resolves.toEqual({
      classification: {
        intent: "clarify",
        confidence: 0.87,
        needsClarification: true,
      },
      confidenceBand: "high",
      provenance: {
        source: "model",
        provider: "test-provider",
        reason: "structured-inference",
      },
    });
  });
});
