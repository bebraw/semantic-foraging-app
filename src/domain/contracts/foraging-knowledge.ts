export type EvidenceNote = {
  label: string;
  detail: string;
};

export type SpatialContext = {
  species: string[];
  habitat: string[];
  region: string[];
  season: string[];
};

export type ForagingCandidateCard = {
  id: string;
  kind: "observation" | "field-note" | "patch" | "trail" | "session";
  title: string;
  summary: string;
  statusLabel: string;
  evidence: EvidenceNote[];
  spatialContext: SpatialContext;
};
