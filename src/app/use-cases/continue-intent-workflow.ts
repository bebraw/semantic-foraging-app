import { classifyIntent } from "../../domain/agents/intent-agent";
import { createIntentWorkflow, mergeIntentClarification } from "../../domain/agents/intent-workflow";
import type { IntentResult } from "../../domain/contracts/result";
import type { AppContext } from "../context";
import type { ClarifyUserIntentMessage } from "../message";

export async function continueIntentWorkflow(context: AppContext, message: ClarifyUserIntentMessage): Promise<IntentResult> {
  const mergedInput = mergeIntentClarification(message.rawInput, message.clarification);
  const classification = await classifyIntent(context.modelProvider, mergedInput);
  const workflow = createIntentWorkflow(message.rawInput, classification);

  context.trace.addEvent({
    module: "app.use-cases.continue-intent-workflow",
    messageType: message.type,
    notes: [`intent:${classification.intent}`, `confidence:${classification.confidence.toFixed(2)}`, `workflow:${workflow.state}`],
  });

  return {
    kind: "intent",
    payload: {
      input: message.rawInput,
      classification,
      workflow,
    },
  };
}
