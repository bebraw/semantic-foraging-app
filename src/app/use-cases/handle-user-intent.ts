import { classifyIntent } from "../../domain/agents/intent-agent";
import { createIntentWorkflow, createStoredIntentWorkflow } from "../../domain/agents/intent-workflow";
import { createAppErrorResult, type AppErrorResult, type IntentResult } from "../../domain/contracts/result";
import type { AppContext } from "../context";
import type { SubmitUserIntentMessage } from "../message";

export async function handleUserIntent(context: AppContext, message: SubmitUserIntentMessage): Promise<IntentResult | AppErrorResult> {
  const result = await classifyIntent(context.modelProvider, message.rawInput);
  const workflow = createIntentWorkflow(message.rawInput, result.classification);

  if (workflow.state === "awaiting_clarification") {
    try {
      await context.workflowRepository.saveIntentWorkflow(createStoredIntentWorkflow(message.rawInput, workflow));
    } catch {
      context.trace.addEvent({
        module: "app.use-cases.handle-user-intent",
        messageType: message.type,
        notes: [`workflow-id:${workflow.workflowId}`, "workflow:awaiting_clarification", "storage:save-failed"],
      });

      return createAppErrorResult("storage_failure", "Workflow state could not be stored.", 503);
    }
  }

  context.trace.addEvent({
    module: "app.use-cases.handle-user-intent",
    messageType: message.type,
    notes: [
      `intent:${result.classification.intent}`,
      `missing:${result.classification.missing.join("|") || "none"}`,
      `confidence:${result.classification.confidence.toFixed(2)}`,
      `confidence-band:${result.confidenceBand}`,
      `provenance:${result.provenance.source}`,
      `provenance-reason:${result.provenance.reason}`,
      ...(workflow.state === "awaiting_clarification" ? [`workflow-id:${workflow.workflowId}`] : []),
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
