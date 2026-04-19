import { describe, expect, it } from "vitest";
import worker, { handleRequest } from "./worker";
import { ensureGeneratedStylesheet } from "./test-support";

ensureGeneratedStylesheet();

describe("worker", () => {
  it("renders the foraging workbench home page", async () => {
    const response = await handleRequest(new Request("http://example.com/"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");

    const body = await response.text();
    expect(body).toContain("Foraging Workbench");
    expect(body).toContain("Intent rehearsal");
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
      routes: ["/", "/api/health", "/api/app/command", "/api/app/query", "/api/intent", "/api/intent/clarify", "/api/explanation"],
    });
  });

  it("dispatches typed commands through the generic app-command route", async () => {
    const response = await handleRequest(
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

  it("returns the typed home screen through the app query route", async () => {
    const response = await handleRequest(
      new Request("http://example.com/api/app/query", {
        method: "POST",
        body: JSON.stringify({ type: "RenderHomeScreen" }),
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trace-id")).toBeTruthy();
    await expect(response.json()).resolves.toEqual({
      ok: true,
      type: "RenderHomeScreen",
      screen: expect.objectContaining({
        kind: "home",
        title: "Foraging Workbench",
        runtime: {
          mode: "no-model",
          provider: null,
          available: false,
          supportsStructuredOutput: false,
          supportsStreaming: false,
          maxContextClass: "unknown",
        },
        meta: {
          traceId: expect.any(String),
        },
      }),
    });
  });

  it("returns the runtime capability through the generic app query route", async () => {
    const response = await handleRequest(
      new Request("http://example.com/api/app/query", {
        method: "POST",
        body: JSON.stringify({ type: "InspectModelRuntime" }),
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trace-id")).toBeTruthy();
    await expect(response.json()).resolves.toEqual({
      ok: true,
      type: "InspectModelRuntime",
      runtime: {
        mode: "no-model",
        provider: null,
        available: false,
        supportsStructuredOutput: false,
        supportsStreaming: false,
        maxContextClass: "unknown",
      },
    });
  });

  it("returns the health payload through the generic app query route", async () => {
    const response = await handleRequest(
      new Request("http://example.com/api/app/query", {
        method: "POST",
        body: JSON.stringify({ type: "RunHealthCheck" }),
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trace-id")).toBeTruthy();
    await expect(response.json()).resolves.toEqual({
      ok: true,
      type: "RunHealthCheck",
      name: "vibe-template-worker",
      routes: ["/", "/api/health", "/api/app/command", "/api/app/query", "/api/intent", "/api/intent/clarify", "/api/explanation"],
    });
  });

  it("returns explanation results through the generic app query route", async () => {
    const response = await handleRequest(
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
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trace-id")).toBeTruthy();
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

  it("accepts clarification follow-up commands through the worker route", async () => {
    const initialResponse = await handleRequest(
      new Request("http://example.com/api/intent", {
        method: "POST",
        body: JSON.stringify({ input: "Help" }),
        headers: {
          "content-type": "application/json",
        },
      }),
    );
    const initialPayload = await initialResponse.json();

    const response = await handleRequest(
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
      provenance: {
        source: "deterministic-fallback",
        provider: null,
        reason: "no-model-provider",
      },
    });
  });

  it("renders intent action results back into the home page", async () => {
    const formData = new FormData();
    formData.set("input", "Create a new field note");

    const response = await handleRequest(
      new Request("http://example.com/actions/intent", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    const body = await response.text();
    expect(body).toContain("Latest intent result");
    expect(body).toContain("create");
  });

  it("renders clarification prompts through the home page workflow action", async () => {
    const formData = new FormData();
    formData.set("input", "Help");

    const response = await handleRequest(
      new Request("http://example.com/actions/intent", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Clarification needed");
    expect(body).toContain('name="workflowId"');
  });

  it("renders explanation results through the home page action", async () => {
    const formData = new FormData();
    formData.set("title", "Suggested forage trail selected");
    formData.set("facts", "Observation cluster overlaps the current region\nRecent notes mention wet spruce habitat");

    const response = await handleRequest(
      new Request("http://example.com/actions/explanation", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Latest explanation");
    expect(body).toContain("Suggested forage trail selected");
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
