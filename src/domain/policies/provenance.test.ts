import { describe, expect, it } from "vitest";
import { deterministicProvenance, modelProvenance } from "./provenance";

describe("deterministicProvenance", () => {
  it("records deterministic fallback metadata", () => {
    expect(deterministicProvenance("provider-unavailable")).toEqual({
      source: "deterministic-fallback",
      provider: null,
      reason: "provider-unavailable",
    });
  });
});

describe("modelProvenance", () => {
  it("records model-backed provenance metadata", () => {
    expect(modelProvenance("cloudflare-workers-ai")).toEqual({
      source: "model",
      provider: "cloudflare-workers-ai",
      reason: "structured-inference",
    });
  });
});
