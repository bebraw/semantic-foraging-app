import { beforeEach, describe, expect, it, vi } from "vitest";
import worker, { handleRequest } from "./worker";
import { ensureGeneratedStylesheet } from "./test-support";

ensureGeneratedStylesheet();

describe("worker", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("renders the foraging workbench home page", async () => {
    const response = await handleRequest(new Request("http://example.com/"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");

    const body = await response.text();
    expect(body).toContain("Semantic Foraging");
    expect(body).toContain("Search-ready surface");
    expect(body).toContain("Nearby berry spots");
    expect(body).toContain('data-presentation-kind="empty"');
  });

  it("renders an initial query from the browser query parameter", async () => {
    const response = await handleRequest(new Request("http://example.com/?q=Create+a+new+field+note"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");

    const body = await response.text();
    expect(body).toContain("Create a new field note");
    expect(body).toContain("Field note scaffold");
  });

  it("respects the requested semantic view from the browser query parameter", async () => {
    const response = await handleRequest(new Request("http://example.com/?q=Nearby+berry+spots&view=cards"));

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('data-presentation-kind="cards"');
    expect(body).toContain("Result cards for &quot;Nearby berry spots&quot;");
  });

  it("redirects the initial home-route search to the persisted query URL", async () => {
    const formData = new FormData();
    formData.set("input", "Create a new field note");

    const response = await handleRequest(
      new Request("http://example.com/", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/?q=Create+a+new+field+note");
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
        intent: "explain-suggestion",
        confidence: 0.82,
        needsClarification: false,
        cues: {
          species: [],
          habitat: [],
          region: [],
          season: [],
        },
        missing: [],
      },
      confidenceBand: "high",
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
        title: "",
        searchPrompt: expect.objectContaining({
          submitLabel: "Search",
        }),
        presentation: expect.objectContaining({
          primaryKind: "empty",
        }),
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
        intent: "explain-suggestion",
        confidence: 0.82,
        needsClarification: false,
        cues: {
          species: [],
          habitat: [],
          region: [],
          season: [],
        },
        missing: [],
      },
      confidenceBand: "high",
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
        intent: "find-observations",
        confidence: 0.69,
        needsClarification: false,
        cues: {
          species: [],
          habitat: [],
          region: [],
          season: [],
        },
        missing: ["species", "habitat", "region"],
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
    expect(body).toContain('data-presentation-kind="cards"');
    expect(body).toContain("create-field-note");
    expect(body).toContain("Field note scaffold");
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

  it("routes saved-artifact revision restores through the worker action surface", async () => {
    vi.setSystemTime(new Date("2026-04-19T12:00:00.000Z"));
    const saveFormData = new FormData();
    saveFormData.set(
      "candidate",
      JSON.stringify({
        id: "trail-north-ridge-wet-spruce-loop",
        kind: "trail",
        title: "Saved chanterelle trail",
        summary: "A saved trail connecting damp spruce pockets and recent chanterelle signals.",
        statusLabel: "Trail fragment",
        evidence: [
          {
            label: "Intent fit",
            detail: "Ranked for explain-suggestion.",
          },
        ],
        spatialContext: {
          species: ["chanterelle"],
          habitat: ["spruce", "wet"],
          region: ["helsinki"],
          season: ["autumn"],
        },
      }),
    );
    saveFormData.set("sourceIntent", "explain-suggestion");
    saveFormData.set(
      "intentSubmission",
      JSON.stringify({
        input: "Explain this chanterelle trail",
        classification: {
          intent: "explain-suggestion",
          confidence: 0.92,
          needsClarification: false,
          cues: {
            species: ["chanterelle"],
            habitat: ["spruce", "wet"],
            region: ["helsinki"],
            season: ["autumn"],
          },
          missing: [],
        },
        confidenceBand: "high",
        provenance: {
          source: "deterministic-fallback",
          provider: null,
          reason: "no-model-provider",
        },
        workflow: {
          name: "intent-classification",
          state: "completed",
        },
      }),
    );

    const saveResponse = await handleRequest(
      new Request("http://example.com/actions/artifact/save", {
        method: "POST",
        body: saveFormData,
      }),
    );

    const saveBody = await saveResponse.text();
    const artifactIdMatch = saveBody.match(/name="artifactId" value="([^"]+)"/);

    if (!artifactIdMatch) {
      throw new Error("Expected an artifact id in the rendered saved-artifact form");
    }

    const refineFormData = new FormData();
    refineFormData.set("artifactId", artifactIdMatch[1]);
    refineFormData.set("title", "Refined chanterelle trail");
    refineFormData.set("summary", "Refined summary for the saved chanterelle route.");
    refineFormData.set("notes", "Start near the wetter spruce edge and keep the old moss hollow in view.");

    vi.setSystemTime(new Date("2026-04-19T13:15:00.000Z"));

    await handleRequest(
      new Request("http://example.com/actions/artifact/refine", {
        method: "POST",
        body: refineFormData,
      }),
    );

    const restoreFormData = new FormData();
    restoreFormData.set("artifactId", artifactIdMatch[1]);
    restoreFormData.set("recordedAt", "2026-04-19T12:00:00.000Z");

    vi.setSystemTime(new Date("2026-04-19T13:30:00.000Z"));

    const response = await handleRequest(
      new Request("http://example.com/actions/artifact/restore", {
        method: "POST",
        body: restoreFormData,
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Artifact restored");
    expect(body).toContain("Saved chanterelle trail");
    expect(body).toContain("restored / Recorded 2026-04-19 13:30");
  });

  it("routes saved-artifact revision reuse through the worker action surface", async () => {
    vi.setSystemTime(new Date("2026-04-19T12:00:00.000Z"));

    const saveFormData = new FormData();
    saveFormData.set(
      "candidate",
      JSON.stringify({
        id: "trail-north-ridge-wet-spruce-loop",
        kind: "trail",
        title: "Saved chanterelle trail",
        summary: "A saved trail connecting damp spruce pockets and recent chanterelle signals.",
        statusLabel: "Trail fragment",
        evidence: [
          {
            label: "Intent fit",
            detail: "Ranked for explain-suggestion.",
          },
        ],
        spatialContext: {
          species: ["chanterelle"],
          habitat: ["spruce", "wet"],
          region: ["helsinki"],
          season: ["autumn"],
        },
      }),
    );
    saveFormData.set("sourceIntent", "explain-suggestion");
    saveFormData.set(
      "intentSubmission",
      JSON.stringify({
        input: "Explain this chanterelle trail",
        classification: {
          intent: "explain-suggestion",
          confidence: 0.92,
          needsClarification: false,
          cues: {
            species: ["chanterelle"],
            habitat: ["spruce", "wet"],
            region: ["helsinki"],
            season: ["autumn"],
          },
          missing: [],
        },
        confidenceBand: "high",
        provenance: {
          source: "deterministic-fallback",
          provider: null,
          reason: "no-model-provider",
        },
        workflow: {
          name: "intent-classification",
          state: "completed",
        },
      }),
    );

    const saveResponse = await handleRequest(
      new Request("http://example.com/actions/artifact/save", {
        method: "POST",
        body: saveFormData,
      }),
    );
    const saveBody = await saveResponse.text();
    const artifactIdMatch = saveBody.match(/name="artifactId" value="([^"]+)"/);

    if (!artifactIdMatch) {
      throw new Error("Expected an artifact id in the rendered saved-artifact form");
    }

    const refineFormData = new FormData();
    refineFormData.set("artifactId", artifactIdMatch[1]);
    refineFormData.set("title", "Refined chanterelle trail");
    refineFormData.set("summary", "Refined summary for the saved chanterelle route.");
    refineFormData.set("notes", "Start near the wetter spruce edge and keep the old moss hollow in view.");

    vi.setSystemTime(new Date("2026-04-19T13:15:00.000Z"));

    await handleRequest(
      new Request("http://example.com/actions/artifact/refine", {
        method: "POST",
        body: refineFormData,
      }),
    );

    const useFormData = new FormData();
    useFormData.set("artifactId", artifactIdMatch[1]);
    useFormData.set("recordedAt", "2026-04-19T12:00:00.000Z");

    const response = await handleRequest(
      new Request("http://example.com/actions/artifact/use", {
        method: "POST",
        body: useFormData,
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Artifact loaded");
    expect(body).toContain("Loaded Saved chanterelle trail from revision history into the workbench forms.");
    expect(body).toContain('value="Saved chanterelle trail"');
    expect(body).toContain("Summary: A saved trail connecting damp spruce pockets and recent chanterelle signals.");
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
    await expect(response.text()).resolves.toContain("--color-app-canvas:#f7fafe");
  });

  it("serves local Leaflet assets", async () => {
    const stylesheetResponse = await handleRequest(new Request("http://example.com/vendor/leaflet.css"));
    const scriptResponse = await handleRequest(new Request("http://example.com/vendor/leaflet.js"));

    expect(stylesheetResponse.status).toBe(200);
    expect(stylesheetResponse.headers.get("content-type")).toContain("text/css");
    expect(stylesheetResponse.headers.get("x-trace-id")).toBeTruthy();
    await expect(stylesheetResponse.text()).resolves.toContain(".leaflet-container");

    expect(scriptResponse.status).toBe(200);
    expect(scriptResponse.headers.get("content-type")).toContain("application/javascript");
    expect(scriptResponse.headers.get("x-trace-id")).toBeTruthy();
    await expect(scriptResponse.text()).resolves.toContain("Leaflet");
  });
});
