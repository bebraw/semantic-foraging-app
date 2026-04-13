import type { ModelProvider } from "../../infra/llm/provider";
import { deterministicProvenance, modelProvenance, type Provenance } from "../../domain/policies/provenance";

export type ExplainDecisionInput = {
  title: string;
  facts: string[];
};

export type ExplainDecisionResult = {
  explanation: string;
  provenance: Provenance;
};

export async function explainDecision(provider: ModelProvider | null, input: ExplainDecisionInput): Promise<ExplainDecisionResult> {
  if (!provider) {
    return {
      explanation: deterministicExplanation(input),
      provenance: deterministicProvenance("no-model-provider"),
    };
  }

  if (!(await provider.isAvailable())) {
    return {
      explanation: deterministicExplanation(input),
      provenance: deterministicProvenance("provider-unavailable"),
    };
  }

  try {
    return {
      explanation: await provider.completeText({
        system: "You explain application decisions clearly and conservatively. Do not invent facts.",
        prompt: [
          `Decision: ${input.title}`,
          "",
          "Facts:",
          ...input.facts.map((fact) => `- ${fact}`),
          "",
          "Write a concise user-facing explanation.",
        ].join("\n"),
        temperature: 0.2,
        maxOutputTokens: 180,
      }),
      provenance: modelProvenance(provider.name),
    };
  } catch {
    return {
      explanation: deterministicExplanation(input),
      provenance: deterministicProvenance("model-inference-failed"),
    };
  }
}

function deterministicExplanation(input: ExplainDecisionInput): string {
  return `${input.title}. This result is based on the available structured information in the application.`;
}
