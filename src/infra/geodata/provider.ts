import type { SpatialContext } from "../../domain/contracts/foraging-knowledge";
import type { MapBasemapModel, MapObservationPoint, MapOverlayModel } from "../../domain/contracts/map";

export type GeodataProvider = {
  getBasemap(): MapBasemapModel;
  loadObservationOverlay(cues: SpatialContext): Promise<MapOverlayModel>;
};

export type GeodataEnv = {
  MAP_BASEMAP_PROVIDER?: string;
  NLS_API_KEY?: string;
  FINBIF_ACCESS_TOKEN?: string;
};

type FetchLike = typeof fetch;

const supportedSpeciesTaxa: Record<string, { taxonId: string; label: string }> = {
  chanterelle: {
    taxonId: "MX.205511",
    label: "Cantharellus cibarius",
  },
  porcini: {
    taxonId: "MX.72563",
    label: "Boletus edulis",
  },
  trumpet: {
    taxonId: "MX.205598",
    label: "Craterellus cornucopioides",
  },
  morel: {
    taxonId: "MX.236886",
    label: "Morchella",
  },
};

export function createGeodataProvider(env: GeodataEnv = {}, fetcher: FetchLike = fetch): GeodataProvider {
  return {
    getBasemap() {
      const basemapProvider = resolveBasemapProvider(env);

      if (basemapProvider === "nls-wmts") {
        return createNlsBasemap(env.NLS_API_KEY);
      }

      return createOsmBasemap();
    },

    async loadObservationOverlay(cues) {
      const speciesEntry = resolveSpecies(cues);

      if (!speciesEntry) {
        return {
          id: "finbif-occurrences",
          label: "FinBIF observations",
          provider: "finbif",
          attribution: "Observation data © Finnish Biodiversity Information Facility",
          status: "disabled",
          note: "Map overlays activate when the current cues include a supported species.",
          points: [],
        };
      }

      if (!env.FINBIF_ACCESS_TOKEN) {
        return {
          id: "finbif-occurrences",
          label: "FinBIF observations",
          provider: "finbif",
          attribution: "Observation data © Finnish Biodiversity Information Facility",
          status: "disabled",
          note: `Add FINBIF_ACCESS_TOKEN to load public ${speciesEntry.label} occurrences from FinBIF.`,
          points: [],
        };
      }

      try {
        const response = await fetcher(buildFinbifOccurrenceUrl(speciesEntry.taxonId), {
          headers: {
            authorization: `Bearer ${env.FINBIF_ACCESS_TOKEN}`,
            accept: "application/geo+json, application/json",
          },
        });

        if (!response.ok) {
          return createUnavailableOverlay(`FinBIF responded with HTTP ${response.status}.`);
        }

        const payload = await response.json();
        const points = parseFinbifPoints(payload, speciesEntry.label);

        return {
          id: "finbif-occurrences",
          label: "FinBIF observations",
          provider: "finbif",
          attribution: "Observation data © Finnish Biodiversity Information Facility",
          status: "ready",
          note:
            points.length > 0
              ? `Loaded ${points.length} public ${speciesEntry.label} occurrences from FinBIF.`
              : `FinBIF returned no public ${speciesEntry.label} occurrences for the current preview query.`,
          points,
        };
      } catch {
        return createUnavailableOverlay("FinBIF overlay could not be loaded, so the map is showing lead geometry only.");
      }
    },
  };
}

function resolveBasemapProvider(env: GeodataEnv): MapBasemapModel["provider"] {
  return env.MAP_BASEMAP_PROVIDER === "nls-wmts" ? "nls-wmts" : "osm-raster";
}

function createOsmBasemap(): MapBasemapModel {
  return {
    provider: "osm-raster",
    label: "OpenStreetMap standard tiles",
    attribution: "© OpenStreetMap contributors",
    available: true,
    note: "OpenStreetMap is the default interactive basemap. Set MAP_BASEMAP_PROVIDER=nls-wmts with NLS_API_KEY when you want the Finnish topographic layer instead.",
    tileTemplateUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    minZoom: 0,
    maxZoom: 19,
    externalUrl: "https://www.openstreetmap.org",
  };
}

