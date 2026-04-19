import { describe, expect, it } from "vitest";
import { buildForagingCandidateCards } from "./knowledge-agent";

describe("buildForagingCandidateCards", () => {
  it("returns ranked observation-oriented candidates for observation searches", () => {
    const cards = buildForagingCandidateCards({
      input: "Find chanterelles near wet spruce in Helsinki",
      classification: {
        intent: "find-observations",
        confidence: 0.69,
        needsClarification: false,
        cues: {
          species: ["chanterelle"],
          habitat: ["spruce", "wet"],
          region: ["helsinki"],
          season: [],
        },
        missing: [],
      },
      confidenceBand: "medium",
      provenance: {
        source: "deterministic-fallback",
        provider: null,
        reason: "no-model-provider",
      },
      workflow: {
        name: "intent-classification",
        state: "completed",
      },
    });

    expect(cards).toHaveLength(3);
    expect(cards[0]).toEqual(
      expect.objectContaining({
        kind: "observation",
        title: "Autumn chanterelle cluster",
      }),
    );
    expect(cards[0].evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Species overlap", detail: "chanterelle" }),
        expect.objectContaining({ label: "Habitat fit", detail: expect.stringContaining("spruce") }),
      ]),
    );
  });

  it("returns a draft field-note card for create-field-note intents", () => {
    const cards = buildForagingCandidateCards({
      input: "Create a field note about chanterelles",
      classification: {
        intent: "create-field-note",
        confidence: 0.74,
        needsClarification: false,
        cues: {
          species: ["chanterelle"],
          habitat: [],
          region: [],
          season: [],
        },
        missing: ["region"],
      },
      confidenceBand: "medium",
      provenance: {
        source: "deterministic-fallback",
        provider: null,
        reason: "no-model-provider",
      },
      workflow: {
        name: "intent-classification",
        state: "completed",
      },
    });

    expect(cards[0]).toEqual(
      expect.objectContaining({
        kind: "field-note",
        title: "Field note scaffold",
      }),
    );
    expect(cards[0].evidence).toEqual(expect.arrayContaining([expect.objectContaining({ label: "Still missing", detail: "region" })]));
  });

  it("returns no cards while clarification is still pending", () => {
    expect(
      buildForagingCandidateCards({
        input: "Help",
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
        workflow: {
          name: "intent-classification",
          state: "awaiting_clarification",
          workflowId: "workflow-123",
          question: "question",
          options: ["find-observations"],
        },
      }),
    ).toEqual([]);
  });
});
