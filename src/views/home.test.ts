import { describe, expect, it } from "vitest";
import { exampleRoutes } from "../app-routes";
import { renderHomePage } from "./home";

describe("renderHomePage", () => {
  it("renders the foraging workbench, runtime summary, and stylesheet wiring", () => {
    const html = renderHomePage({
      kind: "home",
      eyebrow: "Semantic Foraging",
      title: "Foraging Workbench",
      description:
        "A server-rendered semantic foraging workbench for trying intent classification, clarification, and grounded explanations against the real app bus.",
      overviewTitle: "What this gives you",
      overviewBody:
        "One browser page now exercises the same typed command, query, workflow, and provenance paths that power the JSON endpoints. You can probe the current architecture without dropping to curl or Playwright.",
      runtimeTitle: "Model runtime",
      runtimeModeLabel: "No-model mode",
      runtimeSummary:
        "No model provider is configured. The foraging workbench still runs through deterministic screen, workflow, and explanation fallbacks so the manual flow stays testable.",
      runtime: {
        mode: "no-model",
        provider: null,
        available: false,
        supportsStructuredOutput: false,
        supportsStreaming: false,
        maxContextClass: "unknown",
      },
      alerts: [
        {
          tone: "error",
          title: "Intent input required",
          body: "Enter a natural-language foraging request before submitting.",
        },
      ],
      workbenchTitle: "Manual flow rehearsal",
      workbenchBody:
        "Use these forms to simulate a real semantic foraging session: describe what you want to do, continue any clarification the workflow asks for, and inspect explanation output grounded in explicit evidence.",
      intentWorkbench: {
        title: "Intent rehearsal",
        description:
          "Try natural-language requests a forager might make, such as finding past observations, creating a field note, or asking why a result was suggested.",
        actionPath: "/actions/intent",
        rawInputName: "input",
        rawInputLabel: "What do you want to do?",
        rawInputPlaceholder: "Find notes about chanterelles near mossy spruce stands",
        rawInputValue: "Help",
        submitLabel: "Classify request",
        latestSubmission: {
          input: "Help",
          classification: {
            intent: "clarify",
            confidence: 0.31,
            needsClarification: true,
          },
          confidenceBand: "low",
          provenance: {
            source: "deterministic-fallback",
            provider: null,
            reason: "no-model-provider",
          },
          workflow: {
            name: "intent-classification",
            state: "awaiting_clarification",
            workflowId: "workflow-123",
            question: 'What do you want to do with "Help": search, create, or explain?',
            options: ["search", "create", "explain"],
          },
        },
        clarificationActionPath: "/actions/intent/clarify",
        clarificationWorkflowIdName: "workflowId",
        clarificationName: "clarification",
        clarificationLabel: "Clarification",
        clarificationPlaceholder: "Search for similar observations from last autumn",
        clarificationValue: "Search for similar observations from last autumn",
      },
      explanationWorkbench: {
        title: "Explanation rehearsal",
        description:
          "Send a candidate result title plus grounded facts to inspect the explanation path and provenance reporting used by the foraging UI.",
        actionPath: "/actions/explanation",
        titleName: "title",
        titleLabel: "Decision or result title",
        titlePlaceholder: "Suggested forage trail selected",
        titleValue: "Suggested forage trail selected",
        factsName: "facts",
        factsLabel: "Grounding facts",
        factsPlaceholder: "Observation cluster overlaps the current region\nRecent notes mention wet spruce habitat",
        factsValue: "Observation cluster overlaps the current region\nRecent notes mention wet spruce habitat",
        submitLabel: "Generate explanation",
        latestSubmission: {
          title: "Suggested forage trail selected",
          facts: ["Observation cluster overlaps the current region", "Recent notes mention wet spruce habitat"],
          explanation: "This trail was suggested because the available evidence aligns with the current search.",
          provenance: {
            source: "deterministic-fallback",
            provider: null,
            reason: "no-model-provider",
          },
        },
      },
      routesTitle: "Programmatic routes",
      nextStepsTitle: "Roadmap focus",
      nextStepsBody:
        "The next slices should ingest field notes and observation cards, normalize species, habitat, region, and season cues, retrieve candidate patches and trails with explicit evidence cards, and let a forager save or resume a grounded search session without collapsing the app back into one orchestration loop.",
      healthPath: "/api/health",
      routes: exampleRoutes,
      meta: {
        traceId: "trace-home-test",
      },
    });

    expect(html).toContain("Foraging Workbench");
    expect(html).toContain("Manual flow rehearsal");
    expect(html).toContain("Intent input required");
    expect(html).toContain("Clarification needed");
    expect(html).toContain("Suggested forage trail selected");
    expect(html).toContain("No-model mode");
    expect(html).toContain("species, habitat, region, and season cues");
    expect(html).toContain('rel="stylesheet" href="/styles.css"');
    expect(html).toContain("Trace ID:");
    expect(html).toContain("trace-home-test");
  });
});
