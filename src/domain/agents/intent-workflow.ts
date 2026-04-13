import type { ClassifiedIntent } from "./intent-agent";
import type { IntentWorkflow, StoredIntentWorkflow } from "../contracts/workflow";

export function createIntentWorkflow(rawInput: string, classification: ClassifiedIntent, workflowId: string | null = null): IntentWorkflow {
  if (!classification.needsClarification && classification.intent !== "clarify") {
    return {
      name: "intent-classification",
      state: "completed",
    };
  }

  return {
    name: "intent-classification",
    state: "awaiting_clarification",
    workflowId: workflowId ?? createWorkflowId(),
    question: `What do you want to do with "${rawInput}": search, create, or explain?`,
    options: ["search", "create", "explain"],
  };
}

export function mergeIntentClarification(rawInput: string, clarification: string): string {
  return `${rawInput}\nClarification: ${clarification}`;
}

export function createStoredIntentWorkflow(
  rawInput: string,
  workflow: Extract<IntentWorkflow, { state: "awaiting_clarification" }>,
): StoredIntentWorkflow {
  return {
    workflowId: workflow.workflowId,
    rawInput,
    state: workflow.state,
    question: workflow.question,
    options: workflow.options,
  };
}

function createWorkflowId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `workflow-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
