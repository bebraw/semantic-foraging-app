export type MapPoint = {
  x: number;
  y: number;
};

export type MapGeometry =
  | {
      kind: "point";
      point: MapPoint;
    }
  | {
      kind: "area";
      center: MapPoint;
      radius: number;
    }
  | {
      kind: "trail";
      points: [MapPoint, MapPoint, MapPoint];
    };

export type MapFeature = {
  id: string;
  label: string;
  kind: "observation" | "field-note" | "patch" | "trail" | "session";
  summary: string;
  evidenceSummary: string;
  sourceSection: "candidate-leads" | "recent-sessions";
  geometry: MapGeometry;
};

export type MapViewport = {
  width: number;
  height: number;
  frameLabel: string;
};

export type MapViewModel = {
  title: string;
  description: string;
  emptyState: string;
  legendTitle: string;
  viewport: MapViewport;
  features: MapFeature[];
};
