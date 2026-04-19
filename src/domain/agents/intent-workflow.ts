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
    question: createClarificationQuestion(rawInput, classification),
    options: createClarificationOptions(classification),
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

function createClarificationQuestion(rawInput: string, classification: ClassifiedIntent): string {
  if (classification.missing.includes("artifact_scope") || classification.intent === "clarify") {
    return `What kind of foraging task does "${rawInput}" describe: find observations, create a field note, inspect a patch, explain a suggestion, or resume a session?`;
  }

  return `What extra context should narrow "${rawInput}"? Add details about ${classification.missing.join(", ")}.`;
}

function createClarificationOptions(classification: ClassifiedIntent): string[] {
  if (classification.missing.includes("artifact_scope") || classification.intent === "clarify") {
    return ["find-observations", "create-field-note", "inspect-patch", "explain-suggestion", "resume-session"];
  }

  return classification.missing;
}
