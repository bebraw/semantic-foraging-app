import type { ClassifiedIntent } from "./intent-agent";
import type { IntentWorkflow } from "../contracts/workflow";

export function createIntentWorkflow(rawInput: string, classification: ClassifiedIntent): IntentWorkflow {
  if (!classification.needsClarification && classification.intent !== "clarify") {
    return {
      name: "intent-classification",
      state: "completed",
    };
  }

  return {
    name: "intent-classification",
    state: "awaiting_clarification",
    question: `What do you want to do with "${rawInput}": search, create, or explain?`,
    options: ["search", "create", "explain"],
  };
}

export function mergeIntentClarification(rawInput: string, clarification: string): string {
  return `${rawInput}\nClarification: ${clarification}`;
}
