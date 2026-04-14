export type DeterministicProvenanceReason = "no-model-provider" | "provider-unavailable" | "model-inference-failed" | "model-schema-failed";

export type ModelProvenanceReason = "structured-inference";

export type Provenance =
  | {
      source: "deterministic-fallback";
      provider: null;
      reason: DeterministicProvenanceReason;
    }
  | {
      source: "model";
      provider: string;
      reason: ModelProvenanceReason;
    };

export function deterministicProvenance(reason: DeterministicProvenanceReason): Provenance {
  return {
    source: "deterministic-fallback",
    provider: null,
    reason,
  };
}

export function modelProvenance(provider: string): Provenance {
  return {
    source: "model",
    provider,
    reason: "structured-inference",
  };
}
