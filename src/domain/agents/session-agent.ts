import type { ConfidenceBand } from "../policies/confidence";
import type { StoredForagingSession } from "../contracts/session";
import type { ClassifiedIntent } from "./intent-agent";

export function createStoredForagingSession(
  input: string,
  classification: ClassifiedIntent,
  confidenceBand: ConfidenceBand,
  savedAt: string = new Date().toISOString(),
): StoredForagingSession | null {
  if (classification.intent === "clarify") {
    return null;
  }

  return {
    sessionId: createSessionId(),
    input,
    title: buildSessionTitle(input, classification.intent),
    summary: buildSessionSummary(input, classification),
    sourceIntent: classification.intent,
    cues: classification.cues,
    savedAt,
  };
}

function buildSessionTitle(input: string, intent: StoredForagingSession["sourceIntent"]): string {
  const compactInput = input.trim().replace(/\s+/g, " ");

  if (compactInput.length <= 72) {
    return compactInput;
  }

  return `${compactInput.slice(0, 69)}...`;
}

function buildSessionSummary(input: string, classification: ClassifiedIntent): string {
  const segments = [
    `Intent: ${classification.intent}`,
    summarizeCueGroup("species", classification.cues.species),
    summarizeCueGroup("habitat", classification.cues.habitat),
    summarizeCueGroup("region", classification.cues.region),
    summarizeCueGroup("season", classification.cues.season),
    `Confidence: ${classification.confidence.toFixed(2)}`,
  ].filter(Boolean);

  return segments.join(" | ") || input;
}

function summarizeCueGroup(label: string, values: string[]): string {
  if (values.length === 0) {
    return "";
  }

  return `${label}: ${values.join(", ")}`;
}

function createSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
