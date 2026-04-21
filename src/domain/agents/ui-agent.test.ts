import { describe, expect, it } from "vitest";
import { exampleRoutes } from "../../app-routes";
import {
  createHomeScreenModel,
  createInitialForagingWorkbenchState,
  withExplanationSubmission,
  withIntentSubmission,
  withWorkbenchAlert,
} from "./ui-agent";

describe("ui-agent", () => {
  it("creates an initial empty workbench state", () => {
    expect(createInitialForagingWorkbenchState()).toEqual({
      alerts: [],
      intent: {
        rawInput: "",
        clarification: "",
      },
      explanation: {
        title: "",
        factsText: "",
      },
      recentSessions: [],
      savedArtifacts: [],
    });
  });

  it("creates a search-first home screen model", () => {
    const screen = createHomeScreenModel({
      routes: exampleRoutes,
      runtime: {
        mode: "no-model",
        provider: null,
        available: false,
        supportsStructuredOutput: false,
        supportsStreaming: false,
        maxContextClass: "unknown",
      },
      traceId: "trace-ui-agent",
      workbench: createInitialForagingWorkbenchState(),
    });

    expect(screen).toEqual(
      expect.objectContaining({
        kind: "home",
        title: "Foraging Search",
        searchPrompt: expect.objectContaining({
          actionPath: "/",
          submitLabel: "Search",
        }),
        presentation: expect.objectContaining({
          primaryKind: "empty",
        }),
        meta: {
          traceId: "trace-ui-agent",
        },
      }),
    );
  });

  it("selects map presentation for nearby berry queries", () => {
    const screen = createHomeScreenModel({
      routes: exampleRoutes,
      runtime: {
        mode: "no-model",
        provider: null,
        available: false,
        supportsStructuredOutput: false,
        supportsStreaming: false,
        maxContextClass: "unknown",
      },
      traceId: "trace-map",
      workbench: withIntentSubmission(createInitialForagingWorkbenchState(), {
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
    });

    expect(screen.presentation.primaryKind).toBe("map");
    expect(screen.presentation.components[0]).toEqual(
      expect.objectContaining({
        kind: "map",
        selected: true,
      }),
    );
    expect(screen.mapView.features).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "observation",
          label: "Bilberry lakeshore pocket",
        }),
      ]),
    );
  });

  it("preserves explanation state and alerts through helper updates", () => {
    const state = withExplanationSubmission(
      withWorkbenchAlert(createInitialForagingWorkbenchState(), {
        tone: "info",
        title: "Info",
        body: "Workbench updated",
      }),
      {
        title: "Suggested forage trail selected",
        facts: ["Fact one", "Fact two"],
        explanation: "The available evidence aligns with the current region.",
        provenance: {
          source: "deterministic-fallback",
          provider: null,
          reason: "no-model-provider",
        },
      },
    );

    expect(state.alerts).toEqual([
      {
        tone: "info",
        title: "Info",
        body: "Workbench updated",
      },
    ]);
    expect(state.explanation.factsText).toBe("Fact one\nFact two");
  });

  it("keeps clarification as the primary presentation while awaiting more input", () => {
    const screen = createHomeScreenModel({
      routes: exampleRoutes,
      runtime: {
        mode: "local-model",
        provider: "local-openai-compatible",
        available: true,
        supportsStructuredOutput: true,
        supportsStreaming: false,
        maxContextClass: "medium",
      },
      traceId: "trace-clarification",
      workbench: withIntentSubmission(
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
            question: "What kind of foraging task does Help describe?",
            options: ["find-observations", "create-field-note"],
          },
        },
        "Search for similar observations",
      ),
    });

    expect(screen.presentation.primaryKind).toBe("clarification");
    expect(screen.presentation.summary).toContain("What kind of foraging task");
    expect(screen.candidateCards).toEqual([]);
  });
});
