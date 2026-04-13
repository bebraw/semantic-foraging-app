import { describe, expect, it } from "vitest";
import { createIntentWorkflow, createStoredIntentWorkflow, mergeIntentClarification } from "./intent-workflow";

describe("createIntentWorkflow", () => {
  it("returns a completed workflow when classification is resolved", () => {
    expect(
      createIntentWorkflow("Create a new note", {
        intent: "create",
        confidence: 0.66,
        needsClarification: false,
      }),
    ).toEqual({
      name: "intent-classification",
      state: "completed",
    });
  });

  it("returns a clarification workflow when more input is needed", () => {
    expect(
      createIntentWorkflow("Help", {
        intent: "clarify",
        confidence: 0.31,
        needsClarification: true,
      }),
    ).toEqual({
      name: "intent-classification",
      state: "awaiting_clarification",
      workflowId: expect.any(String),
      question: 'What do you want to do with "Help": search, create, or explain?',
      options: ["search", "create", "explain"],
    });
  });

  it("preserves an explicit workflow id when provided", () => {
    expect(
      createIntentWorkflow(
        "Help",
        {
          intent: "clarify",
          confidence: 0.31,
          needsClarification: true,
        },
        "workflow-123",
      ),
    ).toEqual({
      name: "intent-classification",
      state: "awaiting_clarification",
      workflowId: "workflow-123",
      question: 'What do you want to do with "Help": search, create, or explain?',
      options: ["search", "create", "explain"],
    });
  });
});

describe("mergeIntentClarification", () => {
  it("preserves the original input while appending clarification text", () => {
    expect(mergeIntentClarification("Help", "Search for similar notes")).toBe("Help\nClarification: Search for similar notes");
  });
});

describe("createStoredIntentWorkflow", () => {
  it("builds a serializable stored workflow snapshot", () => {
    expect(
      createStoredIntentWorkflow("Help", {
        name: "intent-classification",
        state: "awaiting_clarification",
        workflowId: "workflow-123",
        question: 'What do you want to do with "Help": search, create, or explain?',
        options: ["search", "create", "explain"],
      }),
    ).toEqual({
      workflowId: "workflow-123",
      rawInput: "Help",
      state: "awaiting_clarification",
      question: 'What do you want to do with "Help": search, create, or explain?',
      options: ["search", "create", "explain"],
    });
  });
});
