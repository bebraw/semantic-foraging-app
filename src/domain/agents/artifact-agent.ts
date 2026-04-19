import type { StoredForagingArtifact } from "../contracts/artifact";
import type { ForagingCandidateCard } from "../contracts/foraging-knowledge";
import type { ForagingIntent } from "./intent-agent";

export function createStoredForagingArtifact(
  card: ForagingCandidateCard,
  sourceIntent: Exclude<ForagingIntent, "clarify">,
  savedAt: string = new Date().toISOString(),
): StoredForagingArtifact | null {
  const kind = mapCandidateKind(card.kind);

  if (!kind) {
    return null;
  }

  return {
    artifactId: createArtifactId(kind),
    sourceCardId: card.id,
    kind,
    title: card.title,
    summary: card.summary,
    sourceIntent,
    cues: card.spatialContext,
    evidence: card.evidence,
    spatialContext: card.spatialContext,
    savedAt,
  };
}

function mapCandidateKind(cardKind: ForagingCandidateCard["kind"]): StoredForagingArtifact["kind"] | null {
  switch (cardKind) {
    case "field-note":
      return "field-note";
    case "trail":
      return "trail";
    case "patch":
      return "patch-inspection";
    case "observation":
    case "session":
      return null;
  }
}

function createArtifactId(kind: StoredForagingArtifact["kind"]): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${kind}-${crypto.randomUUID()}`;
  }

  return `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
