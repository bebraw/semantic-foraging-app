import { expect, test } from "@playwright/test";

test("renders the search-first home page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "Foraging Search" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Search" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Nearby berry spots" })).toBeVisible();
  await expect(page.locator("[data-presentation-kind='empty']")).toBeVisible();
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

test("returns the typed home screen through the app query endpoint", async ({ request }) => {
  const response = await request.post("/api/app/query", {
    data: {
      type: "RenderHomeScreen",
    },
  });

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toEqual({
    ok: true,
    type: "RenderHomeScreen",
    screen: expect.objectContaining({
      kind: "home",
      title: "Foraging Search",
      presentation: expect.objectContaining({
        primaryKind: "empty",
      }),
    }),
  });
});

test("supports the semantic search flow for card-oriented results", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Search the landscape").fill("Create a new field note");
  await page.getByRole("button", { name: "Search" }).click();

  const resultSection = page.locator("[data-presentation-kind='cards']");

  await expect(resultSection).toBeVisible();
  await expect(resultSection).toContainText("create-field-note");
  await expect(page.getByRole("heading", { level: 3, name: "Field note scaffold" })).toBeVisible();
});

test("supports clarification and continuation through the search surface", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Search the landscape").fill("Help");
  await page.getByRole("button", { name: "Search" }).click();

  await expect(page.getByText("Clarification needed")).toBeVisible();
  await page.getByLabel("Clarification").fill("Search for similar observations");
  await page.getByRole("button", { name: "Continue search" }).click();

  const resultSection = page.locator("[data-presentation-kind='cards']");

  await expect(resultSection).toBeVisible();
  await expect(resultSection).toContainText("find-observations");
  await expect(page.getByText("Autumn chanterelle cluster")).toBeVisible();
});

test("uses map presentation and browser enhancement for nearby berry spots", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({
    latitude: 61.65,
    longitude: 28.1,
  });

  await page.goto("/");

  await page.getByLabel("Search the landscape").fill("Nearby berry spots");
  await page.getByRole("button", { name: "Search" }).click();

  const mapRoot = page.locator("[data-map-root]");

  await expect(page.locator("[data-presentation-kind='map']")).toBeVisible();
  await expect(mapRoot).toHaveAttribute("data-map-enhanced", "true");
  await expect(page.locator("[data-map-detail-label]")).toHaveText("Bilberry lakeshore pocket");
  await expect(page.locator("[data-map-location-status]")).toContainText("Using current location to orient the map.");
});

test("saves an artifact and reloads it into the prepared explanation panel", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Search the landscape").fill("Create a new field note");
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("button", { name: "Save field note" }).click();

  await expect(page.getByRole("heading", { level: 2, name: "Saved artifacts" })).toBeVisible();
  await page.getByRole("button", { name: "Use in workbench" }).click();

  await expect(page.getByText("Artifact loaded")).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Explanation draft" })).toBeVisible();
  await expect(page.getByLabel("Decision or result title")).toHaveValue("Field note scaffold");
  await expect(page.getByLabel("Grounding facts")).toContainText("Summary: A starter note seeded from the current request");
});
