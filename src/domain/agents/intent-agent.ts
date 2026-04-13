import { z } from "zod";
import type { ModelProvider } from "../../infra/llm/provider";

const IntentSchema = z.object({
  intent: z.enum(["search", "create", "explain", "clarify"]),
  confidence: z.number().min(0).max(1),
  needsClarification: z.boolean(),
});

export type ClassifiedIntent = z.infer<typeof IntentSchema>;

export async function classifyIntent(provider: ModelProvider | null, rawInput: string): Promise<ClassifiedIntent> {
  if (!provider || !(await provider.isAvailable())) {
    return deterministicIntent(rawInput);
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

    return IntentSchema.parse(result);
  } catch {
    return deterministicIntent(rawInput);
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
