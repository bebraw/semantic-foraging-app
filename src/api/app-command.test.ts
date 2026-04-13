import { describe, expect, it } from "vitest";
import { exampleRoutes } from "../app-routes";
import { createAppContext } from "../app/context";
import { handleIntentCommandRequest } from "./app-command";

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
