import { expect, test } from "@playwright/test";

test("renders the worker home page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "vibe-template Worker" })).toBeVisible();
  await expect(page.getByText("A minimal Cloudflare Worker baseline for experiments, tests, and local CI.")).toBeVisible();
  await expect(page.getByRole("link", { name: "/api/health" })).toBeVisible();
});

test("remains usable when no model provider is configured", async ({ page, request }) => {
  await page.goto("/");
  await expect(
    page.getByText(
      "A concrete Worker entry point, a simple HTML page, a health endpoint, and testable flows that keep the template green from the start.",
    ),
  ).toBeVisible();

  const response = await request.get("/api/health");

  expect(response.ok()).toBe(true);
});

test("serves the health endpoint", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toEqual({
    ok: true,
    name: "vibe-template-worker",
    routes: ["/", "/api/health", "/api/intent", "/api/explanation"],
  });
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
      intent: "create",
      confidence: 0.66,
      needsClarification: false,
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
  });
});

test("serves the generated stylesheet", async ({ request }) => {
  const response = await request.get("/styles.css");

  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("text/css");
  await expect(response.text()).resolves.toContain("--color-app-canvas:#f5efe6");
});
