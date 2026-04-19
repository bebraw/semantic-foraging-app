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
        "Use these forms to rehearse bounded foraging tasks: classify whether you want to find observations, create a field note, inspect a patch, explain a suggestion, or resume a saved session, then inspect the cues and clarification gaps the app detected.",
      intentWorkbench: {
        title: "Intent rehearsal",
        description:
          "Try natural-language requests a forager might make, such as finding chanterelle observations, creating a field note, inspecting a mossy patch, or resuming a previous trail.",
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
            cues: {
              species: [],
              habitat: [],
              region: [],
              season: [],
            },
            missing: ["artifact_scope"],
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
            question:
              'What kind of foraging task does "Help" describe: find observations, create a field note, inspect a patch, explain a suggestion, or resume a session?',
            options: ["find-observations", "create-field-note", "inspect-patch", "explain-suggestion", "resume-session"],
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
      mapView: {
        title: "Foraging map",
        description:
          "This typed map fragment projects current leads and saved sessions into a shared terrain frame so spatial cues are visible before adding a heavier client-side map stack.",
        emptyState: "Run a completed foraging intent to project leads into the map frame.",
        legendTitle: "Mapped leads",
        viewport: {
          width: 640,
          height: 360,
          frameLabel: "Deterministic terrain frame",
        },
        features: [
          {
            id: "candidate-observation-autumn-chanterelle-cluster",
            label: "Autumn chanterelle cluster",
            kind: "observation",
            summary: "Three nearby observation notes align on damp spruce cover and recent chanterelle sightings.",
            evidenceSummary: "chanterelle",
            sourceSection: "candidate-leads",
            geometry: {
              kind: "point",
              point: {
                x: 70,
                y: 60,
              },
            },
          },
        ],
      },
      retrievalTitle: "Candidate leads",
      retrievalBody:
        "Completed foraging intents now surface deterministic observation, patch, trail, note, and session candidates with explicit evidence instead of leaving retrieval implied.",
      retrievalEmptyState: "Run a completed intent to surface grounded candidate cards and evidence notes.",
      candidateCards: [
        {
          id: "observation-autumn-chanterelle-cluster",
          kind: "observation",
          title: "Autumn chanterelle cluster",
          summary: "Three nearby observation notes align on damp spruce cover and recent chanterelle sightings.",
          statusLabel: "Observation cluster",
          evidence: [
            {
              label: "Species overlap",
              detail: "chanterelle",
            },
            {
              label: "Habitat fit",
              detail: "spruce, wet",
            },
          ],
          spatialContext: {
            species: ["chanterelle"],
            habitat: ["spruce", "wet"],
            region: ["helsinki"],
            season: ["autumn"],
          },
        },
      ],
      recentSessionsTitle: "Recent sessions",
      recentSessionsBody:
        "Completed intents are now persisted as lightweight recent-session snapshots through the storage boundary so resume flows have real state to target.",
      recentSessionsEmptyState: "Complete a foraging intent to start building a recent-session trail.",
      recentSessions: [
        {
          sessionId: "session-1",
          input: "Find chanterelles",
          title: "Find chanterelles",
          summary: "Intent: find-observations | species: chanterelle",
          sourceIntent: "find-observations",
          cues: {
            species: ["chanterelle"],
            habitat: ["spruce"],
            region: ["helsinki"],
            season: ["autumn"],
          },
          savedAt: "2026-04-19T12:00:00.000Z",
        },
      ],
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
    expect(html).toContain("Candidate leads");
    expect(html).toContain("Foraging map");
    expect(html).toContain("Mapped leads");
    expect(html).toContain("Deterministic terrain frame");
    expect(html).toContain("Autumn chanterelle cluster");
    expect(html).toContain("Species overlap");
    expect(html).toContain("Recent sessions");
    expect(html).toContain("Find chanterelles");
    expect(html).toContain("Saved 2026-04-19 12:00");
    expect(html).toContain("Clarification focus");
    expect(html).toContain("artifact_scope");
    expect(html).toContain('rel="stylesheet" href="/styles.css"');
    expect(html).toContain("Trace ID:");
    expect(html).toContain("trace-home-test");
  });
});
