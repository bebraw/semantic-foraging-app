export type IntentWorkflow =
  | {
      name: "intent-classification";
      state: "completed";
    }
  | {
      name: "intent-classification";
      state: "awaiting_clarification";
      question: string;
      options: ["search", "create", "explain"];
    };
