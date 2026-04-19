import { expect, test } from "@playwright/test";

test("renders the worker home page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Foraging Workbench" })).toBeVisible();
  await expect(page.getByText("Manual flow rehearsal")).toBeVisible();
  await expect(page.getByText("Foraging map")).toBeVisible();
  await expect(page.getByText("Candidate leads")).toBeVisible();
  await expect(page.getByText("Model runtime")).toBeVisible();
  await expect(page.getByRole("link", { name: "/api/health" })).toBeVisible();
  await expect(page.getByText("Trace ID:")).toBeVisible();
});

test("remains usable when no model provider is configured", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.getByText("Intent rehearsal")).toBeVisible();
  await expect(page.getByText("Explanation rehearsal")).toBeVisible();

  const response = await request.get("/api/health");

  expect(response.ok()).toBe(true);
});

test("serves the health endpoint", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.ok()).toBe(true);
  expect(response.headers()["x-trace-id"]).toBeTruthy();
  expect(response.headers()["x-trace-events"]).toBe("2");
  await expect(response.json()).resolves.toEqual({
    ok: true,
    name: "vibe-template-worker",
    routes: ["/", "/api/health", "/api/app/command", "/api/app/query", "/api/intent", "/api/intent/clarify", "/api/explanation"],
  });
});

test("dispatches typed commands through the generic app-command endpoint", async ({ request }) => {
  const response = await request.post("/api/app/command", {
    data: {
      type: "SubmitUserIntent",
      input: "Create a new note",
    },
  });

  expect(response.ok()).toBe(true);
  expect(response.headers()["x-trace-id"]).toBeTruthy();
  await expect(response.json()).resolves.toEqual({
    ok: true,
    input: "Create a new note",
    classification: {
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
    },
    confidenceBand: "medium",
    provenance: {
      source: "deterministic-fallback",
      provider: null,
      reason: "model-inference-failed",
    },
    workflow: {
      name: "intent-classification",
      state: "completed",
    },
  });
});

test("returns the typed home screen through the app query endpoint", async ({ request }) => {
  const response = await request.post("/api/app/query", {
    data: {
      type: "RenderHomeScreen",
    },
  });

  expect(response.ok()).toBe(true);
  expect(response.headers()["x-trace-id"]).toBeTruthy();
  await expect(response.json()).resolves.toEqual({
    ok: true,
    type: "RenderHomeScreen",
    screen: expect.objectContaining({
      kind: "home",
      title: "Foraging Workbench",
    }),
  });
});

test("returns the health payload through the generic app query endpoint", async ({ request }) => {
  const response = await request.post("/api/app/query", {
    data: {
      type: "RunHealthCheck",
    },
  });

  expect(response.ok()).toBe(true);
  expect(response.headers()["x-trace-id"]).toBeTruthy();
  await expect(response.json()).resolves.toEqual({
    ok: true,
    type: "RunHealthCheck",
    name: "vibe-template-worker",
    routes: ["/", "/api/health", "/api/app/command", "/api/app/query", "/api/intent", "/api/intent/clarify", "/api/explanation"],
  });
});

test("returns runtime capability through the generic app query endpoint", async ({ request }) => {
  const response = await request.post("/api/app/query", {
    data: {
      type: "InspectModelRuntime",
    },
  });

  expect(response.ok()).toBe(true);
  expect(response.headers()["x-trace-id"]).toBeTruthy();
  const payload = await response.json();

  expect(payload).toMatchObject({
    ok: true,
    type: "InspectModelRuntime",
    runtime: {
      available: expect.any(Boolean),
      supportsStructuredOutput: expect.any(Boolean),
      supportsStreaming: expect.any(Boolean),
    },
  });
  expect(["no-model", "local-model", "hosted-model"]).toContain(payload.runtime.mode);
  expect(["small", "medium", "large", "unknown"]).toContain(payload.runtime.maxContextClass);
});

test("returns explanation results through the generic app query endpoint", async ({ request }) => {
  const response = await request.post("/api/app/query", {
    data: {
      type: "RequestExplanation",
      title: "Search result selected",
      facts: ["The query matched the title", "The result has a recent timestamp"],
    },
  });

  expect(response.ok()).toBe(true);
  expect(response.headers()["x-trace-id"]).toBeTruthy();
  await expect(response.json()).resolves.toEqual({
    ok: true,
    type: "RequestExplanation",
    title: "Search result selected",
    facts: ["The query matched the title", "The result has a recent timestamp"],
    explanation: "Search result selected. This result is based on the available structured information in the application.",
    provenance: {
      source: "deterministic-fallback",
      provider: null,
      reason: "model-inference-failed",
    },
  });
});

