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
        intent: "explain-suggestion",
        confidence: 0.82,
        needsClarification: false,
        cues: {
          species: [],
          habitat: [],
          region: [],
          season: [],
        },
        missing: [],
      },
      confidenceBand: "high",
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
        intent: "create-field-note",
        confidence: 0.74,
        needsClarification: false,
        cues: {
          species: [],
          habitat: [],
          region: [],
          season: [],
        },
        missing: ["species", "region"],
      },
      confidenceBand: "medium",
      provenance: {
        source: "deterministic-fallback",
        provider: null,
        reason: "model-inference-failed",
      },
    });
  });

  it("uses deterministic fallback when structured model output fails schema validation", async () => {
    const provider = createProvider({
      completeJson: vi.fn().mockResolvedValue({
        intent: "find-observations",
        confidence: 2,
        needsClarification: false,
        cues: {
          species: [],
          habitat: [],
          region: [],
          season: [],
        },
        missing: [],
      }),
    });

    await expect(classifyIntent(provider, "Find similar items")).resolves.toEqual({
      classification: {
        intent: "find-observations",
        confidence: 0.69,
        needsClarification: false,
        cues: {
          species: [],
          habitat: [],
          region: [],
          season: [],
        },
        missing: ["species", "habitat", "region"],
      },
      confidenceBand: "medium",
      provenance: {
        source: "deterministic-fallback",
        provider: null,
        reason: "model-schema-failed",
      },
    });
  });

  it("uses deterministic search fallback for other inputs", async () => {
    const provider = createProvider({
      isAvailable: vi.fn().mockResolvedValue(false),
    });

    await expect(classifyIntent(provider, "Find similar items")).resolves.toEqual({
      classification: {
        intent: "find-observations",
        confidence: 0.69,
        needsClarification: false,
        cues: {
          species: [],
          habitat: [],
          region: [],
          season: [],
        },
        missing: ["species", "habitat", "region"],
      },
      confidenceBand: "medium",
      provenance: {
        source: "deterministic-fallback",
        provider: null,
        reason: "provider-unavailable",
      },
    });
  });

  it("uses deterministic fallback when the availability check throws", async () => {
    const provider = createProvider({
      isAvailable: vi.fn().mockRejectedValue(new Error("availability probe failed")),
    });

    await expect(classifyIntent(provider, "Find similar items")).resolves.toEqual({
      classification: {
        intent: "find-observations",
        confidence: 0.69,
        needsClarification: false,
        cues: {
          species: [],
          habitat: [],
          region: [],
          season: [],
        },
        missing: ["species", "habitat", "region"],
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
        cues: {
          species: [],
          habitat: [],
          region: [],
          season: [],
        },
        missing: ["artifact_scope"],
      },
      confidenceBand: "low",
      provenance: {
        source: "deterministic-fallback",
        provider: null,
        reason: "no-model-provider",
      },
    });
  });

  it("extracts berry and region cues for explicit table-style search queries", async () => {
    await expect(
      classifyIntent(null, "Give me a table of the most prevalent mushrooms in Finland at the lake district in autumn"),
    ).resolves.toEqual({
      classification: {
        intent: "find-observations",
        confidence: 0.69,
        needsClarification: false,
        cues: {
          species: ["mushroom"],
          habitat: [],
          region: ["finland", "lake district"],
          season: ["autumn"],
        },
        missing: [],
      },
      confidenceBand: "medium",
      provenance: {
        source: "deterministic-fallback",
        provider: null,
        reason: "no-model-provider",
      },
    });
  });

  it("classifies short patch requests through the inspect-patch branch", async () => {
    await expect(classifyIntent(null, "Patch site")).resolves.toEqual({
      classification: {
        intent: "inspect-patch",
        confidence: 0.71,
        needsClarification: true,
        cues: {
          species: [],
          habitat: [],
          region: [],
          season: [],
        },
        missing: ["habitat", "region"],
      },
      confidenceBand: "medium",
      provenance: {
        source: "deterministic-fallback",
        provider: null,
        reason: "no-model-provider",
      },
    });
  });

  it("falls back to the generic clarification branch for unmatched longer input", async () => {
    await expect(classifyIntent(null, "Tell me about forest folklore")).resolves.toEqual({
      classification: {
        intent: "clarify",
        confidence: 0.42,
        needsClarification: true,
        cues: {
          species: [],
          habitat: [],
          region: [],
          season: [],
        },
        missing: ["artifact_scope"],
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
        cues: {
          species: ["chanterelle"],
          habitat: ["spruce"],
          region: ["helsinki"],
          season: ["autumn"],
        },
        missing: ["artifact_scope"],
      }),
    });

    await expect(classifyIntent(provider, "I need help")).resolves.toEqual({
      classification: {
        intent: "clarify",
        confidence: 0.87,
        needsClarification: true,
        cues: {
          species: ["chanterelle"],
          habitat: ["spruce"],
          region: ["helsinki"],
          season: ["autumn"],
        },
        missing: ["artifact_scope"],
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
