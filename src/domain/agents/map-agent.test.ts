import { describe, expect, it } from "vitest";
import { buildMapViewModel } from "./map-agent";

describe("buildMapViewModel", () => {
  it("projects candidate cards and recent sessions into typed geospatial map features", () => {
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
      {
        basemap: {
          provider: "nls-wmts",
          label: "National Land Survey topographic map",
          attribution: "Map data © National Land Survey of Finland CC BY 4.0",
          available: true,
          note: "NLS WMTS tiles are configured for browser enhancement.",
          tileTemplateUrl: "https://example.com/{z}/{y}/{x}.png",
          minZoom: 0,
          maxZoom: 16,
          externalUrl: "https://www.maanmittauslaitos.fi/en/e-services/mapsite",
        },
        overlay: {
          id: "finbif-occurrences",
          label: "FinBIF observations",
          provider: "finbif",
          attribution: "Observation data © Finnish Biodiversity Information Facility",
          status: "ready",
          note: "Loaded 1 public occurrence.",
          points: [
            {
              id: "obs-1",
              label: "Cantharellus cibarius",
              summary: "Observed 2025-09-01.",
              point: {
                longitude: 24.95,
                latitude: 60.18,
              },
            },
          ],
        },
      },
    );

    expect(mapView).toEqual(
      expect.objectContaining({
        title: "Foraging map",
        locationControl: expect.objectContaining({
          actionLabel: "Use current location",
        }),
        basemap: expect.objectContaining({
          provider: "nls-wmts",
          available: true,
        }),
        overlays: [
          expect.objectContaining({
            id: "finbif-occurrences",
            status: "ready",
          }),
        ],
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
        viewport: expect.objectContaining({
          center: expect.objectContaining({
            longitude: expect.any(Number),
            latitude: expect.any(Number),
          }),
          bounds: expect.objectContaining({
            west: expect.any(Number),
            east: expect.any(Number),
            south: expect.any(Number),
            north: expect.any(Number),
          }),
        }),
      }),
    );
  });
});
