import { classifyIntent } from "../../domain/agents/intent-agent";
import { createIntentWorkflow, mergeIntentClarification } from "../../domain/agents/intent-workflow";
import type { IntentResult } from "../../domain/contracts/result";
import type { AppContext } from "../context";
import type { ClarifyUserIntentMessage } from "../message";

export class IntentWorkflowNotFoundError extends Error {
  constructor(workflowId: string) {
    super(`Intent workflow not found: ${workflowId}`);
  }
}

export async function continueIntentWorkflow(context: AppContext, message: ClarifyUserIntentMessage): Promise<IntentResult> {
  const storedWorkflow = await context.workflowRepository.getIntentWorkflow(message.workflowId);

  if (!storedWorkflow) {
    throw new IntentWorkflowNotFoundError(message.workflowId);
  }

  const mergedInput = mergeIntentClarification(storedWorkflow.rawInput, message.clarification);
  const result = await classifyIntent(context.modelProvider, mergedInput);
  const workflow = createIntentWorkflow(storedWorkflow.rawInput, result.classification);

  context.trace.addEvent({
    module: "app.use-cases.continue-intent-workflow",
    messageType: message.type,
    notes: [
      `workflow-id:${message.workflowId}`,
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
      input: storedWorkflow.rawInput,
      classification: result.classification,
      confidenceBand: result.confidenceBand,
      provenance: result.provenance,
      workflow,
    },
  };
}
