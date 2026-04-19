import { describe, expect, it } from "vitest";
import { exampleRoutes } from "../../app-routes";
import {
  createHomeScreenModel,
  createInitialForagingWorkbenchState,
  createWorkbenchAlert,
  withExplanationInput,
  withExplanationSubmission,
  withIntentInput,
  withIntentSubmission,
  withSavedArtifactSeed,
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

  it("creates a foraging workbench home screen model", () => {
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
      workbench: withIntentInput(createInitialForagingWorkbenchState(), "Find chanterelle notes"),
    });

    expect(screen).toEqual(
      expect.objectContaining({
        kind: "home",
        title: "Foraging Workbench",
        workbenchTitle: "Intent workbench",
        mapView: expect.objectContaining({
          title: "Foraging map",
        }),
        retrievalTitle: "Candidate leads",
        savedArtifactsTitle: "Saved artifacts",
        recentSessionsTitle: "Recent sessions",
        intentWorkbench: expect.objectContaining({
          actionPath: "/actions/intent",
          rawInputValue: "Find chanterelle notes",
        }),
        explanationWorkbench: expect.objectContaining({
          actionPath: "/actions/explanation",
        }),
        artifactWorkbench: expect.objectContaining({
          saveActionPath: "/actions/artifact/save",
          useActionPath: "/actions/artifact/use",
          refineActionPath: "/actions/artifact/refine",
        }),
        meta: {
          traceId: "trace-ui-agent",
        },
      }),
    );
  });

  it("includes clarification state when the workflow is awaiting input", () => {
    const workbench = withIntentSubmission(
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
          question:
            'What kind of foraging task does "Help" describe: find observations, create a field note, inspect a patch, explain a suggestion, or resume a session?',
          options: ["find-observations", "create-field-note", "inspect-patch", "explain-suggestion", "resume-session"],
        },
      },
      "Search for similar observations",
    );

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
      traceId: "trace-ui-agent",
      workbench: {
        ...workbench,
        alerts: [createWorkbenchAlert("Clarification required", "Answer the follow-up prompt to continue.")],
      },
    });

    expect(screen.runtimeModeLabel).toBe("Local-model mode");
    expect(screen.alerts).toHaveLength(1);
    expect(screen.intentWorkbench.latestSubmission?.workflow.state).toBe("awaiting_clarification");
    expect(screen.intentWorkbench.clarificationValue).toBe("Search for similar observations");
    expect(screen.candidateCards).toEqual([]);
    expect(screen.mapView.features).toEqual([]);
  });

  it("preserves alerts and explanation state through helper updates", () => {
    const state = withExplanationSubmission(
      withWorkbenchAlert(
        withExplanationInput(createInitialForagingWorkbenchState(), "Suggested forage trail selected", "Fact one\nFact two"),
        createWorkbenchAlert("Info", "Workbench updated", "info"),
      ),
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

  it("derives candidate cards from completed foraging intent submissions", () => {
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
      traceId: "trace-candidates",
      workbench: withIntentSubmission(createInitialForagingWorkbenchState(), {
        input: "Find chanterelles near wet spruce in Helsinki",
        classification: {
          intent: "find-observations",
          confidence: 0.69,
          needsClarification: false,
          cues: {
            species: ["chanterelle"],
            habitat: ["spruce", "wet"],
            region: ["helsinki"],
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
    });

    expect(screen.candidateCards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "observation",
          title: "Autumn chanterelle cluster",
        }),
      ]),
    );
    expect(screen.mapView.features).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "observation",
          sourceSection: "candidate-leads",
        }),
      ]),
    );
  });

  it("prefers persisted recent sessions for resume-session candidate cards", () => {
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
      traceId: "trace-resume",
      workbench: {
        ...withIntentSubmission(createInitialForagingWorkbenchState(), {
          input: "Resume my chanterelle session",
          classification: {
            intent: "resume-session",
            confidence: 0.79,
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
        recentSessions: [
          {
            sessionId: "session-1",
            input: "Find chanterelles",
            title: "Find chanterelles",
            summary: "Intent: find-observations",
            sourceIntent: "find-observations",
            cues: {
              species: ["chanterelle"],
              habitat: ["spruce", "wet"],
              region: ["helsinki"],
              season: ["autumn"],
            },
            savedAt: "2026-04-19T12:00:00.000Z",
          },
        ],
      },
    });

    expect(screen.candidateCards).toEqual([
      expect.objectContaining({
        kind: "session",
        title: "Find chanterelles",
        statusLabel: "Recent session",
      }),
    ]);
    expect(screen.mapView.features).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "session",
          sourceSection: "candidate-leads",
        }),
      ]),
    );
  });

  it("preserves recent sessions in the home screen model", () => {
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
      traceId: "trace-sessions",
      workbench: {
        ...createInitialForagingWorkbenchState(),
        recentSessions: [
          {
            sessionId: "session-1",
            input: "Find chanterelles",
            title: "Find chanterelles",
            summary: "Intent: find-observations",
            sourceIntent: "find-observations",
            cues: {
              species: ["chanterelle"],
              habitat: [],
              region: [],
              season: [],
            },
            savedAt: "2026-04-19T12:00:00.000Z",
          },
        ],
      },
    });

    expect(screen.recentSessions).toEqual([expect.objectContaining({ sessionId: "session-1" })]);
  });

  it("preserves saved artifacts in the home screen model", () => {
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
      traceId: "trace-artifacts",
      workbench: {
        ...createInitialForagingWorkbenchState(),
        savedArtifacts: [
          {
            artifactId: "trail-1",
            sourceCardId: "trail-card-1",
            kind: "trail",
            title: "Saved trail",
            summary: "Saved trail summary",
            sourceIntent: "explain-suggestion",
            cues: {
              species: ["chanterelle"],
              habitat: ["spruce"],
              region: ["helsinki"],
              season: ["autumn"],
            },
            evidence: [],
            spatialContext: {
              species: ["chanterelle"],
              habitat: ["spruce"],
              region: ["helsinki"],
              season: ["autumn"],
            },
            savedAt: "2026-04-19T12:00:00.000Z",
            updatedAt: "2026-04-19T12:00:00.000Z",
            revisions: [
              {
                kind: "saved",
                title: "Saved trail",
                summary: "Saved trail summary",
                recordedAt: "2026-04-19T12:00:00.000Z",
              },
            ],
          },
        ],
      },
    });

    expect(screen.savedArtifacts).toEqual([expect.objectContaining({ artifactId: "trail-1" })]);
  });

  it("uses saved artifacts when building candidate cards for completed intents", () => {
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
      traceId: "trace-saved-candidates",
      workbench: {
        ...withIntentSubmission(createInitialForagingWorkbenchState(), {
          input: "Explain this chanterelle trail in Helsinki",
          classification: {
            intent: "explain-suggestion",
            confidence: 0.76,
            needsClarification: false,
            cues: {
              species: ["chanterelle"],
              habitat: ["spruce"],
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
        savedArtifacts: [
          {
            artifactId: "trail-1",
            sourceCardId: "trail-card-1",
            kind: "trail",
            title: "Saved chanterelle trail",
            summary: "A saved trail through wet spruce cover near Helsinki.",
            sourceIntent: "explain-suggestion",
            cues: {
              species: ["chanterelle"],
              habitat: ["spruce"],
              region: ["helsinki"],
              season: ["autumn"],
            },
            evidence: [],
            spatialContext: {
              species: ["chanterelle"],
              habitat: ["spruce"],
              region: ["helsinki"],
              season: ["autumn"],
            },
            savedAt: "2026-04-19T12:00:00.000Z",
            updatedAt: "2026-04-19T12:00:00.000Z",
            revisions: [
              {
                kind: "saved",
                title: "Saved chanterelle trail",
                summary: "A saved trail through wet spruce cover near Helsinki.",
                recordedAt: "2026-04-19T12:00:00.000Z",
              },
            ],
          },
        ],
      },
    });

    expect(screen.candidateCards[0]).toEqual(
      expect.objectContaining({
        id: "saved-artifact-trail-1",
        kind: "trail",
        title: "Saved chanterelle trail",
        statusLabel: "Saved trail",
      }),
    );
    expect(screen.mapView.features).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "trail",
          label: "Saved chanterelle trail",
          sourceSection: "candidate-leads",
        }),
      ]),
    );
  });

  it("seeds the workbench forms from a saved artifact", () => {
    const state = withSavedArtifactSeed(createInitialForagingWorkbenchState(), {
      artifactId: "trail-1",
      sourceCardId: "trail-card-1",
      kind: "trail",
      title: "Saved trail",
      summary: "Saved trail summary",
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
      updatedAt: "2026-04-19T12:00:00.000Z",
      revisions: [
        {
          kind: "saved",
          title: "Saved trail",
          summary: "Saved trail summary",
          recordedAt: "2026-04-19T12:00:00.000Z",
        },
      ],
    });

    expect(state.intent.rawInput).toBe("Saved trail");
    expect(state.intent.latestSubmission).toEqual(
      expect.objectContaining({
        input: "Saved trail",
        classification: expect.objectContaining({
          intent: "explain-suggestion",
          cues: expect.objectContaining({
            species: ["chanterelle"],
          }),
        }),
        provenance: {
          source: "deterministic-fallback",
          provider: null,
          reason: "artifact-reuse",
        },
        workflow: {
          name: "intent-classification",
          state: "completed",
        },
      }),
    );
    expect(state.explanation.title).toBe("Saved trail");
    expect(state.explanation.factsText).toContain("Summary: Saved trail summary");
    expect(state.explanation.factsText).toContain("Intent fit: Ranked for explain-suggestion.");
  });

  it("describes hosted and unavailable runtime tiers in the screen summary", () => {
    const hosted = createHomeScreenModel({
      routes: exampleRoutes,
      runtime: {
        mode: "hosted-model",
        provider: "cloudflare-workers-ai",
        available: true,
        supportsStructuredOutput: true,
        supportsStreaming: false,
        maxContextClass: "medium",
      },
      traceId: "trace-hosted",
      workbench: createInitialForagingWorkbenchState(),
    });
    const unavailable = createHomeScreenModel({
      routes: exampleRoutes,
      runtime: {
        mode: "hosted-model",
        provider: "cloudflare-workers-ai",
        available: false,
        supportsStructuredOutput: false,
        supportsStreaming: false,
        maxContextClass: "unknown",
      },
      traceId: "trace-unavailable",
      workbench: createInitialForagingWorkbenchState(),
    });

    expect(hosted.runtimeModeLabel).toBe("Hosted-model mode");
    expect(hosted.runtimeSummary).toContain("hosted provider is available");
    expect(unavailable.runtimeSummary).toContain("will fall back to deterministic behavior");
  });
});
