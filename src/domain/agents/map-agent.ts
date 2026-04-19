import type { ForagingCandidateCard } from "../contracts/foraging-knowledge";
import type { GeoBounds, GeoPoint, MapBasemapModel, MapFeature, MapOverlayModel, MapViewModel } from "../contracts/map";
import type { StoredForagingSession } from "../contracts/session";

const regionAnchors: Record<string, GeoPoint> = {
  helsinki: { longitude: 24.9384, latitude: 60.1699 },
  uusimaa: { longitude: 25.0, latitude: 60.4 },
  "north karelia": { longitude: 29.7636, latitude: 62.601 },
  lapland: { longitude: 25.7294, latitude: 66.5039 },
  turku: { longitude: 22.2666, latitude: 60.4518 },
  ostrobothnia: { longitude: 21.6165, latitude: 63.0951 },
};

const finlandBounds: GeoBounds = {
  west: 19,
  south: 59,
  east: 32,
  north: 70.5,
};

export type MapGeodataInput = {
  basemap: MapBasemapModel;
  overlay: MapOverlayModel;
};

export function buildMapViewModel(
  candidateCards: ForagingCandidateCard[],
  recentSessions: StoredForagingSession[],
  geodata?: MapGeodataInput,
): MapViewModel {
  const features = [...candidateCards.map(createCandidateFeature), ...recentSessions.slice(0, 4).map(createRecentSessionFeature)];
  const bounds = computeViewportBounds(features, geodata?.overlay);

  return {
    title: "Foraging map",
    description:
      "This map projects current leads into a real geographic frame so the workbench can connect foraging cues with public Finnish map and occurrence data.",
    emptyState: "Run a completed foraging intent to project leads into a geographic preview.",
    legendTitle: "Mapped leads",
    basemap: geodata?.basemap ?? createFallbackBasemap(),
    viewport: {
      width: 640,
      height: 360,
      frameLabel: "Geographic preview of current leads",
      center: {
        longitude: (bounds.west + bounds.east) / 2,
        latitude: (bounds.south + bounds.north) / 2,
      },
      bounds,
      zoom: determineZoom(bounds),
    },
    features,
    overlays: geodata ? [geodata.overlay] : [],
  };
}

function createCandidateFeature(card: ForagingCandidateCard): MapFeature {
  return {
    id: `candidate-${card.id}`,
    label: card.title,
    kind: card.kind,
    summary: card.summary,
    evidenceSummary: card.evidence[0]?.detail ?? "Mapped from deterministic retrieval evidence.",
    sourceSection: "candidate-leads",
    coordinateSource: "region-anchor",
    geometry: createGeometry(card.id, card.kind, card.spatialContext.region),
  };
}

function createRecentSessionFeature(session: StoredForagingSession): MapFeature {
  return {
    id: `session-${session.sessionId}`,
    label: session.title,
    kind: "session",
    summary: session.summary,
    evidenceSummary: `Saved from ${session.sourceIntent} at ${session.savedAt}.`,
    sourceSection: "recent-sessions",
    coordinateSource: "session-anchor",
    geometry: {
      kind: "point",
      point: deriveOffsetPoint(session.sessionId, resolveAnchor(session.cues.region)),
      accuracyMeters: 4_000,
    },
  };
}

function createGeometry(id: string, kind: MapFeature["kind"], regions: string[]): MapFeature["geometry"] {
  const anchor = deriveOffsetPoint(id, resolveAnchor(regions));

  switch (kind) {
    case "patch":
      return {
        kind: "area",
        center: anchor,
        ring: [
          nudgePoint(anchor, -0.18, 0.12),
          nudgePoint(anchor, 0.2, 0.14),
          nudgePoint(anchor, 0.14, -0.16),
          nudgePoint(anchor, -0.16, -0.18),
          nudgePoint(anchor, -0.18, 0.12),
        ],
      };
    case "trail":
      return {
        kind: "trail",
        points: [nudgePoint(anchor, -0.35, -0.08), anchor, nudgePoint(anchor, 0.28, 0.18)],
      };
    case "observation":
    case "field-note":
    case "session":
      return {
        kind: "point",
        point: anchor,
        accuracyMeters: 1_500,
      };
  }
}

function resolveAnchor(regions: string[]): GeoPoint {
  for (const region of regions) {
    const anchor = regionAnchors[region];

    if (anchor) {
      return anchor;
    }
  }

  return {
    longitude: 25.0,
    latitude: 61.5,
  };
}

function deriveOffsetPoint(seed: string, anchor: GeoPoint): GeoPoint {
  const hash = hashSeed(seed);

  return {
    longitude: clamp(anchor.longitude + ((hash % 17) - 8) * 0.06, finlandBounds.west + 0.25, finlandBounds.east - 0.25),
    latitude: clamp(
      anchor.latitude + ((Math.floor(hash / 17) % 17) - 8) * 0.05,
      finlandBounds.south + 0.25,
      finlandBounds.north - 0.25,
    ),
  };
}

function nudgePoint(point: GeoPoint, longitudeOffset: number, latitudeOffset: number): GeoPoint {
  return {
    longitude: clamp(point.longitude + longitudeOffset, finlandBounds.west + 0.1, finlandBounds.east - 0.1),
    latitude: clamp(point.latitude + latitudeOffset, finlandBounds.south + 0.1, finlandBounds.north - 0.1),
  };
}

function computeViewportBounds(features: MapFeature[], overlay?: MapOverlayModel): GeoBounds {
  const points = [
    ...features.flatMap(collectGeometryPoints),
    ...(overlay?.status === "ready" ? overlay.points.map((point) => point.point) : []),
  ];

  if (points.length === 0) {
    return finlandBounds;
  }

  const west = Math.min(...points.map((point) => point.longitude));
  const east = Math.max(...points.map((point) => point.longitude));
  const south = Math.min(...points.map((point) => point.latitude));
  const north = Math.max(...points.map((point) => point.latitude));

  return {
    west: clamp(west - 0.55, finlandBounds.west, finlandBounds.east - 0.5),
    east: clamp(east + 0.55, finlandBounds.west + 0.5, finlandBounds.east),
    south: clamp(south - 0.4, finlandBounds.south, finlandBounds.north - 0.4),
    north: clamp(north + 0.4, finlandBounds.south + 0.4, finlandBounds.north),
  };
}

function collectGeometryPoints(feature: MapFeature): GeoPoint[] {
  switch (feature.geometry.kind) {
    case "point":
      return [feature.geometry.point];
    case "area":
      return feature.geometry.ring;
    case "trail":
      return feature.geometry.points;
  }
}

function determineZoom(bounds: GeoBounds): number {
  const longitudeSpan = bounds.east - bounds.west;

  if (longitudeSpan <= 1.5) {
    return 11;
  }

  if (longitudeSpan <= 3) {
    return 9;
  }

  if (longitudeSpan <= 6) {
    return 7;
  }

  return 5;
}

function createFallbackBasemap(): MapBasemapModel {
  return {
    provider: "nls-wmts",
    label: "National Land Survey topographic map",
    attribution: "Map data © National Land Survey of Finland CC BY 4.0",
    available: false,
    note: "The geographic fallback frame is active until a National Land Survey API key is configured.",
    minZoom: 0,
    maxZoom: 16,
    externalUrl: "https://www.maanmittauslaitos.fi/en/e-services/mapsite",
  };
}

function hashSeed(seed: string): number {
  let value = 0;

  for (const char of seed) {
    value = (value * 31 + char.charCodeAt(0)) % 10_000;
  }

  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
