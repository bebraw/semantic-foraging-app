import { describe, expect, it } from "vitest";
import { exampleRoutes } from "../app-routes";
import { renderHomePage } from "./home";

describe("renderHomePage", () => {
  it("renders stable starter copy and stylesheet wiring", () => {
    const html = renderHomePage({
      kind: "home",
      eyebrow: "Starter Surface",
      title: "vibe-template Worker",
      description: "A minimal Cloudflare Worker baseline for experiments, tests, and local CI.",
      overviewTitle: "What this gives you",
      overviewBody:
        "A concrete Worker entry point, a simple HTML page, a health endpoint, and testable flows that keep the template green from the start.",
      routesTitle: "Available routes",
      nextStepsTitle: "Next steps",
      nextStepsBody:
        "Replace this stub with your real feature work, update the relevant spec, and keep the quality gate passing as the app evolves.",
      healthPath: "/api/health",
      routes: exampleRoutes,
      meta: {
        traceId: "trace-home-test",
      },
    });

    expect(html).toContain("HTML stub app for developers");
    expect(html).toContain("A concrete Worker entry point");
    expect(html).toContain('rel="stylesheet" href="/styles.css"');
    expect(html).toContain("Trace ID:");
    expect(html).toContain("trace-home-test");
  });
});
