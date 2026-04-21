import { describe, expect, it } from "vitest";
import { exampleRoutes } from "../app-routes";
import {
  createHomeScreenModel,
  createInitialForagingWorkbenchState,
  withExplanationSubmission,
  withIntentSubmission,
} from "../domain/agents/ui-agent";
import { renderHomePage } from "./home";

describe("renderHomePage", () => {
  it("renders the minimal search surface before a query is submitted", () => {
    const html = renderHomePage(createScreen());

    expect(html).toContain("Semantic Foraging");
    expect(html).toContain('data-layout-column="recent"');
    expect(html).toContain('data-layout-column="results"');
    expect(html).not.toContain('data-layout-column="observation"');
    expect(html).toContain("<details");
    expect(html).toContain('aria-label="Show sample queries (3)"');
    expect(html).toContain(">Samples<");
    expect(html).toContain("Nearby berry spots");
    expect(html).toContain("Recent searches");
    expect(html).not.toContain("Saved artifacts");
    expect(html).toContain('data-presentation-kind="empty"');
    expect(html).not.toContain('aria-label="Semantic result components"');
    expect(html).not.toContain('id="search-status"');
    expect(html.match(/<button/g)).toHaveLength(4);
    expect(html).not.toContain("Programmatic routes");
    expect(html).not.toContain("Model runtime");
  });

  it("renders a map-first presentation for nearby spot searches", () => {
    const html = renderHomePage(
      createScreen(
        withIntentSubmission(createInitialForagingWorkbenchState(), {
          input: "Nearby berry spots",
          classification: {
            intent: "find-observations",
            confidence: 0.69,
            needsClarification: false,
            cues: {
              species: ["berry"],
              habitat: [],
              region: [],
              season: [],
            },
            missing: ["region"],
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
        }),
      ),
    );

    expect(html).toContain('data-presentation-kind="map"');
    expect(html).toContain(">Nearby berry spots<");
    expect(html).toContain("Bilberry lakeshore pocket");
    expect(html).toContain("data-map-root");
    expect(html).toContain('data-map-item="candidate-observation-bilberry-lakeshore-pocket"');
    expect(html).toContain('rel="stylesheet" href="/vendor/leaflet.css"');
    expect(html).toContain('<script src="/vendor/leaflet.js"></script>');
    expect(html).toContain("data-debug-panel");
    expect(html).toContain("Debug");
    expect(html).not.toContain("data-debug-panel open");
  });

  it("renders a table when the query explicitly asks for one", () => {
    const html = renderHomePage(
      createScreen(
        withIntentSubmission(createInitialForagingWorkbenchState(), {
          input: "Give me a table of the most prevalent mushrooms in Finland at the lake district.",
          classification: {
            intent: "find-observations",
            confidence: 0.69,
            needsClarification: false,
            cues: {
              species: ["mushroom"],
              habitat: [],
              region: ["finland", "lake district"],
              season: [],
            },
            missing: [],
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
        }),
      ),
    );

    expect(html).toContain('data-presentation-kind="table"');
    expect(html).toContain(">Give me a table of the most prevalent mushrooms in Finland at the lake district.<");
    expect(html).toContain('<th class="px-5 py-4 font-semibold">Species</th>');
    expect(html).toContain('data-table-row="row-chanterelle"');
    expect(html).toContain('data-semantic-component="table"');
  });

  it("keeps the semantic component controls in a stable canonical order", () => {
    const html = renderHomePage(
      createScreen(
        withIntentSubmission(createInitialForagingWorkbenchState(), {
          input: "Nearby berry spots",
          classification: {
            intent: "find-observations",
            confidence: 0.69,
            needsClarification: false,
            cues: {
              species: ["berry"],
              habitat: [],
              region: [],
              season: [],
            },
            missing: ["region"],
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
        }),
      ),
    );

    const mapIndex = html.indexOf('data-semantic-component="map"');
    const cardsIndex = html.indexOf('data-semantic-component="cards"');
    const tableIndex = html.indexOf('data-semantic-component="table"');
    const proseIndex = html.indexOf('data-semantic-component="prose"');

    expect(mapIndex).toBeGreaterThan(-1);
    expect(cardsIndex).toBeGreaterThan(mapIndex);
    expect(tableIndex).toBeGreaterThan(cardsIndex);
    expect(proseIndex).toBeGreaterThan(tableIndex);
  });

  it("renders clarification in the result area when the workflow is awaiting input", () => {
    const html = renderHomePage(
      createScreen(
        withIntentSubmission(
          createInitialForagingWorkbenchState(),
          {
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
              question: 'What kind of foraging task does "Help" describe?',
              options: ["find-observations", "create-field-note"],
            },
          },
          "Search for similar observations",
        ),
      ),
    );

    expect(html).toContain('data-presentation-kind="clarification"');
    expect(html).toContain("What kind of foraging task does &quot;Help&quot; describe?");
    expect(html).toContain('value="find-observations"');
    expect(html).toContain('action="/actions/intent/clarify"');
    expect(html).toContain("Continue search");
  });

  it("renders prose mode together with saved artifacts and explanation drafting", () => {
    const workbench = withExplanationSubmission(
      withIntentSubmission(createInitialForagingWorkbenchState(), {
        input: "Explain why this chanterelle trail is worth trying in Helsinki",
        classification: {
          intent: "explain-suggestion",
          confidence: 0.82,
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
      {
        title: "Suggested forage trail selected",
        facts: ["Observation cluster overlaps the current region", "Recent notes mention wet spruce habitat"],
        explanation: "This trail was suggested because the available evidence aligns with the current search.",
        provenance: {
          source: "deterministic-fallback",
          provider: null,
          reason: "no-model-provider",
        },
      },
    );

    workbench.savedArtifacts = [
      {
        artifactId: "trail-1",
        sourceCardId: "trail-card-1",
        kind: "trail",
        title: "Saved chanterelle trail",
        summary: "A saved trail through wet spruce cover near Helsinki.",
        notes: "Check the east-side moss pocket after rain.",
        sourceIntent: "explain-suggestion",
        cues: {
          species: ["chanterelle"],
          habitat: ["spruce"],
          region: ["helsinki"],
          season: ["autumn"],
        },
        evidence: [
          {
            label: "Intent fit",
            detail: "Ranked for explain-suggestion.",
          },
        ],
        spatialContext: {
          species: ["chanterelle"],
          habitat: ["spruce"],
          region: ["helsinki"],
          season: ["autumn"],
        },
        savedAt: "2026-04-19T12:00:00.000Z",
        updatedAt: "2026-04-19T12:45:00.000Z",
        revisions: [
          {
            kind: "saved",
            title: "Saved chanterelle trail",
            summary: "A saved trail through wet spruce cover near Helsinki.",
            recordedAt: "2026-04-19T12:00:00.000Z",
          },
          {
            kind: "refined",
            title: "Saved chanterelle trail",
            summary: "A saved trail through wet spruce cover near Helsinki.",
            notes: "Check the east-side moss pocket after rain.",
            recordedAt: "2026-04-19T12:45:00.000Z",
          },
        ],
      },
    ];
    workbench.recentSessions = [
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
    ];

    const html = renderHomePage(createScreen(workbench));

    expect(html).toContain('data-presentation-kind="prose"');
    expect(html).toContain("Prepared explanation");
    expect(html).toContain("Latest explanation");
    expect(html).toContain("Saved artifacts");
    expect(html).toContain("Use in workbench");
    expect(html).toContain("Update artifact");
    expect(html).toContain("Restore revision");
    expect(html).toContain("Use revision in workbench");
    expect(html).toContain("Recent searches");
    expect(html).toContain('data-layout-column="observation"');
    expect(html).toContain("Saved artifacts");
    expect(html).toContain("Run search");
    expect(html).toContain('value="Find chanterelles"');
  });

  it("renders map variants for areas, trails, overlays, and recent-session features", () => {
    const screen = createScreen(
      withIntentSubmission(createInitialForagingWorkbenchState(), {
        input: "Nearby berry spots",
        classification: {
          intent: "find-observations",
          confidence: 0.69,
          needsClarification: false,
          cues: {
            species: ["berry"],
            habitat: [],
            region: [],
            season: [],
          },
          missing: ["region"],
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
      }),
    );

    screen.mapView.features = [
      {
        id: "candidate-patch-lingonberry-heath-rim",
        label: "Lingonberry heath rim",
        kind: "patch",
        summary: "A pine heath edge with repeated lingonberry signals and shoreline access.",
        evidenceSummary: "Ranked for find-observations.",
        sourceSection: "candidate-leads",
        coordinateSource: "region-anchor",
        geometry: {
          kind: "area",
          center: {
            longitude: 28.1,
            latitude: 61.65,
          },
          ring: [
            { longitude: 28.0, latitude: 61.7 },
            { longitude: 28.2, latitude: 61.7 },
            { longitude: 28.2, latitude: 61.6 },
            { longitude: 28.0, latitude: 61.6 },
            { longitude: 28.0, latitude: 61.7 },
          ],
        },
      },
      {
        id: "candidate-trail-blueberry-ridge-loop",
        label: "Blueberry ridge loop",
        kind: "trail",
        summary: "A short ridge loop linking mature spruce cover and productive blueberry ground.",
        evidenceSummary: "Ranked for find-observations.",
        sourceSection: "candidate-leads",
        coordinateSource: "region-anchor",
        geometry: {
          kind: "trail",
          points: [
            { longitude: 27.9, latitude: 61.72 },
            { longitude: 28.1, latitude: 61.66 },
            { longitude: 28.26, latitude: 61.6 },
          ],
        },
      },
      {
        id: "session-session-1",
        label: "Recent berry search",
        kind: "session",
        summary: "Intent: find-observations",
        evidenceSummary: "Saved from find-observations.",
        sourceSection: "recent-sessions",
        coordinateSource: "session-anchor",
        geometry: {
          kind: "point",
          point: {
            longitude: 28.12,
            latitude: 61.63,
          },
          accuracyMeters: 4000,
        },
      },
    ];
    screen.mapView.overlays = [
      {
        id: "finbif-occurrences",
        label: "FinBIF observations",
        provider: "finbif",
        attribution: "Observation data © Finnish Biodiversity Information Facility",
        status: "ready",
        note: "Loaded 1 public occurrence.",
        points: [
          {
            id: "obs-1",
            label: "Vaccinium myrtillus",
            summary: "Observed 2025-08-10.",
            recordedAt: "2025-08-10",
            point: {
              longitude: 28.14,
              latitude: 61.67,
            },
          },
        ],
      },
    ];

    const html = renderHomePage(screen);

    expect(html).toContain("data-map-marker-path");
    expect(html).toContain("FinBIF observations / finbif");
    expect(html).toContain("Recent berry search");
    expect(html).toContain("61°N");
  });
});

function createScreen(workbench = createInitialForagingWorkbenchState()) {
  return createHomeScreenModel({
    routes: exampleRoutes,
    runtime: {
      mode: "no-model",
      provider: null,
      available: false,
      supportsStructuredOutput: false,
      supportsStreaming: false,
      maxContextClass: "unknown",
    },
    traceId: "trace-home-test",
    workbench,
  });
}
