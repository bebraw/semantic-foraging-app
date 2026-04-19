import { describe, expect, it } from "vitest";
import { renderPage } from "./render-page";

describe("renderPage", () => {
  it("renders a shared document shell with trace metadata", () => {
    const html = renderPage({
      title: "Test Page",
      body: "<main>Body</main>",
      traceId: "trace-shell-test",
    });

    expect(html).toContain("<title>Test Page</title>");
    expect(html).toContain("<main>Body</main>");
    expect(html).toContain("Trace ID:");
    expect(html).toContain("trace-shell-test");
  });

  it("renders extra stylesheet and script URLs before inline scripts", () => {
    const html = renderPage({
      title: "Asset Page",
      body: "<main>Assets</main>",
      traceId: "trace-asset-test",
      stylesheets: ["/vendor/leaflet.css"],
      scriptUrls: ["/vendor/leaflet.js"],
      scripts: ["window.__assetTest = true;"],
    });

    expect(html).toContain('<link rel="stylesheet" href="/vendor/leaflet.css">');
    expect(html).toContain('<script src="/vendor/leaflet.js"></script>');
    expect(html).toContain("<script>window.__assetTest = true;</script>");
    expect(html.indexOf('<script src="/vendor/leaflet.js"></script>')).toBeLessThan(
      html.indexOf("<script>window.__assetTest = true;</script>"),
    );
  });
});
