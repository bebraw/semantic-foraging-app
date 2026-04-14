import { describe, expect, it, vi } from "vitest";
import { exampleRoutes } from "../app-routes";
import { createAppContext } from "../app/context";
import { handleAppCommandRequest, handleIntentClarificationRequest, handleIntentCommandRequest } from "./app-command";

describe("handleIntentCommandRequest", () => {
  it("returns a deterministic intent classification when no model provider is configured", async () => {
    const response = await handleIntentCommandRequest(
      new Request("http://example.com/api/intent", {
        method: "POST",
        body: JSON.stringify({ input: "Explain why this happened" }),
        headers: {
          "content-type": "application/json",
        },
      }),
      createAppContext(exampleRoutes),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      input: "Explain why this happened",
      classification: {
        intent: "explain",
        confidence: 0.72,
        needsClarification: false,
      },
      confidenceBand: "medium",
      provenance: {
        source: "deterministic-fallback",
        provider: null,
        reason: "no-model-provider",
      },
      workflow: {
        name: "intent-classification",
        state: "completed",
      },
    });
  });

  it("returns a clarification workflow for ambiguous input", async () => {
    const response = await handleIntentCommandRequest(
      new Request("http://example.com/api/intent", {
        method: "POST",
        body: JSON.stringify({ input: "Help" }),
        headers: {
          "content-type": "application/json",
        },
      }),
      createAppContext(exampleRoutes),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      input: "Help",
      classification: {
        intent: "clarify",
        confidence: 0.31,
        needsClarification: true,
      },
      confidenceBand: "low",
      provenance: {
        source: "deterministic-fallback",
        provider: null,
        reason: "no-model-provider",
      },
      workflow: {
        name: "intent-classification",
        state: "awaiting_clarification",
        workflowId: expect.any(String),
        question: 'What do you want to do with "Help": search, create, or explain?',
        options: ["search", "create", "explain"],
      },
    });
  });

  it("returns a typed storage error when workflow state cannot be stored", async () => {
    const response = await handleIntentCommandRequest(
      new Request("http://example.com/api/intent", {
        method: "POST",
        body: JSON.stringify({ input: "Help" }),
        headers: {
          "content-type": "application/json",
        },
      }),
      createAppContext(exampleRoutes, null, undefined, {
        saveIntentWorkflow: vi.fn().mockRejectedValue(new Error("storage unavailable")),
        getIntentWorkflow: vi.fn(),
        deleteIntentWorkflow: vi.fn(),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      category: "storage_failure",
      error: "Workflow state could not be stored.",
    });
  });

  it("rejects invalid request bodies", async () => {
    const response = await handleIntentCommandRequest(
      new Request("http://example.com/api/intent", {
        method: "POST",
        body: JSON.stringify({ input: "" }),
        headers: {
          "content-type": "application/json",
        },
      }),
      createAppContext(exampleRoutes),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      category: "validation_error",
      error: "Request body must be JSON with a non-empty input string.",
    });
  });
});

describe("handleAppCommandRequest", () => {
  it("dispatches typed submit commands through the generic app-command endpoint", async () => {
    const response = await handleAppCommandRequest(
      new Request("http://example.com/api/app/command", {
        method: "POST",
        body: JSON.stringify({
          type: "SubmitUserIntent",
          input: "Explain why this happened",
        }),
        headers: {
          "content-type": "application/json",
        },
      }),
      createAppContext(exampleRoutes),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      input: "Explain why this happened",
      classification: {
        intent: "explain",
        confidence: 0.72,
        needsClarification: false,
      },
      confidenceBand: "medium",
      provenance: {
        source: "deterministic-fallback",
        provider: null,
        reason: "no-model-provider",
      },
      workflow: {
        name: "intent-classification",
        state: "completed",
      },
    });
  });

  it("dispatches typed clarification commands through the generic app-command endpoint", async () => {
    const context = createAppContext(exampleRoutes);
    const initialResponse = await handleIntentCommandRequest(
      new Request("http://example.com/api/intent", {
        method: "POST",
        body: JSON.stringify({ input: "Help" }),
        headers: {
          "content-type": "application/json",
        },
      }),
      context,
    );
    const initialPayload = await initialResponse.json();

    const response = await handleAppCommandRequest(
      new Request("http://example.com/api/app/command", {
        method: "POST",
        body: JSON.stringify({
          type: "ClarifyUserIntent",
          workflowId: initialPayload.workflow.workflowId,
          clarification: "Search for similar notes",
        }),
        headers: {
          "content-type": "application/json",
        },
      }),
      context,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      input: "Help",
      classification: {
        intent: "search",
        confidence: 0.61,
        needsClarification: false,
      },
      confidenceBand: "medium",
      provenance: {
        source: "deterministic-fallback",
        provider: null,
        reason: "no-model-provider",
      },
      workflow: {
        name: "intent-classification",
        state: "completed",
      },
    });
  });

  it("rejects invalid generic app-command request bodies", async () => {
    const response = await handleAppCommandRequest(
      new Request("http://example.com/api/app/command", {
        method: "POST",
        body: JSON.stringify({ type: "UnknownCommand" }),
        headers: {
          "content-type": "application/json",
        },
      }),
      createAppContext(exampleRoutes),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      category: "validation_error",
      error:
        'Request body must be JSON with type "SubmitUserIntent" plus input, or type "ClarifyUserIntent" plus workflowId and clarification.',
    });
  });
});