test("supports the manual intent workbench flow", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("What do you want to do?").fill("Create a new field note");
  await page.getByRole("button", { name: "Classify request" }).click();

  const latestIntentResult = page.locator("section").filter({ hasText: "Latest intent result" }).first();

  await expect(latestIntentResult).toBeVisible();
  await expect(latestIntentResult.locator("dd").filter({ hasText: /^create-field-note$/ })).toBeVisible();
  await expect(latestIntentResult.getByText("species, region")).toBeVisible();
  await expect(page.getByText("Field note scaffold")).toBeVisible();
});

test("supports the manual clarification workbench flow", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("What do you want to do?").fill("Help");
  await page.getByRole("button", { name: "Classify request" }).click();

  await expect(page.getByText("Clarification needed")).toBeVisible();
  await page.getByLabel("Clarification").fill("Search for similar observations");
  await page.getByRole("button", { name: "Continue workflow" }).click();

  const latestIntentResult = page.locator("section").filter({ hasText: "Latest intent result" }).first();

  await expect(latestIntentResult).toBeVisible();
  await expect(latestIntentResult.locator("dd").filter({ hasText: /^find-observations$/ })).toBeVisible();
  await expect(page.getByText("Autumn chanterelle cluster")).toBeVisible();
});

test("uses persisted recent sessions in the manual resume flow", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("What do you want to do?").fill("Find chanterelles near wet spruce in Helsinki");
  await page.getByRole("button", { name: "Classify request" }).click();
  const recentSessionsSection = page.locator("section").filter({ hasText: "Recent sessions" }).first();

  await expect(recentSessionsSection.getByRole("heading", { name: "Find chanterelles near wet spruce in Helsinki" })).toBeVisible();

  await page.getByLabel("What do you want to do?").fill("Resume my chanterelle session");
  await page.getByRole("button", { name: "Classify request" }).click();

  const latestIntentResult = page.locator("section").filter({ hasText: "Latest intent result" }).first();

  await expect(latestIntentResult).toBeVisible();
  await expect(latestIntentResult.locator("dd").filter({ hasText: /^resume-session$/ })).toBeVisible();
  await expect(recentSessionsSection.getByText("Recent session").first()).toBeVisible();
  await expect(recentSessionsSection.getByRole("heading", { name: "Find chanterelles near wet spruce in Helsinki" })).toBeVisible();
});

test("supports the manual explanation workbench flow", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Decision or result title").fill("Suggested forage trail selected");
  await page.getByLabel("Grounding facts").fill("Observation cluster overlaps the current region\nRecent notes mention wet spruce habitat");
  await page.getByRole("button", { name: "Generate explanation" }).click();

  const latestExplanation = page.locator("section").filter({ hasText: "Latest explanation" }).first();

  await expect(latestExplanation).toBeVisible();
  await expect(latestExplanation.locator("p").filter({ hasText: /^Suggested forage trail selected$/ })).toBeVisible();
});

test("classifies intent through the command endpoint without a model provider", async ({ request }) => {
  const response = await request.post("/api/intent", {
    data: {
      input: "Create a new note",
    },
  });

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toEqual({
    ok: true,
    input: "Create a new note",
    classification: {
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
    },
    confidenceBand: "medium",
    provenance: {
      source: "deterministic-fallback",
      provider: null,
      reason: "model-inference-failed",
    },
    workflow: {
      name: "intent-classification",
      state: "completed",
    },
  });
});

test("continues an intent workflow through the clarification endpoint without a model provider", async ({ request }) => {
  const initialResponse = await request.post("/api/intent", {
    data: {
      input: "Help",
    },
  });
  const initialPayload = await initialResponse.json();

  const response = await request.post("/api/intent/clarify", {
    data: {
      workflowId: initialPayload.workflow.workflowId,
      clarification: "Search for similar notes",
    },
  });

  expect(response.ok()).toBe(true);
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
      reason: "model-inference-failed",
    },
    workflow: {
      name: "intent-classification",
      state: "completed",
    },
  });
});

test("returns grounded explanation text through the query endpoint without a model provider", async ({ request }) => {
  const response = await request.post("/api/explanation", {
    data: {
      title: "Search result selected",
      facts: ["The query matched the title", "The result has a recent timestamp"],
    },
  });

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toEqual({
    ok: true,
    title: "Search result selected",
    facts: ["The query matched the title", "The result has a recent timestamp"],
    explanation: "Search result selected. This result is based on the available structured information in the application.",
    provenance: {
      source: "deterministic-fallback",
      provider: null,
      reason: "model-inference-failed",
    },
  });
});

test("serves the generated stylesheet", async ({ request }) => {
  const response = await request.get("/styles.css");

  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("text/css");
  await expect(response.text()).resolves.toContain("--color-app-canvas:#f5efe6");
});
