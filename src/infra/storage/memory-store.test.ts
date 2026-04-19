import { describe, expect, it } from "vitest";
import { InMemoryWorkflowRepository } from "./memory-store";

describe("InMemoryWorkflowRepository", () => {
  it("stores and returns intent workflow snapshots", async () => {
    const repository = new InMemoryWorkflowRepository();

    await repository.saveIntentWorkflow({
      workflowId: "workflow-123",
      rawInput: "Help",
      state: "awaiting_clarification",
      question:
        'What kind of foraging task does "Help" describe: find observations, create a field note, inspect a patch, explain a suggestion, or resume a session?',
      options: ["find-observations", "create-field-note", "inspect-patch", "explain-suggestion", "resume-session"],
    });

    await expect(repository.getIntentWorkflow("workflow-123")).resolves.toEqual({
      workflowId: "workflow-123",
      rawInput: "Help",
      state: "awaiting_clarification",
      question:
        'What kind of foraging task does "Help" describe: find observations, create a field note, inspect a patch, explain a suggestion, or resume a session?',
      options: ["find-observations", "create-field-note", "inspect-patch", "explain-suggestion", "resume-session"],
    });
  });

  it("returns null for unknown workflow ids", async () => {
    const repository = new InMemoryWorkflowRepository();

    await expect(repository.getIntentWorkflow("missing")).resolves.toBeNull();
  });

  it("removes stored workflow snapshots", async () => {
    const repository = new InMemoryWorkflowRepository();

    await repository.saveIntentWorkflow({
      workflowId: "workflow-123",
      rawInput: "Help",
      state: "awaiting_clarification",
      question:
        'What kind of foraging task does "Help" describe: find observations, create a field note, inspect a patch, explain a suggestion, or resume a session?',
      options: ["find-observations", "create-field-note", "inspect-patch", "explain-suggestion", "resume-session"],
    });

    await repository.deleteIntentWorkflow("workflow-123");

    await expect(repository.getIntentWorkflow("workflow-123")).resolves.toBeNull();
  });
});
