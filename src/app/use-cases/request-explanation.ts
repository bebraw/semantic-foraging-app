import type { ExplanationResult } from "../../domain/contracts/result";
import type { AppContext } from "../context";
import type { RequestExplanationMessage } from "../message";
import { explainDecision } from "../model/use-explanation";

export async function requestExplanation(context: AppContext, message: RequestExplanationMessage): Promise<ExplanationResult> {
  const result = await explainDecision(context.modelProvider, {
    title: message.title,
    facts: message.facts,
  });

  context.trace.addEvent({
    module: "app.use-cases.request-explanation",
    messageType: message.type,
    notes: [`facts:${message.facts.length}`, `provenance:${result.provenance.source}`],
  });

  return {
    kind: "explanation",
    payload: {
      title: message.title,
      facts: message.facts,
      explanation: result.explanation,
      provenance: result.provenance,
    },
  };
}