describe("handleIntentClarificationRequest", () => {
  it("resolves a clarification follow-up when more detail is provided", async () => {
    const context = createAppContext(exampleRoutes);
    const initialResponse = await handleIntentCommandRequest(
      new Request("http://example.com/api/intent", {
        method: "POST",
        body: JSON.stringify({ input: "Help" }),
        headers: {
          "content-type": "application/json",
        },
      }),
      context,
    );
    const initialPayload = await initialResponse.json();

    const response = await handleIntentClarificationRequest(
      new Request("http://example.com/api/intent/clarify", {
        method: "POST",
        body: JSON.stringify({
          workflowId: initialPayload.workflow.workflowId,
          clarification: "Search for similar notes",
        }),
        headers: {
          "content-type": "application/json",
        },
      }),
      context,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      input: "Help",
      classification: {
        intent: "search",
        confidence: 0.61,
        needsClarification: false,
      },
      confidenceBand: "medium",
      provenance: {
        source: "deterministic-fallback",
        provider: null,
        reason: "no-model-provider",
      },
      workflow: {
        name: "intent-classification",
        state: "completed",
      },
    });
  });

  it("consumes workflow state after a successful clarification", async () => {
    const context = createAppContext(exampleRoutes);
    const initialResponse = await handleIntentCommandRequest(
      new Request("http://example.com/api/intent", {
        method: "POST",
        body: JSON.stringify({ input: "Help" }),
        headers: {
          "content-type": "application/json",
        },
      }),
      context,
    );
    const initialPayload = await initialResponse.json();

    const firstResponse = await handleIntentClarificationRequest(
      new Request("http://example.com/api/intent/clarify", {
        method: "POST",
        body: JSON.stringify({
          workflowId: initialPayload.workflow.workflowId,
          clarification: "Search for similar notes",
        }),
        headers: {
          "content-type": "application/json",
        },
      }),
      context,
    );
    const secondResponse = await handleIntentClarificationRequest(
      new Request("http://example.com/api/intent/clarify", {
        method: "POST",
        body: JSON.stringify({
          workflowId: initialPayload.workflow.workflowId,
          clarification: "Search for similar notes",
        }),
        headers: {
          "content-type": "application/json",
        },
      }),
      context,
    );

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(404);
    await expect(secondResponse.json()).resolves.toEqual({
      ok: false,
      category: "unsupported_workflow_transition",
      error: "Workflow state was not found for the provided workflowId.",
    });
  });

  it("rejects invalid clarification request bodies", async () => {
    const response = await handleIntentClarificationRequest(
      new Request("http://example.com/api/intent/clarify", {
        method: "POST",
        body: JSON.stringify({ workflowId: "", clarification: "" }),
        headers: {
          "content-type": "application/json",
        },
      }),
      createAppContext(exampleRoutes),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      category: "validation_error",
      error: "Request body must be JSON with non-empty workflowId and clarification strings.",
    });
  });

  it("returns a stable error when workflow state is missing", async () => {
    const response = await handleIntentClarificationRequest(
      new Request("http://example.com/api/intent/clarify", {
        method: "POST",
        body: JSON.stringify({ workflowId: "missing", clarification: "Search for similar notes" }),
        headers: {
          "content-type": "application/json",
        },
      }),
      createAppContext(exampleRoutes),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      category: "unsupported_workflow_transition",
      error: "Workflow state was not found for the provided workflowId.",
    });
  });

  it("returns a typed storage error when workflow state cannot be loaded", async () => {
    const response = await handleIntentClarificationRequest(
      new Request("http://example.com/api/intent/clarify", {
        method: "POST",
        body: JSON.stringify({ workflowId: "workflow-123", clarification: "Search for similar notes" }),
        headers: {
          "content-type": "application/json",
        },
      }),
      createAppContext(exampleRoutes, null, undefined, {
        saveIntentWorkflow: vi.fn(),
        getIntentWorkflow: vi.fn().mockRejectedValue(new Error("storage unavailable")),
        deleteIntentWorkflow: vi.fn(),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      category: "storage_failure",
      error: "Workflow state could not be loaded.",
    });
  });

  it("returns a typed storage error when workflow state cannot be cleared", async () => {
    const response = await handleIntentClarificationRequest(
      new Request("http://example.com/api/intent/clarify", {
        method: "POST",
        body: JSON.stringify({ workflowId: "workflow-123", clarification: "Search for similar notes" }),
        headers: {
          "content-type": "application/json",
        },
      }),
      createAppContext(exampleRoutes, null, undefined, {
        saveIntentWorkflow: vi.fn(),
        getIntentWorkflow: vi.fn().mockResolvedValue({
          workflowId: "workflow-123",
          rawInput: "Help",
          state: "awaiting_clarification",
          question: 'What do you want to do with "Help": search, create, or explain?',
          options: ["search", "create", "explain"],
        }),
        deleteIntentWorkflow: vi.fn().mockRejectedValue(new Error("storage unavailable")),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      category: "storage_failure",
      error: "Workflow state could not be cleared.",
    });
  });
});
