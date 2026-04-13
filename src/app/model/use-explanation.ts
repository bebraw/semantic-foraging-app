import type { ModelProvider } from "../../infra/llm/provider";

export type ExplainDecisionInput = {
  title: string;
  facts: string[];
};

export async function explainDecision(provider: ModelProvider | null, input: ExplainDecisionInput): Promise<string> {
  if (!provider || !(await provider.isAvailable())) {
    return deterministicExplanation(input);
  }

  try {
    return await provider.completeText({
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
    });
  } catch {
    return deterministicExplanation(input);
  }
}

function deterministicExplanation(input: ExplainDecisionInput): string {
  return `${input.title}. This result is based on the available structured information in the application.`;
}
