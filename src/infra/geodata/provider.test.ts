import { describe, expect, it, vi } from "vitest";
import { createGeodataProvider } from "./provider";

describe("createGeodataProvider", () => {
  it("returns a disabled NLS basemap when no API key is configured", () => {
    const provider = createGeodataProvider();

    expect(provider.getBasemap()).toEqual(
      expect.objectContaining({
        provider: "nls-wmts",
        available: false,
      }),
    );
  });

  it("builds a configured NLS tile template when an API key is present", () => {
    const provider = createGeodataProvider({
      NLS_API_KEY: "test-key",
    });

    expect(provider.getBasemap()).toEqual(
      expect.objectContaining({
        available: true,
        tileTemplateUrl: expect.stringContaining("api-key=test-key"),
      }),
    );
  });

  it("returns a ready FinBIF overlay when the provider returns GeoJSON points", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [24.9384, 60.1699],
              },
              properties: {
                "document.documentId": "obs-1",
                "unit.linkings.taxon.scientificName": "Cantharellus cibarius",
                "gathering.eventDate": "2025-09-01",
              },
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/geo+json",
          },
        },
      ),
    );

    const provider = createGeodataProvider(
      {
        FINBIF_ACCESS_TOKEN: "token",
      },
      fetcher,
    );

    const overlay = await provider.loadObservationOverlay({
      species: ["chanterelle"],
      habitat: ["spruce"],
      region: ["helsinki"],
      season: ["autumn"],
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(overlay).toEqual(
      expect.objectContaining({
        status: "ready",
        points: [
          expect.objectContaining({
            id: "obs-1",
            label: "Cantharellus cibarius",
          }),
        ],
      }),
    );
  });

  it("keeps the overlay disabled when there is no supported species cue", async () => {
    const provider = createGeodataProvider({
      FINBIF_ACCESS_TOKEN: "token",
    });

    const overlay = await provider.loadObservationOverlay({
      species: ["blueberry"],
      habitat: [],
      region: [],
      season: [],
    });

    expect(overlay).toEqual(
      expect.objectContaining({
        status: "disabled",
        points: [],
      }),
    );
  });
});
