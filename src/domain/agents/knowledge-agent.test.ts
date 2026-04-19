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
        id: "observation-autumn-chanterelle-cluster",
        kind: "observation",
        title: "Autumn chanterelle cluster",
        spatialContext: expect.objectContaining({
          region: ["helsinki", "uusimaa"],
        }),
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
        id: "field-note-scaffold",
        kind: "field-note",
        title: "Field note scaffold",
        spatialContext: expect.objectContaining({
          species: ["chanterelle"],
        }),
      }),
    );
    expect(cards[0].evidence).toEqual(expect.arrayContaining([expect.objectContaining({ label: "Still missing", detail: "region" })]));
  });

  it("reuses saved artifacts as ranked candidates for explanation intents", () => {
    const cards = buildForagingCandidateCards(
      {
        input: "Explain why this chanterelle trail is worth trying in Helsinki",
        classification: {
          intent: "explain-suggestion",
          confidence: 0.76,
          needsClarification: false,
          cues: {
            species: ["chanterelle"],
            habitat: ["spruce"],
            region: ["helsinki"],
            season: ["autumn"],
          },
          missing: [],
        },
        confidenceBand: "high",
        provenance: {
          source: "deterministic-fallback",
          provider: null,
          reason: "no-model-provider",
        },
        workflow: {
          name: "intent-classification",
          state: "completed",
        },
      },
      [],
      [
        {
          artifactId: "trail-1",
          sourceCardId: "trail-card-1",
          kind: "trail",
          title: "Saved chanterelle trail",
          summary: "A saved trail through wet spruce cover near Helsinki.",
          sourceIntent: "explain-suggestion",
          cues: {
            species: ["chanterelle"],
            habitat: ["spruce"],
            region: ["helsinki"],
            season: ["autumn"],
          },
          evidence: [],
          spatialContext: {
            species: ["chanterelle"],
            habitat: ["spruce"],
            region: ["helsinki"],
            season: ["autumn"],
          },
          savedAt: "2026-04-19T12:00:00.000Z",
        },
      ],
    );

    expect(cards[0]).toEqual(
      expect.objectContaining({
        id: "saved-artifact-trail-1",
        kind: "trail",
        title: "Saved chanterelle trail",
        statusLabel: "Saved trail",
      }),
    );
    expect(cards[0].evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Saved artifact", detail: expect.stringContaining("explain-suggestion") }),
        expect.objectContaining({ label: "Species overlap", detail: "chanterelle" }),
        expect.objectContaining({ label: "Region fit", detail: "helsinki" }),
      ]),
    );
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

  it("uses persisted recent sessions for resume-session intents when available", () => {
    const cards = buildForagingCandidateCards(
      {
        input: "Resume my chanterelle session",
        classification: {
          intent: "resume-session",
          confidence: 0.79,
          needsClarification: false,
          cues: {
            species: ["chanterelle"],
            habitat: ["spruce", "wet"],
            region: ["helsinki"],
            season: ["autumn"],
          },
          missing: [],
        },
        confidenceBand: "high",
        provenance: {
          source: "deterministic-fallback",
          provider: null,
          reason: "no-model-provider",
        },
        workflow: {
          name: "intent-classification",
          state: "completed",
        },
      },
      [
        {
          sessionId: "session-1",
          input: "Find chanterelles",
          title: "Find chanterelles",
          summary: "Intent: find-observations | species: chanterelle | habitat: spruce, wet | region: helsinki",
          sourceIntent: "find-observations",
          cues: {
            species: ["chanterelle"],
            habitat: ["spruce", "wet"],
            region: ["helsinki"],
            season: ["autumn"],
          },
          savedAt: "2026-04-19T12:00:00.000Z",
        },
      ],
    );

    expect(cards).toEqual([
      expect.objectContaining({
        id: "recent-session-session-1",
        kind: "session",
        title: "Find chanterelles",
        statusLabel: "Recent session",
        spatialContext: expect.objectContaining({
          region: ["helsinki"],
        }),
      }),
    ]);
    expect(cards[0].evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Recent session", detail: expect.stringContaining("find-observations") }),
        expect.objectContaining({ label: "Species overlap", detail: "chanterelle" }),
      ]),
    );
  });
});
