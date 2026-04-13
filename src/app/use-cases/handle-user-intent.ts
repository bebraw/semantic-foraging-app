import { classifyIntent } from "../../domain/agents/intent-agent";
import { createIntentWorkflow } from "../../domain/agents/intent-workflow";
import type { IntentResult } from "../../domain/contracts/result";
import type { AppContext } from "../context";
import type { SubmitUserIntentMessage } from "../message";

export async function handleUserIntent(context: AppContext, message: SubmitUserIntentMessage): Promise<IntentResult> {
  const result = await classifyIntent(context.modelProvider, message.rawInput);
  const workflow = createIntentWorkflow(message.rawInput, result.classification);

  context.trace.addEvent({
    module: "app.use-cases.handle-user-intent",
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
