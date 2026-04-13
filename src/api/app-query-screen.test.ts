import { describe, expect, it } from "vitest";
import { exampleRoutes } from "../app-routes";
import { createAppContext } from "../app/context";
import { handleAppQueryRequest } from "./app-query";

describe("handleAppQueryRequest", () => {
  it("returns the typed home screen model", async () => {
    const response = await handleAppQueryRequest(
      new Request("http://example.com/api/app/query", {
        method: "POST",
        body: JSON.stringify({ screen: "home" }),
        headers: {
          "content-type": "application/json",
        },
      }),
      createAppContext(exampleRoutes),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
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

  it("rejects invalid app query request bodies", async () => {
    const response = await handleAppQueryRequest(
      new Request("http://example.com/api/app/query", {
        method: "POST",
        body: JSON.stringify({ screen: "missing" }),
        headers: {
          "content-type": "application/json",
        },
      }),
      createAppContext(exampleRoutes),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: 'Request body must be JSON with screen: "home".',
    });
  });
});
