import { describe, expect, it } from "vitest";
import { createArtifactWorkbenchSeed, createStoredForagingArtifact } from "./artifact-agent";

describe("createStoredForagingArtifact", () => {
  it("maps field-note candidates into stored artifacts", () => {
    const artifact = createStoredForagingArtifact(
      {
        id: "field-note-scaffold",
        kind: "field-note",
        title: "Field note scaffold",
        summary: "A starter note seeded from the current request.",
        statusLabel: "Draft note",
        evidence: [
          {
            label: "Intent fit",
            detail: "The request was classified as create-field-note.",
          },
        ],
        spatialContext: {
          species: ["chanterelle"],
          habitat: ["spruce"],
          region: ["helsinki"],
          season: ["autumn"],
        },
      },
      "create-field-note",
      "2026-04-19T12:00:00.000Z",
    );

    expect(artifact).toEqual({
      artifactId: expect.stringMatching(/^field-note-/),
      sourceCardId: "field-note-scaffold",
      kind: "field-note",
      title: "Field note scaffold",
      summary: "A starter note seeded from the current request.",
      sourceIntent: "create-field-note",
      cues: {
        species: ["chanterelle"],
        habitat: ["spruce"],
        region: ["helsinki"],
        season: ["autumn"],
      },
      evidence: [
        {
          label: "Intent fit",
          detail: "The request was classified as create-field-note.",
        },
      ],
      spatialContext: {
        species: ["chanterelle"],
        habitat: ["spruce"],
        region: ["helsinki"],
        season: ["autumn"],
      },
      savedAt: "2026-04-19T12:00:00.000Z",
      updatedAt: "2026-04-19T12:00:00.000Z",
    });
  });

  it("maps patch candidates into patch-inspection artifacts", () => {
    const artifact = createStoredForagingArtifact(
      {
        id: "patch-mossy-spruce-hollow",
        kind: "patch",
        title: "Mossy spruce hollow",
        summary: "A compact patch with repeated chanterelle and trumpet signals.",
        statusLabel: "Patch candidate",
        evidence: [],
        spatialContext: {
          species: ["chanterelle"],
          habitat: ["spruce", "wet"],
          region: ["helsinki"],
          season: ["autumn"],
        },
      },
      "inspect-patch",
      "2026-04-19T12:00:00.000Z",
    );

    expect(artifact).toEqual(
      expect.objectContaining({
        kind: "patch-inspection",
        sourceCardId: "patch-mossy-spruce-hollow",
        sourceIntent: "inspect-patch",
      }),
    );
  });

  it("rejects unsupported candidate kinds", () => {
    expect(
      createStoredForagingArtifact(
        {
          id: "observation-autumn-chanterelle-cluster",
          kind: "observation",
          title: "Autumn chanterelle cluster",
          summary: "Observation lead.",
          statusLabel: "Observation cluster",
          evidence: [],
          spatialContext: {
            species: ["chanterelle"],
            habitat: ["spruce"],
            region: ["helsinki"],
            season: ["autumn"],
          },
        },
        "find-observations",
      ),
    ).toBeNull();
  });

  it("creates a workbench seed from a saved artifact", () => {
    const seed = createArtifactWorkbenchSeed({
      artifactId: "trail-1",
      sourceCardId: "trail-card-1",
      kind: "trail",
      title: "Saved chanterelle trail",
      summary: "A saved trail connecting damp spruce pockets and recent chanterelle signals.",
      sourceIntent: "explain-suggestion",
      cues: {
        species: ["chanterelle"],
        habitat: ["spruce", "wet"],
        region: ["helsinki"],
        season: ["autumn"],
      },
      evidence: [
        {
          label: "Intent fit",
          detail: "Ranked for explain-suggestion.",
        },
      ],
      spatialContext: {
        species: ["chanterelle"],
        habitat: ["spruce", "wet"],
        region: ["helsinki"],
        season: ["autumn"],
      },
      savedAt: "2026-04-19T12:00:00.000Z",
      updatedAt: "2026-04-19T12:00:00.000Z",
    });

    expect(seed).toEqual({
      rawInput: "Saved chanterelle trail",
      title: "Saved chanterelle trail",
      factsText:
        "Summary: A saved trail connecting damp spruce pockets and recent chanterelle signals.\nIntent fit: Ranked for explain-suggestion.\nDetected cues: species: chanterelle | habitat: spruce, wet | region: helsinki | season: autumn",
    });
  });
});
