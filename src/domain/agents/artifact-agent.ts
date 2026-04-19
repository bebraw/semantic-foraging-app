import type { StoredForagingArtifact } from "../contracts/artifact";
import type { ForagingIntentSubmissionState } from "../contracts/app-state";
import type { ForagingCandidateCard } from "../contracts/foraging-knowledge";
import { describeConfidence } from "../policies/confidence";
import { deterministicProvenance } from "../policies/provenance";
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

export function createArtifactWorkbenchSeed(artifact: StoredForagingArtifact): {
  rawInput: string;
  title: string;
  factsText: string;
} {
  const factLines = [
    `Summary: ${artifact.summary}`,
    ...artifact.evidence.map((note) => `${note.label}: ${note.detail}`),
    formatArtifactCueFacts(artifact),
  ].filter(Boolean);

  return {
    rawInput: artifact.title,
    title: artifact.title,
    factsText: factLines.join("\n"),
  };
}

export function createArtifactIntentSubmission(artifact: StoredForagingArtifact): ForagingIntentSubmissionState {
  const confidence = 1;

  return {
    input: artifact.title,
    classification: {
      intent: artifact.sourceIntent,
      confidence,
      needsClarification: false,
      cues: artifact.cues,
      missing: [],
    },
    confidenceBand: describeConfidence(confidence),
    provenance: deterministicProvenance("artifact-reuse"),
    workflow: {
      name: "intent-classification",
      state: "completed",
    },
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

function formatArtifactCueFacts(artifact: StoredForagingArtifact): string {
  const segments = [
    formatCueSegment("species", artifact.cues.species),
    formatCueSegment("habitat", artifact.cues.habitat),
    formatCueSegment("region", artifact.cues.region),
    formatCueSegment("season", artifact.cues.season),
  ].filter(Boolean);

  return segments.length > 0 ? `Detected cues: ${segments.join(" | ")}` : "";
}

function formatCueSegment(label: string, values: string[]): string {
  if (values.length === 0) {
    return "";
  }

  return `${label}: ${values.join(", ")}`;
}
