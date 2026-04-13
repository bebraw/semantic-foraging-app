import { classifyIntent } from "../../domain/agents/intent-agent";
import { createIntentWorkflow } from "../../domain/agents/intent-workflow";
import type { IntentResult } from "../../domain/contracts/result";
import type { AppContext } from "../context";
import type { SubmitUserIntentMessage } from "../message";

export async function handleUserIntent(context: AppContext, message: SubmitUserIntentMessage): Promise<IntentResult> {
  const classification = await classifyIntent(context.modelProvider, message.rawInput);
  const workflow = createIntentWorkflow(message.rawInput, classification);

  context.trace.addEvent({
    module: "app.use-cases.handle-user-intent",
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
