import { describe, expect, it } from "vitest";
import { createIntentWorkflow, createStoredIntentWorkflow, mergeIntentClarification } from "./intent-workflow";

describe("createIntentWorkflow", () => {
  it("returns a completed workflow when classification is resolved", () => {
    expect(
      createIntentWorkflow("Create a new note", {
        intent: "create-field-note",
        confidence: 0.74,
        needsClarification: false,
        cues: {
          species: [],
          habitat: [],
          region: [],
          season: [],
        },
        missing: ["species", "region"],
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
        cues: {
          species: [],
          habitat: [],
          region: [],
          season: [],
        },
        missing: ["artifact_scope"],
      }),
    ).toEqual({
      name: "intent-classification",
      state: "awaiting_clarification",
      workflowId: expect.any(String),
      question:
        'What kind of foraging task does "Help" describe: find observations, create a field note, inspect a patch, explain a suggestion, or resume a session?',
      options: ["find-observations", "create-field-note", "inspect-patch", "explain-suggestion", "resume-session"],
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
          cues: {
            species: [],
            habitat: [],
            region: [],
            season: [],
          },
          missing: ["artifact_scope"],
        },
        "workflow-123",
      ),
    ).toEqual({
      name: "intent-classification",
      state: "awaiting_clarification",
      workflowId: "workflow-123",
      question:
        'What kind of foraging task does "Help" describe: find observations, create a field note, inspect a patch, explain a suggestion, or resume a session?',
      options: ["find-observations", "create-field-note", "inspect-patch", "explain-suggestion", "resume-session"],
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
        question:
          'What kind of foraging task does "Help" describe: find observations, create a field note, inspect a patch, explain a suggestion, or resume a session?',
        options: ["find-observations", "create-field-note", "inspect-patch", "explain-suggestion", "resume-session"],
      }),
    ).toEqual({
      workflowId: "workflow-123",
      rawInput: "Help",
      state: "awaiting_clarification",
      question:
        'What kind of foraging task does "Help" describe: find observations, create a field note, inspect a patch, explain a suggestion, or resume a session?',
      options: ["find-observations", "create-field-note", "inspect-patch", "explain-suggestion", "resume-session"],
    });
  });
});
