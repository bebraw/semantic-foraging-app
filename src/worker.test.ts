import { describe, expect, it } from "vitest";
import worker, { handleRequest } from "./worker";
import { ensureGeneratedStylesheet } from "./test-support";

ensureGeneratedStylesheet();

describe("worker", () => {
  it("renders the stub home page", async () => {
    const response = await handleRequest(new Request("http://example.com/"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");

    const body = await response.text();
    expect(body).toContain("vibe-template Worker");
    expect(body).toContain("/api/health");
    expect(body).toContain("Trace ID:");
  });

  it("returns a JSON health response", async () => {
    const response = await handleRequest(new Request("http://example.com/api/health"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("x-trace-id")).toBeTruthy();
    expect(response.headers.get("x-trace-events")).toBe("2");
    await expect(response.json()).resolves.toEqual({
      ok: true,
      name: "vibe-template-worker",
      routes: ["/", "/api/health", "/api/app/query", "/api/intent", "/api/intent/clarify", "/api/explanation"],
    });
  });

  it("returns the typed home screen through the app query route", async () => {
    const response = await handleRequest(
      new Request("http://example.com/api/app/query", {
        method: "POST",
        body: JSON.stringify({ screen: "home" }),
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trace-id")).toBeTruthy();
    await expect(response.json()).resolves.toEqual({
      ok: true,
      screen: expect.objectContaining({
        kind: "home",
        title: "vibe-template Worker",
        meta: {
          traceId: expect.any(String),
        },
      }),
    });
  });

  it("accepts intent classification commands through the worker route", async () => {
    const response = await handleRequest(
      new Request("http://example.com/api/intent", {
        method: "POST",
        body: JSON.stringify({ input: "Explain why this happened" }),
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trace-id")).toBeTruthy();
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

  it("accepts clarification follow-up commands through the worker route", async () => {
    const response = await handleRequest(
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

  it("accepts explanation queries through the worker route", async () => {
    const response = await handleRequest(
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
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      title: "Search result selected",
      facts: ["The query matched the title", "The result has a recent timestamp"],
      explanation: "Search result selected. This result is based on the available structured information in the application.",
    });
  });

  it("returns a not found page for unknown routes", async () => {
    const response = await handleRequest(new Request("http://example.com/missing"));

    expect(response.status).toBe(404);
    expect(response.headers.get("x-trace-id")).toBeTruthy();

    const body = await response.text();
    expect(body).toContain("Not Found");
    expect(body).toContain("/missing");
  });

  it("exposes the same behavior through the worker fetch entrypoint", async () => {
    const response = await worker.fetch(new Request("http://example.com/api/health"), {});

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
  });

  it("serves generated styles", async () => {
    const response = await handleRequest(new Request("http://example.com/styles.css"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/css");
    expect(response.headers.get("x-trace-id")).toBeTruthy();
    await expect(response.text()).resolves.toContain("--color-app-canvas:#f5efe6");
  });
});
