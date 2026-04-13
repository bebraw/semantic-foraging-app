import type { ExplanationResult } from "../../domain/contracts/result";
import type { AppContext } from "../context";
import type { RequestExplanationMessage } from "../message";
import { explainDecision } from "../model/use-explanation";

export async function requestExplanation(context: AppContext, message: RequestExplanationMessage): Promise<ExplanationResult> {
  return {
    kind: "explanation",
    payload: {
      title: message.title,
      facts: message.facts,
      explanation: await explainDecision(context.modelProvider, {
        title: message.title,
        facts: message.facts,
      }),
    },
  };
}
