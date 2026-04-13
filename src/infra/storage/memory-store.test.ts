import { describe, expect, it } from "vitest";
import { InMemoryWorkflowRepository } from "./memory-store";

describe("InMemoryWorkflowRepository", () => {
  it("stores and returns intent workflow snapshots", async () => {
    const repository = new InMemoryWorkflowRepository();

    await repository.saveIntentWorkflow({
      workflowId: "workflow-123",
      rawInput: "Help",
      state: "awaiting_clarification",
      question: 'What do you want to do with "Help": search, create, or explain?',
      options: ["search", "create", "explain"],
    });

    await expect(repository.getIntentWorkflow("workflow-123")).resolves.toEqual({
      workflowId: "workflow-123",
      rawInput: "Help",
      state: "awaiting_clarification",
      question: 'What do you want to do with "Help": search, create, or explain?',
      options: ["search", "create", "explain"],
    });
  });

  it("returns null for unknown workflow ids", async () => {
    const repository = new InMemoryWorkflowRepository();

    await expect(repository.getIntentWorkflow("missing")).resolves.toBeNull();
  });
});
