import type { ForagingIntent, ForagingCues } from "../agents/intent-agent";
import type { EvidenceNote, SpatialContext } from "./foraging-knowledge";

export type SavedArtifactKind = "field-note" | "trail" | "patch-inspection";

export type StoredForagingArtifact = {
  artifactId: string;
  sourceCardId: string;
  kind: SavedArtifactKind;
  title: string;
  summary: string;
  sourceIntent: Exclude<ForagingIntent, "clarify">;
  cues: ForagingCues;
  evidence: EvidenceNote[];
  spatialContext: SpatialContext;
  savedAt: string;
};
