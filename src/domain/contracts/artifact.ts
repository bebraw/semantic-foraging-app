import type { ForagingIntent, ForagingCues } from "../agents/intent-agent";
import type { EvidenceNote, SpatialContext } from "./foraging-knowledge";

export type SavedArtifactKind = "field-note" | "trail" | "patch-inspection";

export type ArtifactRevision = {
  kind: "saved" | "refined" | "restored";
  title: string;
  summary: string;
  notes?: string;
  recordedAt: string;
};

export type StoredForagingArtifact = {
  artifactId: string;
  sourceCardId: string;
  kind: SavedArtifactKind;
  title: string;
  summary: string;
  notes?: string;
  sourceIntent: Exclude<ForagingIntent, "clarify">;
  cues: ForagingCues;
  evidence: EvidenceNote[];
  spatialContext: SpatialContext;
  savedAt: string;
  updatedAt?: string;
  revisions: ArtifactRevision[];
};
