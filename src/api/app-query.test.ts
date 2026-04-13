import { describe, expect, it } from "vitest";
import { exampleRoutes } from "../app-routes";
import { createAppContext } from "../app/context";
import { handleExplanationQueryRequest } from "./app-query";

describe("handleExplanationQueryRequest", () => {
  it("returns a deterministic explanation when no model provider is configured", async () => {
    const response = await handleExplanationQueryRequest(
      new Request("http://example.com/api/explanation", {
        method: "POST",
        body: JSON.stringify({
          title: "Search result selected",
          facts: ["The query matched the title", "The result has a recent timestamp"],
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
      title: "Search result selected",
      facts: ["The query matched the title", "The result has a recent timestamp"],
      explanation: "Search result selected. This result is based on the available structured information in the application.",
    });
  });

  it("rejects invalid explanation query bodies", async () => {
    const response = await handleExplanationQueryRequest(
      new Request("http://example.com/api/explanation", {
        method: "POST",
        body: JSON.stringify({ title: "", facts: [] }),
        headers: {
          "content-type": "application/json",
        },
      }),
      createAppContext(exampleRoutes),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Request body must be JSON with a non-empty title and at least one fact.",
    });
  });
});
