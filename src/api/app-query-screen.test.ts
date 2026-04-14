import { describe, expect, it } from "vitest";
import { exampleRoutes } from "../app-routes";
import { createAppContext } from "../app/context";
import { handleAppQueryRequest } from "./app-query";

describe("handleAppQueryRequest", () => {
  it("returns the stable health payload through the generic app query route", async () => {
    const response = await handleAppQueryRequest(
      new Request("http://example.com/api/app/query", {
        method: "POST",
        body: JSON.stringify({ type: "RunHealthCheck" }),
        headers: {
          "content-type": "application/json",
        },
      }),
      createAppContext(exampleRoutes),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      type: "RunHealthCheck",
      name: "vibe-template-worker",
      routes: ["/", "/api/health", "/api/app/command", "/api/app/query", "/api/intent", "/api/intent/clarify", "/api/explanation"],
    });
  });

  it("returns the typed home screen model", async () => {
    const response = await handleAppQueryRequest(
      new Request("http://example.com/api/app/query", {
        method: "POST",
        body: JSON.stringify({ type: "RenderHomeScreen" }),
        headers: {
          "content-type": "application/json",
        },
      }),
      createAppContext(exampleRoutes),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      type: "RenderHomeScreen",
      screen: expect.objectContaining({
        kind: "home",
        title: "vibe-template Worker",
        routes: exampleRoutes,
        meta: {
          traceId: expect.any(String),
        },
      }),
    });
  });

  it("returns explanation results through the generic app query route", async () => {
    const response = await handleAppQueryRequest(
      new Request("http://example.com/api/app/query", {
        method: "POST",
        body: JSON.stringify({
          type: "RequestExplanation",
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
      type: "RequestExplanation",
      title: "Search result selected",
      facts: ["The query matched the title", "The result has a recent timestamp"],
      explanation: "Search result selected. This result is based on the available structured information in the application.",
      provenance: {
        source: "deterministic-fallback",
        provider: null,
        reason: "no-model-provider",
      },
    });
  });

  it("rejects invalid app query request bodies", async () => {
    const response = await handleAppQueryRequest(
      new Request("http://example.com/api/app/query", {
        method: "POST",
        body: JSON.stringify({ type: "MissingQuery" }),
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
        'Request body must be JSON with type "RunHealthCheck", type "RenderHomeScreen", or type "RequestExplanation" plus title and at least one fact.',
    });
  });
});
