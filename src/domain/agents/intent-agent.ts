import { z } from "zod";
import type { ModelProvider } from "../../infra/llm/provider";
import { describeConfidence, type ConfidenceBand } from "../policies/confidence";
import { deterministicProvenance, modelProvenance, type DeterministicProvenanceReason, type Provenance } from "../policies/provenance";

const SupportedIntentSchema = z.enum([
  "find-observations",
  "create-field-note",
  "inspect-patch",
  "explain-suggestion",
  "resume-session",
  "clarify",
]);
const MissingContextSchema = z.enum(["artifact_scope", "species", "habitat", "region", "season"]);
const ForagingCuesSchema = z.object({
  species: z.array(z.string()),
  habitat: z.array(z.string()),
  region: z.array(z.string()),
  season: z.array(z.string()),
});
const IntentSchema = z.object({
  intent: SupportedIntentSchema,
  confidence: z.number().min(0).max(1),
  needsClarification: z.boolean(),
  cues: ForagingCuesSchema,
  missing: z.array(MissingContextSchema),
});

export type ClassifiedIntent = z.infer<typeof IntentSchema>;
export type ForagingIntent = z.infer<typeof SupportedIntentSchema>;
export type MissingContext = z.infer<typeof MissingContextSchema>;
export type ForagingCues = z.infer<typeof ForagingCuesSchema>;

export type IntentClassificationResult = {
  classification: ClassifiedIntent;
  confidenceBand: ConfidenceBand;
  provenance: Provenance;
};

export async function classifyIntent(provider: ModelProvider | null, rawInput: string): Promise<IntentClassificationResult> {
  if (!provider) {
    return finalizeDeterministicIntent(rawInput, "no-model-provider");
  }

  try {
    if (!(await provider.isAvailable())) {
      return finalizeDeterministicIntent(rawInput, "provider-unavailable");
    }
  } catch {
    return finalizeDeterministicIntent(rawInput, "provider-unavailable");
  }

  try {
    const result = await provider.completeJson<ClassifiedIntent>({
      schemaName: "intent_classification",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          intent: {
            type: "string",
            enum: ["find-observations", "create-field-note", "inspect-patch", "explain-suggestion", "resume-session", "clarify"],
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
          needsClarification: {
            type: "boolean",
          },
          cues: {
            type: "object",
            additionalProperties: false,
            properties: {
              species: {
                type: "array",
                items: { type: "string" },
              },
              habitat: {
                type: "array",
                items: { type: "string" },
              },
              region: {
                type: "array",
                items: { type: "string" },
              },
              season: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["species", "habitat", "region", "season"],
          },
          missing: {
            type: "array",
            items: {
              type: "string",
              enum: ["artifact_scope", "species", "habitat", "region", "season"],
            },
          },
        },
        required: ["intent", "confidence", "needsClarification", "cues", "missing"],
      },
      system:
        "Classify the user's request into one supported semantic-foraging intent. Extract any species, habitat, region, and season cues. Be conservative and request clarification when the goal or required search context is underspecified.",
      prompt: `User input: ${rawInput}`,
      temperature: 0,
      maxOutputTokens: 220,
    });

    const parsed = IntentSchema.safeParse(result);

    if (!parsed.success) {
      return finalizeDeterministicIntent(rawInput, "model-schema-failed");
    }

    return {
      classification: parsed.data,
      confidenceBand: describeConfidence(parsed.data.confidence),
      provenance: modelProvenance(provider.name),
    };
  } catch {
    return finalizeDeterministicIntent(rawInput, "model-inference-failed");
  }
}

function deterministicIntent(rawInput: string): ClassifiedIntent {
  const text = rawInput.toLowerCase().trim();
  const cues = extractForagingCues(text);

  if (text.includes("resume") || text.includes("continue") || text.includes("pick up") || text.includes("last session")) {
    return {
      intent: "resume-session",
      confidence: 0.79,
      needsClarification: false,
      cues,
      missing: [],
    };
  }

  if (text.includes("why") || text.includes("explain") || text.includes("because") || text.includes("suggest")) {
    return {
      intent: "explain-suggestion",
      confidence: 0.82,
      needsClarification: false,
      cues,
      missing: [],
    };
  }

  if (text.includes("create") || text.includes("add") || text.includes("log") || text.includes("record") || text.includes("field note")) {
    const missing = collectMissingContext("create-field-note", cues);

    return {
      intent: "create-field-note",
      confidence: 0.74,
      needsClarification: false,
      cues,
      missing,
    };
  }

  if (text.includes("patch") || text.includes("trail") || text.includes("stand") || text.includes("site")) {
    const missing = collectMissingContext("inspect-patch", cues);

    return {
      intent: "inspect-patch",
      confidence: 0.71,
      needsClarification: text.length < 15 && missing.length >= 2,
      cues,
      missing,
    };
  }

  if (
    text.includes("search") ||
    text.includes("find") ||
    text.includes("look up") ||
    text.includes("similar") ||
    text.includes("observation") ||
    text.includes("note") ||
    text.includes("where")
  ) {
    const missing = collectMissingContext("find-observations", cues);

    return {
      intent: "find-observations",
      confidence: 0.69,
      needsClarification: text.length < 15 && missing.length >= 2,
      cues,
      missing,
    };
  }

  if (text.length < 12 || text.includes("help") || text === "this" || text === "that") {
    return {
      intent: "clarify",
      confidence: 0.31,
      needsClarification: true,
      cues,
      missing: ["artifact_scope"],
    };
  }

  return {
    intent: "clarify",
    confidence: 0.42,
    needsClarification: true,
    cues,
    missing: ["artifact_scope"],
  };
}

function finalizeDeterministicIntent(rawInput: string, reason: DeterministicProvenanceReason): IntentClassificationResult {
  const classification = deterministicIntent(rawInput);

  return {
    classification,
    confidenceBand: describeConfidence(classification.confidence),
    provenance: deterministicProvenance(reason),
  };
}

function extractForagingCues(text: string): ForagingCues {
  return {
    species: collectKeywordMatches(text, ["chanterelle", "morel", "porcini", "boletus", "hedgehog", "trumpet"]),
    habitat: collectKeywordMatches(text, ["spruce", "pine", "birch", "mossy", "wet", "bog", "ridge", "old-growth", "clearing"]),
    region: collectKeywordMatches(text, ["lapland", "uusimaa", "helsinki", "turku", "north karelia", "ostrobothnia"]),
    season: collectKeywordMatches(text, ["spring", "summer", "autumn", "fall", "winter", "june", "july", "august", "september", "october"]),
  };
}

function collectKeywordMatches(text: string, keywords: string[]): string[] {
  return keywords.filter((keyword) => text.includes(keyword));
}

function collectMissingContext(intent: ForagingIntent, cues: ForagingCues): MissingContext[] {
  switch (intent) {
    case "find-observations": {
      const missing: MissingContext[] = [];

      if (cues.species.length === 0 && cues.habitat.length === 0) {
        missing.push("species", "habitat");
      }

      if (cues.region.length === 0) {
        missing.push("region");
      }

      return missing;
    }
    case "create-field-note": {
      const missing: MissingContext[] = [];

      if (cues.species.length === 0) {
        missing.push("species");
      }

      if (cues.region.length === 0) {
        missing.push("region");
      }

      return missing;
    }
    case "inspect-patch": {
      const missing: MissingContext[] = [];

      if (cues.habitat.length === 0) {
        missing.push("habitat");
      }

      if (cues.region.length === 0) {
        missing.push("region");
      }

      return missing;
    }
    case "explain-suggestion":
    case "resume-session":
    case "clarify":
      return [];
  }
}