function createNlsBasemap(apiKey?: string): MapBasemapModel {
  if (!apiKey) {
    return {
      provider: "nls-wmts",
      label: "National Land Survey topographic map",
      attribution: "Map data © National Land Survey of Finland CC BY 4.0",
      available: false,
      note: "Add NLS_API_KEY to enable National Land Survey WMTS tiles when MAP_BASEMAP_PROVIDER=nls-wmts.",
      minZoom: 0,
      maxZoom: 16,
      externalUrl: "https://www.maanmittauslaitos.fi/en/e-services/mapsite",
    };
  }

  return {
    provider: "nls-wmts",
    label: "National Land Survey topographic map",
    attribution: "Map data © National Land Survey of Finland CC BY 4.0",
    available: true,
    note: "NLS WMTS tiles are configured for browser enhancement.",
    tileTemplateUrl: buildNlsTileTemplate(apiKey),
    minZoom: 0,
    maxZoom: 16,
    externalUrl: "https://www.maanmittauslaitos.fi/en/e-services/mapsite",
  };
}

function buildNlsTileTemplate(apiKey: string): string {
  const params = [
    "service=WMTS",
    "request=GetTile",
    "version=1.0.0",
    "layer=maastokartta",
    "style=default",
    "format=image/png",
    "TileMatrixSet=WGS84_Pseudo-Mercator",
    "TileMatrix={z}",
    "TileRow={y}",
    "TileCol={x}",
    `api-key=${encodeURIComponent(apiKey)}`,
  ];

  return `https://avoin-karttakuva.maanmittauslaitos.fi/avoin/wmts?${params.join("&")}`;
}

function buildFinbifOccurrenceUrl(taxonId: string): string {
  const url = new URL("https://api.laji.fi/v0/warehouse/query/unit/list");

  url.searchParams.set("taxonId", taxonId);
  url.searchParams.set("format", "geojson");
  url.searchParams.set("featureType", "CENTER_POINT");
  url.searchParams.set("crs", "WGS84");
  url.searchParams.set("pageSize", "40");
  url.searchParams.set("page", "1");
  url.searchParams.set("time", "2020-01-01/");
  url.searchParams.set(
    "selected",
    [
      "document.documentId",
      "unit.linkings.taxon.scientificName",
      "unit.taxonVerbatim",
      "gathering.eventDate",
      "gathering.interpretations.coordinateAccuracy",
    ].join(","),
  );

  return url.toString();
}

function resolveSpecies(cues: SpatialContext): { taxonId: string; label: string } | null {
  for (const species of cues.species) {
    const entry = supportedSpeciesTaxa[species.toLowerCase()];

    if (entry) {
      return entry;
    }
  }

  return null;
}

function parseFinbifPoints(payload: unknown, fallbackLabel: string): MapObservationPoint[] {
  if (!payload || typeof payload !== "object" || !("features" in payload) || !Array.isArray(payload.features)) {
    return [];
  }

  return payload.features
    .map((feature, index) => parseFinbifPoint(feature, fallbackLabel, index))
    .filter((point): point is MapObservationPoint => point !== null);
}

function parseFinbifPoint(feature: unknown, fallbackLabel: string, index: number): MapObservationPoint | null {
  if (!feature || typeof feature !== "object") {
    return null;
  }

  const geometry = "geometry" in feature ? feature.geometry : null;
  const properties = "properties" in feature && feature.properties && typeof feature.properties === "object" ? feature.properties : {};

  if (!geometry || typeof geometry !== "object" || !("type" in geometry) || geometry.type !== "Point") {
    return null;
  }

  if (!("coordinates" in geometry) || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) {
    return null;
  }

  const [longitude, latitude] = geometry.coordinates;

  if (typeof longitude !== "number" || typeof latitude !== "number") {
    return null;
  }

  const scientificName = readStringProperty(properties, "unit.linkings.taxon.scientificName");
  const taxonVerbatim = readStringProperty(properties, "unit.taxonVerbatim");
  const recordedAt = readStringProperty(properties, "gathering.eventDate");
  const coordinateAccuracy = readStringProperty(properties, "gathering.interpretations.coordinateAccuracy");
  const documentId = readStringProperty(properties, "document.documentId") ?? `finbif-${index}`;
  const label = scientificName ?? taxonVerbatim ?? fallbackLabel;
  const summary = recordedAt
    ? `Observed ${recordedAt}${coordinateAccuracy ? ` with ${coordinateAccuracy} m coordinate accuracy.` : "."}`
    : "Public occurrence returned by FinBIF.";

  return {
    id: documentId,
    label,
    summary,
    recordedAt,
    point: {
      longitude,
      latitude,
    },
  };
}

function readStringProperty(properties: object, key: string): string | undefined {
  const value = key in properties ? Reflect.get(properties, key) : undefined;

  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function createUnavailableOverlay(note: string): MapOverlayModel {
  return {
    id: "finbif-occurrences",
    label: "FinBIF observations",
    provider: "finbif",
    attribution: "Observation data © Finnish Biodiversity Information Facility",
    status: "unavailable",
    note,
    points: [],
  };
}
