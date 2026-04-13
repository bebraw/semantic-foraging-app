import { describe, expect, it } from "vitest";
import { exampleRoutes } from "../app-routes";
import { createAppContext } from "../app/context";
import { handleIntentClarificationRequest, handleIntentCommandRequest } from "./app-command";

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
      workflow: {
        name: "intent-classification",
        state: "awaiting_clarification",
        question: 'What do you want to do with "Help": search, create, or explain?',
        options: ["search", "create", "explain"],
      },
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
      error: "Request body must be JSON with a non-empty input string.",
    });
  });
});

describe("handleIntentClarificationRequest", () => {
  it("resolves a clarification follow-up when more detail is provided", async () => {
    const response = await handleIntentClarificationRequest(
      new Request("http://example.com/api/intent/clarify", {
        method: "POST",
        body: JSON.stringify({
          input: "Help",
          clarification: "Search for similar notes",
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
      input: "Help",
      classification: {
        intent: "search",
        confidence: 0.61,
        needsClarification: false,
      },
      workflow: {
        name: "intent-classification",
        state: "completed",
      },
    });
  });

  it("rejects invalid clarification request bodies", async () => {
    const response = await handleIntentClarificationRequest(
      new Request("http://example.com/api/intent/clarify", {
        method: "POST",
        body: JSON.stringify({ input: "Help", clarification: "" }),
        headers: {
          "content-type": "application/json",
        },
      }),
      createAppContext(exampleRoutes),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Request body must be JSON with non-empty input and clarification strings.",
    });
  });
});
