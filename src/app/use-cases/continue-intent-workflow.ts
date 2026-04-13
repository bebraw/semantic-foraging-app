import { classifyIntent } from "../../domain/agents/intent-agent";
import { createIntentWorkflow, mergeIntentClarification } from "../../domain/agents/intent-workflow";
import type { IntentResult } from "../../domain/contracts/result";
import type { AppContext } from "../context";
import type { ClarifyUserIntentMessage } from "../message";

export async function continueIntentWorkflow(context: AppContext, message: ClarifyUserIntentMessage): Promise<IntentResult> {
  const mergedInput = mergeIntentClarification(message.rawInput, message.clarification);
  const result = await classifyIntent(context.modelProvider, mergedInput);
  const workflow = createIntentWorkflow(message.rawInput, result.classification);

  context.trace.addEvent({
    module: "app.use-cases.continue-intent-workflow",
    messageType: message.type,
    notes: [
      `intent:${result.classification.intent}`,
      `confidence:${result.classification.confidence.toFixed(2)}`,
      `confidence-band:${result.confidenceBand}`,
      `provenance:${result.provenance.source}`,
      `workflow:${workflow.state}`,
    ],
  });

  return {
    kind: "intent",
    payload: {
      input: message.rawInput,
      classification: result.classification,
      confidenceBand: result.confidenceBand,
      provenance: result.provenance,
      workflow,
    },
  };
}
