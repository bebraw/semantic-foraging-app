export type GeoPoint = {
  longitude: number;
  latitude: number;
};

export type GeoBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type MapGeometry =
  | {
      kind: "point";
      point: GeoPoint;
      accuracyMeters?: number;
    }
  | {
      kind: "area";
      center: GeoPoint;
      ring: GeoPoint[];
    }
  | {
      kind: "trail";
      points: [GeoPoint, GeoPoint, GeoPoint];
    };

export type MapFeature = {
  id: string;
  label: string;
  kind: "observation" | "field-note" | "patch" | "trail" | "session";
  summary: string;
  evidenceSummary: string;
  sourceSection: "candidate-leads" | "recent-sessions";
  coordinateSource: "region-anchor" | "session-anchor";
  geometry: MapGeometry;
};

export type MapObservationPoint = {
  id: string;
  label: string;
  summary: string;
  recordedAt?: string;
  point: GeoPoint;
};

export type MapOverlayModel = {
  id: string;
  label: string;
  provider: "finbif";
  attribution: string;
  status: "ready" | "disabled" | "unavailable";
  note: string;
  points: MapObservationPoint[];
};

export type MapBasemapModel = {
  provider: "osm-raster" | "nls-wmts";
  label: string;
  attribution: string;
  available: boolean;
  note: string;
  tileTemplateUrl?: string;
  minZoom: number;
  maxZoom: number;
  externalUrl: string;
};

export type MapViewport = {
  width: number;
  height: number;
  frameLabel: string;
  center: GeoPoint;
  bounds: GeoBounds;
  zoom: number;
};

export type MapViewModel = {
  title: string;
  description: string;
  emptyState: string;
  legendTitle: string;
  basemap: MapBasemapModel;
  viewport: MapViewport;
  features: MapFeature[];
  overlays: MapOverlayModel[];
};
