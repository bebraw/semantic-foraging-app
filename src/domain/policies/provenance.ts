export type Provenance = {
  source: "deterministic-fallback" | "model";
  provider: string | null;
  reason: string;
};

export function deterministicProvenance(reason: string): Provenance {
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
