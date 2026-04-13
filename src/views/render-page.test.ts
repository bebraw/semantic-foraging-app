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
});
