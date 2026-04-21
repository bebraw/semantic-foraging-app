import { describe, expect, it } from "vitest";
import { buildMapViewModel } from "./map-agent";
import { buildSemanticPresentationModel } from "./presentation-agent";
import type { ForagingIntentSubmissionState } from "../contracts/app-state";
import type { ForagingCandidateCard } from "../contracts/foraging-knowledge";

describe("buildSemanticPresentationModel", () => {
  it("prefers map when a nearby query has mappable results", () => {
    const candidateCards = createCandidateCards();

    const presentation = buildSemanticPresentationModel({
      rawInput: "Nearby berry spots",
      latestSubmission: createSubmission("Nearby berry spots", "find-observations", {
        species: ["berry"],
        habitat: [],
        region: [],
        season: [],
      }),
      candidateCards,
      savedArtifacts: [],
      recentSessions: [],
      mapView: buildMapViewModel(candidateCards, []),
    });

    expect(presentation.primaryKind).toBe("map");
    expect(presentation.components[0]).toEqual(expect.objectContaining({ kind: "map", selected: true }));
  });

  it("respects an explicit table request", () => {
    const candidateCards = createCandidateCards();

    const presentation = buildSemanticPresentationModel({
      rawInput: "Give me a table of the most prevalent mushrooms in Finland at the lake district.",
      latestSubmission: createSubmission(
        "Give me a table of the most prevalent mushrooms in Finland at the lake district.",
        "find-observations",
        {
          species: ["mushroom"],
          habitat: [],
          region: ["finland", "lake district"],
          season: [],
        },
      ),
      candidateCards,
      savedArtifacts: [],
      recentSessions: [],
      mapView: buildMapViewModel(candidateCards, []),
    });

    expect(presentation.primaryKind).toBe("table");
    expect(presentation.table?.rows.length).toBeGreaterThan(0);
    expect(presentation.signals).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "explicit-component", value: "table" })]));
  });

  it("falls back to prose for explanation-style queries", () => {
    const candidateCards = createCandidateCards();

    const presentation = buildSemanticPresentationModel({
      rawInput: "Explain why this trail is worth trying",
      latestSubmission: createSubmission("Explain why this trail is worth trying", "explain-suggestion", {
        species: ["chanterelle"],
        habitat: ["spruce"],
        region: ["helsinki"],
        season: ["autumn"],
      }),
      candidateCards,
      savedArtifacts: [],
      recentSessions: [],
      mapView: buildMapViewModel(candidateCards, []),
    });

    expect(presentation.primaryKind).toBe("prose");
    expect(presentation.prose[0]).toContain("lead");
  });

  it("surfaces clarification before any presentation choice", () => {
    const presentation = buildSemanticPresentationModel({
      rawInput: "Help",
      latestSubmission: {
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
          workflowId: "workflow-1",
          question: "What kind of foraging task does Help describe?",
          options: ["find-observations", "create-field-note"],
        },
      },
      candidateCards: [],
      savedArtifacts: [],
      recentSessions: [],
      mapView: buildMapViewModel([], []),
    });

    expect(presentation.primaryKind).toBe("clarification");
    expect(presentation.components[0]).toEqual(expect.objectContaining({ kind: "clarification", selected: true }));
  });
});

function createSubmission(
  input: string,
  intent: Exclude<ForagingIntentSubmissionState["classification"]["intent"], "clarify">,
  cues: ForagingIntentSubmissionState["classification"]["cues"],
): ForagingIntentSubmissionState {
  return {
    input,
    classification: {
      intent,
      confidence: 0.69,
      needsClarification: false,
      cues,
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
  };
}

function createCandidateCards(): ForagingCandidateCard[] {
  return [
    {
      id: "observation-bilberry-lakeshore-pocket",
      kind: "observation",
      title: "Bilberry lakeshore pocket",
      summary: "Bilberry patch near inland water.",
      statusLabel: "Observation lead",
      evidence: [
        {
          label: "Intent fit",
          detail: "Ranked for find-observations.",
        },
      ],
      spatialContext: {
        species: ["bilberry", "berry"],
        habitat: ["spruce", "lakeside"],
        region: ["lake district", "finland"],
        season: ["summer"],
      },
    },
    {
      id: "observation-lake-district-chanterelle-shelf",
      kind: "observation",
      title: "Lake-district chanterelle shelf",
      summary: "Chanterelle signal above the lakeshore.",
      statusLabel: "Observation cluster",
      evidence: [
        {
          label: "Intent fit",
          detail: "Ranked for find-observations.",
        },
      ],
      spatialContext: {
        species: ["chanterelle", "mushroom"],
        habitat: ["spruce", "wet", "lakeside"],
        region: ["lake district", "finland"],
        season: ["autumn"],
      },
    },
    {
      id: "trail-lake-district-porcini-run",
      kind: "trail",
      title: "Porcini shoreline run",
      summary: "Pine-to-birch transition with porcini notes.",
      statusLabel: "Trail fragment",
      evidence: [
        {
          label: "Intent fit",
          detail: "Ranked for find-observations.",
        },
      ],
      spatialContext: {
        species: ["porcini", "boletus", "mushroom"],
        habitat: ["pine", "birch", "lakeside"],
        region: ["lake district", "finland"],
        season: ["summer", "autumn"],
      },
    },
  ];
}
