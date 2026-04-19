import type { ForagingCandidateCard } from "../contracts/foraging-knowledge";
import type { MapFeature, MapPoint, MapViewModel } from "../contracts/map";
import type { StoredForagingSession } from "../contracts/session";

const regionAnchors: Record<string, MapPoint> = {
  helsinki: { x: 74, y: 62 },
  uusimaa: { x: 69, y: 58 },
  "north karelia": { x: 48, y: 40 },
  lapland: { x: 42, y: 16 },
  turku: { x: 58, y: 66 },
  ostrobothnia: { x: 34, y: 42 },
};

export function buildMapViewModel(candidateCards: ForagingCandidateCard[], recentSessions: StoredForagingSession[]): MapViewModel {
  const features = [...candidateCards.map(createCandidateFeature), ...recentSessions.slice(0, 4).map(createRecentSessionFeature)];

  return {
    title: "Foraging map",
    description:
      "This typed map fragment projects current leads and saved sessions into a shared terrain frame so spatial cues are visible before adding a heavier client-side map stack.",
    emptyState: "Run a completed foraging intent to project leads into the map frame.",
    legendTitle: "Mapped leads",
    viewport: {
      width: 640,
      height: 360,
      frameLabel: "Deterministic terrain frame",
    },
    features,
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
    geometry: {
      kind: "point",
      point: deriveOffsetPoint(session.sessionId, resolveAnchor(session.cues.region)),
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
        radius: 18,
      };
    case "trail":
      return {
        kind: "trail",
        points: [nudgePoint(anchor, -18, 12), anchor, nudgePoint(anchor, 16, -14)],
      };
    case "observation":
    case "field-note":
    case "session":
      return {
        kind: "point",
        point: anchor,
      };
  }
}

function resolveAnchor(regions: string[]): MapPoint {
  for (const region of regions) {
    const anchor = regionAnchors[region];

    if (anchor) {
      return anchor;
    }
  }

  return { x: 52, y: 52 };
}

function deriveOffsetPoint(seed: string, anchor: MapPoint): MapPoint {
  const hash = hashSeed(seed);

  return {
    x: clamp(anchor.x + ((hash % 17) - 8), 8, 92),
    y: clamp(anchor.y + (((Math.floor(hash / 17) % 17) - 8) as number), 8, 92),
  };
}

function nudgePoint(point: MapPoint, deltaX: number, deltaY: number): MapPoint {
  return {
    x: clamp(point.x + deltaX, 6, 94),
    y: clamp(point.y + deltaY, 6, 94),
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
