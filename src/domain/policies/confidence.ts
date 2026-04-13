export type ConfidenceBand = "low" | "medium" | "high";

export function describeConfidence(confidence: number): ConfidenceBand {
  if (confidence >= 0.8) {
    return "high";
  }

  if (confidence >= 0.5) {
    return "medium";
  }

  return "low";
}
