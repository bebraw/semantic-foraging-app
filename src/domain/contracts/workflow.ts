export type IntentWorkflow =
  | {
      name: "intent-classification";
      state: "completed";
    }
  | {
      name: "intent-classification";
      state: "awaiting_clarification";
      workflowId: string;
      question: string;
      options: string[];
    };

export type StoredIntentWorkflow = {
  workflowId: string;
  rawInput: string;
  state: "awaiting_clarification";
  question: string;
  options: string[];
};
