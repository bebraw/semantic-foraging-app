import { z } from "zod";
import type { ModelProvider } from "../../infra/llm/provider";
import { describeConfidence, type ConfidenceBand } from "../policies/confidence";
import { deterministicProvenance, modelProvenance, type Provenance } from "../policies/provenance";

const IntentSchema = z.object({
  intent: z.enum(["search", "create", "explain", "clarify"]),
  confidence: z.number().min(0).max(1),
  needsClarification: z.boolean(),
});

export type ClassifiedIntent = z.infer<typeof IntentSchema>;

export type IntentClassificationResult = {
  classification: ClassifiedIntent;
  confidenceBand: ConfidenceBand;
  provenance: Provenance;
};

export async function classifyIntent(provider: ModelProvider | null, rawInput: string): Promise<IntentClassificationResult> {
  if (!provider) {
    return finalizeDeterministicIntent(rawInput, "no-model-provider");
  }

  if (!(await provider.isAvailable())) {
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
            enum: ["search", "create", "explain", "clarify"],
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
          needsClarification: {
            type: "boolean",
          },
        },
        required: ["intent", "confidence", "needsClarification"],
      },
      system: "Classify the user's request into one supported intent. Be conservative.",
      prompt: `User input: ${rawInput}`,
      temperature: 0,
      maxOutputTokens: 120,
    });

    const classification = IntentSchema.parse(result);

    return {
      classification,
      confidenceBand: describeConfidence(classification.confidence),
      provenance: modelProvenance(provider.name),
    };
  } catch {
    return finalizeDeterministicIntent(rawInput, "model-inference-failed");
  }
}

function deterministicIntent(rawInput: string): ClassifiedIntent {
  const text = rawInput.toLowerCase().trim();

  if (text.includes("why") || text.includes("explain")) {
    return { intent: "explain", confidence: 0.72, needsClarification: false };
  }

  if (text.includes("create") || text.includes("add")) {
    return { intent: "create", confidence: 0.66, needsClarification: false };
  }

  if (text.includes("search") || text.includes("find") || text.includes("look up") || text.includes("similar")) {
    return { intent: "search", confidence: 0.61, needsClarification: false };
  }

  if (text.length < 12 || text.includes("help") || text === "this" || text === "that") {
    return { intent: "clarify", confidence: 0.31, needsClarification: true };
  }

  return { intent: "search", confidence: 0.55, needsClarification: false };
}

function finalizeDeterministicIntent(rawInput: string, reason: string): IntentClassificationResult {
  const classification = deterministicIntent(rawInput);

  return {
    classification,
    confidenceBand: describeConfidence(classification.confidence),
    provenance: deterministicProvenance(reason),
  };
}
