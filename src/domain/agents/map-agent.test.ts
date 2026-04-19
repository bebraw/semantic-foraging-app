import { describe, expect, it } from "vitest";
import { buildMapViewModel } from "./map-agent";

describe("buildMapViewModel", () => {
  it("projects candidate cards and recent sessions into typed map features", () => {
    const mapView = buildMapViewModel(
      [
        {
          id: "candidate-1",
          kind: "patch",
          title: "Mossy spruce hollow",
          summary: "Patch summary",
          statusLabel: "Patch candidate",
          evidence: [
            {
              label: "Habitat fit",
              detail: "spruce, wet",
            },
          ],
          spatialContext: {
            species: ["chanterelle"],
            habitat: ["spruce", "wet"],
            region: ["helsinki"],
            season: ["autumn"],
          },
        },
      ],
      [
        {
          sessionId: "session-1",
          input: "Find chanterelles",
          title: "Find chanterelles",
          summary: "Intent: find-observations",
          sourceIntent: "find-observations",
          cues: {
            species: ["chanterelle"],
            habitat: ["spruce"],
            region: ["helsinki"],
            season: [],
          },
          savedAt: "2026-04-19T12:00:00.000Z",
        },
      ],
    );

    expect(mapView).toEqual(
      expect.objectContaining({
        title: "Foraging map",
        features: [
          expect.objectContaining({
            id: "candidate-candidate-1",
            kind: "patch",
            sourceSection: "candidate-leads",
            geometry: expect.objectContaining({ kind: "area" }),
          }),
          expect.objectContaining({
            id: "session-session-1",
            kind: "session",
            sourceSection: "recent-sessions",
            geometry: expect.objectContaining({ kind: "point" }),
          }),
        ],
      }),
    );
  });
});
