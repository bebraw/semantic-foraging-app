import { classifyIntent } from "../../domain/agents/intent-agent";
import { createIntentWorkflow, mergeIntentClarification } from "../../domain/agents/intent-workflow";
import { createAppErrorResult, type AppErrorResult, type IntentResult } from "../../domain/contracts/result";
import type { AppContext } from "../context";
import type { ClarifyUserIntentMessage } from "../message";

export async function continueIntentWorkflow(
  context: AppContext,
  message: ClarifyUserIntentMessage,
): Promise<IntentResult | AppErrorResult> {
  let storedWorkflow;

  try {
    storedWorkflow = await context.workflowRepository.getIntentWorkflow(message.workflowId);
  } catch {
    context.trace.addEvent({
      module: "app.use-cases.continue-intent-workflow",
      messageType: message.type,
      notes: [`workflow-id:${message.workflowId}`, "storage:get-failed"],
    });

    return createAppErrorResult("storage_failure", "Workflow state could not be loaded.", 503);
  }

  if (!storedWorkflow) {
    return createAppErrorResult("unsupported_workflow_transition", "Workflow state was not found for the provided workflowId.", 404);
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
