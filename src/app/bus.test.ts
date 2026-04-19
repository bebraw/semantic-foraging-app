import { describe, expect, it, vi } from "vitest";
import { exampleRoutes } from "../app-routes";
import { createRequestTrace } from "../infra/observability/trace";
import { createAppBus } from "./bus";
import { createAppContext } from "./context";

describe("createAppBus", () => {
  it("returns a home screen model for the home query", async () => {
    const bus = createAppBus(createAppContext(exampleRoutes));

    const result = await bus.dispatch({ type: "RenderHomeScreen" });

    expect(result).toEqual({
      kind: "screen",
      screen: expect.objectContaining({
        kind: "home",
        title: "Foraging Workbench",
        healthPath: "/api/health",
        workbenchTitle: "Intent workbench",
        recentSessionsTitle: "Recent sessions",
        routes: exampleRoutes,
        meta: {
          traceId: expect.any(String),
        },
      }),
    });
  });

  it("returns the stable health payload for the health query", async () => {
    const bus = createAppBus(createAppContext(exampleRoutes));

    const result = await bus.dispatch({ type: "RunHealthCheck" });

    expect(result).toEqual({
      kind: "health",
      payload: {
        ok: true,
        name: "vibe-template-worker",
        routes: ["/", "/api/health", "/api/app/command", "/api/app/query", "/api/intent", "/api/intent/clarify", "/api/explanation"],
      },
    });
  });

  it("returns the typed runtime capability payload for no-model mode", async () => {
    const bus = createAppBus(createAppContext(exampleRoutes));

    const result = await bus.dispatch({ type: "InspectModelRuntime" });

    expect(result).toEqual({
      kind: "model-runtime",
      payload: {
        mode: "no-model",
        provider: null,
        available: false,
        supportsStructuredOutput: false,
        supportsStreaming: false,
        maxContextClass: "unknown",
      },
    });
  });

  it("returns a deterministic intent result for command messages without a model provider", async () => {
    const bus = createAppBus(createAppContext(exampleRoutes));

    const result = await bus.dispatch({
      type: "SubmitUserIntent",
      rawInput: "Create a new note",
    });

    expect(result).toEqual({
      kind: "intent",
      payload: {
        input: "Create a new note",
        classification: {
          intent: "create-field-note",
          confidence: 0.74,
          needsClarification: false,
          cues: {
            species: [],
            habitat: [],
            region: [],
            season: [],
          },
          missing: ["species", "region"],
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
      },
    });
  });

  it("returns an awaiting-clarification workflow for ambiguous intent commands", async () => {
    const bus = createAppBus(createAppContext(exampleRoutes));

    const result = await bus.dispatch({
      type: "SubmitUserIntent",
      rawInput: "Help",
    });

    expect(result).toEqual({
      kind: "intent",
      payload: {
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
          workflowId: expect.any(String),
          question:
            'What kind of foraging task does "Help" describe: find observations, create a field note, inspect a patch, explain a suggestion, or resume a session?',
          options: ["find-observations", "create-field-note", "inspect-patch", "explain-suggestion", "resume-session"],
        },
      },
    });
  });

  it("returns a typed storage error when workflow state cannot be stored", async () => {
    const bus = createAppBus(
      createAppContext(exampleRoutes, null, createRequestTrace("unknown"), {
        saveIntentWorkflow: vi.fn().mockRejectedValue(new Error("storage unavailable")),
        getIntentWorkflow: vi.fn(),
        deleteIntentWorkflow: vi.fn(),
      }),
    );

    const result = await bus.dispatch({
      type: "SubmitUserIntent",
      rawInput: "Help",
    });

    expect(result).toEqual({
      kind: "error",
      error: {
        category: "storage_failure",
        message: "Workflow state could not be stored.",
        status: 503,
      },
    });
  });

  it("returns a typed storage error when recent session state cannot be stored for completed intents", async () => {
    const bus = createAppBus(
      createAppContext(
        exampleRoutes,
        null,
        createRequestTrace("unknown"),
        {
          saveIntentWorkflow: vi.fn(),
          getIntentWorkflow: vi.fn(),
          deleteIntentWorkflow: vi.fn(),
        },
        {
          saveRecentSession: vi.fn().mockRejectedValue(new Error("storage unavailable")),
          listRecentSessions: vi.fn().mockResolvedValue([]),
        },
      ),
    );

    const result = await bus.dispatch({
      type: "SubmitUserIntent",
      rawInput: "Create a new note",
    });

    expect(result).toEqual({
      kind: "error",
      error: {
        category: "storage_failure",
        message: "Recent session state could not be stored.",
        status: 503,
      },
    });
  });

  it("resolves a clarification follow-up through the workflow continuation message", async () => {
    const context = createAppContext(exampleRoutes);
    const bus = createAppBus(context);

    const initial = await bus.dispatch({
      type: "SubmitUserIntent",
      rawInput: "Help",
    });

    if (initial.kind !== "intent" || initial.payload.workflow.state !== "awaiting_clarification") {
      throw new Error("Expected an awaiting clarification workflow");
    }

    const result = await bus.dispatch({
      type: "ClarifyUserIntent",
      workflowId: initial.payload.workflow.workflowId,
      clarification: "Search for similar notes",
    });

    expect(result).toEqual({
      kind: "intent",
      payload: {
        input: "Help",
        classification: {
          intent: "find-observations",
          confidence: 0.69,
          needsClarification: false,
          cues: {
            species: [],
            habitat: [],
            region: [],
            season: [],
          },
          missing: ["species", "habitat", "region"],
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
      },
    });
  });

  it("returns a typed error result when clarification workflow state is missing", async () => {
    const bus = createAppBus(createAppContext(exampleRoutes));

    const result = await bus.dispatch({
      type: "ClarifyUserIntent",
      workflowId: "missing",
      clarification: "Search for similar notes",
    });

    expect(result).toEqual({
      kind: "error",
      error: {
        category: "unsupported_workflow_transition",
        message: "Workflow state was not found for the provided workflowId.",
        status: 404,
      },
    });
  });

  it("returns a typed storage error when workflow state cannot be loaded", async () => {
    const bus = createAppBus(
      createAppContext(exampleRoutes, null, createRequestTrace("unknown"), {
        saveIntentWorkflow: vi.fn(),
        getIntentWorkflow: vi.fn().mockRejectedValue(new Error("storage unavailable")),
        deleteIntentWorkflow: vi.fn(),
      }),
    );

    const result = await bus.dispatch({
      type: "ClarifyUserIntent",
      workflowId: "workflow-123",
      clarification: "Search for similar notes",
    });

    expect(result).toEqual({
      kind: "error",
      error: {
        category: "storage_failure",
        message: "Workflow state could not be loaded.",
        status: 503,
      },
    });
  });

  it("consumes clarification workflow state after a successful continuation", async () => {
    const context = createAppContext(exampleRoutes);
    const bus = createAppBus(context);

    const initial = await bus.dispatch({
      type: "SubmitUserIntent",
      rawInput: "Help",
    });

    if (initial.kind !== "intent" || initial.payload.workflow.state !== "awaiting_clarification") {
      throw new Error("Expected an awaiting clarification workflow");
    }

    const first = await bus.dispatch({
      type: "ClarifyUserIntent",
      workflowId: initial.payload.workflow.workflowId,
      clarification: "Search for similar notes",
    });
    const second = await bus.dispatch({
      type: "ClarifyUserIntent",
      workflowId: initial.payload.workflow.workflowId,
      clarification: "Search for similar notes",
    });

    expect(first).toMatchObject({
      kind: "intent",
      payload: {
        workflow: {
          state: "completed",
        },
      },
    });
    expect(second).toEqual({
      kind: "error",
      error: {
        category: "unsupported_workflow_transition",
        message: "Workflow state was not found for the provided workflowId.",
        status: 404,
      },
    });
  });

  it("returns a typed storage error when workflow state cannot be cleared", async () => {
    const bus = createAppBus(
      createAppContext(exampleRoutes, null, createRequestTrace("unknown"), {
        saveIntentWorkflow: vi.fn(),
        getIntentWorkflow: vi.fn().mockResolvedValue({
          workflowId: "workflow-123",
          rawInput: "Help",
          state: "awaiting_clarification",
          question:
            'What kind of foraging task does "Help" describe: find observations, create a field note, inspect a patch, explain a suggestion, or resume a session?',
          options: ["find-observations", "create-field-note", "inspect-patch", "explain-suggestion", "resume-session"],
        }),
        deleteIntentWorkflow: vi.fn().mockRejectedValue(new Error("storage unavailable")),
      }),
    );

    const result = await bus.dispatch({
      type: "ClarifyUserIntent",
      workflowId: "workflow-123",
      clarification: "Search for similar notes",
    });

    expect(result).toEqual({
      kind: "error",
      error: {
        category: "storage_failure",
        message: "Workflow state could not be cleared.",
        status: 503,
      },
    });
  });

  it("loads recent sessions into the home screen model", async () => {
    const bus = createAppBus(
      createAppContext(exampleRoutes, null, createRequestTrace("unknown"), undefined, {
        saveRecentSession: vi.fn(),
        listRecentSessions: vi.fn().mockResolvedValue([
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
        ]),
      }),
    );

    const result = await bus.dispatch({ type: "RenderHomeScreen" });

    expect(result).toEqual({
      kind: "screen",
      screen: expect.objectContaining({
        recentSessions: [expect.objectContaining({ sessionId: "session-1" })],
      }),
    });
  });

  it("loads saved artifacts into the home screen model", async () => {
    const bus = createAppBus(
      createAppContext(exampleRoutes, null, createRequestTrace("unknown"), undefined, undefined, undefined, {
        saveArtifact: vi.fn(),
        updateArtifact: vi.fn(),
        getArtifact: vi.fn(),
        listArtifacts: vi.fn().mockResolvedValue([
          {
            artifactId: "trail-1",
            sourceCardId: "trail-card-1",
            kind: "trail",
            title: "Saved trail",
            summary: "Saved trail summary",
            notes: "Start from the damper side.",
            sourceIntent: "explain-suggestion",
            cues: {
              species: ["chanterelle"],
              habitat: [],
              region: [],
              season: [],
            },
            evidence: [],
            spatialContext: {
              species: ["chanterelle"],
              habitat: [],
              region: [],
              season: [],
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
        ]),
      }),
    );

    const result = await bus.dispatch({ type: "RenderHomeScreen" });

    expect(result).toEqual({
      kind: "screen",
      screen: expect.objectContaining({
        savedArtifacts: [expect.objectContaining({ artifactId: "trail-1" })],
      }),
    });
  });

  it("loads one saved artifact through the app bus", async () => {
    const bus = createAppBus(
      createAppContext(exampleRoutes, null, createRequestTrace("unknown"), undefined, undefined, undefined, {
        saveArtifact: vi.fn(),
        updateArtifact: vi.fn(),
        getArtifact: vi.fn().mockResolvedValue({
          artifactId: "trail-1",
          sourceCardId: "trail-card-1",
          kind: "trail",
          title: "Saved trail",
          summary: "Saved trail summary",
          notes: "Start from the damper side.",
          sourceIntent: "explain-suggestion",
          cues: {
            species: ["chanterelle"],
            habitat: [],
            region: [],
            season: [],
          },
          evidence: [],
          spatialContext: {
            species: ["chanterelle"],
            habitat: [],
            region: [],
            season: [],
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
        }),
        listArtifacts: vi.fn().mockResolvedValue([]),
      }),
    );

    const result = await bus.dispatch({ type: "LoadSavedArtifact", artifactId: "trail-1" });

    expect(result).toEqual({
      kind: "saved-artifact",
      payload: expect.objectContaining({ artifactId: "trail-1" }),
    });
  });

  it("loads one saved artifact revision through the app bus", async () => {
    const bus = createAppBus(
      createAppContext(exampleRoutes, null, createRequestTrace("unknown"), undefined, undefined, undefined, {
        saveArtifact: vi.fn(),
        updateArtifact: vi.fn(),
        getArtifact: vi.fn().mockResolvedValue({
          artifactId: "trail-1",
          sourceCardId: "trail-card-1",
          kind: "trail",
          title: "Current trail",
          summary: "Current trail summary",
          notes: "Current notes",
          sourceIntent: "explain-suggestion",
          cues: {
            species: ["chanterelle"],
            habitat: [],
            region: [],
            season: [],
          },
          evidence: [],
          spatialContext: {
            species: ["chanterelle"],
            habitat: [],
            region: [],
            season: [],
          },
          savedAt: "2026-04-19T12:00:00.000Z",
          updatedAt: "2026-04-19T12:45:00.000Z",
          revisions: [
            {
              kind: "saved",
              title: "Saved trail",
              summary: "Saved trail summary",
              notes: "Original notes",
              recordedAt: "2026-04-19T12:00:00.000Z",
            },
            {
              kind: "refined",
              title: "Current trail",
              summary: "Current trail summary",
              notes: "Current notes",
              recordedAt: "2026-04-19T12:45:00.000Z",
            },
          ],
        }),
        listArtifacts: vi.fn().mockResolvedValue([]),
      }),
    );

    const result = await bus.dispatch({
      type: "LoadSavedArtifactRevision",
      artifactId: "trail-1",
      recordedAt: "2026-04-19T12:00:00.000Z",
    });

    expect(result).toEqual({
      kind: "saved-artifact",
      payload: expect.objectContaining({
        artifactId: "trail-1",
        title: "Saved trail",
        summary: "Saved trail summary",
        notes: "Original notes",
      }),
    });
  });

  it("returns a typed error when a saved artifact is missing", async () => {
    const bus = createAppBus(
      createAppContext(exampleRoutes, null, createRequestTrace("unknown"), undefined, undefined, undefined, {
        saveArtifact: vi.fn(),
        updateArtifact: vi.fn(),
        getArtifact: vi.fn().mockResolvedValue(null),
        listArtifacts: vi.fn().mockResolvedValue([]),
      }),
    );

    const result = await bus.dispatch({ type: "LoadSavedArtifact", artifactId: "missing" });

    expect(result).toEqual({
      kind: "error",
      error: {
        category: "validation_error",
        message: "Saved artifact was not found for the provided artifactId.",
        status: 404,
      },
    });
  });

  it("returns a typed error when a saved artifact revision is missing during reuse", async () => {
    const bus = createAppBus(
      createAppContext(exampleRoutes, null, createRequestTrace("unknown"), undefined, undefined, undefined, {
        saveArtifact: vi.fn(),
        updateArtifact: vi.fn(),
        getArtifact: vi.fn().mockResolvedValue({
          artifactId: "trail-1",
          sourceCardId: "trail-card-1",
          kind: "trail",
          title: "Saved trail",
          summary: "Saved trail summary",
          notes: "Current notes",
          sourceIntent: "explain-suggestion",
          cues: {
            species: [],
            habitat: [],
            region: [],
            season: [],
          },
          evidence: [],
          spatialContext: {
            species: [],
            habitat: [],
            region: [],
            season: [],
          },
          savedAt: "2026-04-19T12:00:00.000Z",
          updatedAt: "2026-04-19T12:00:00.000Z",
          revisions: [
            {
              kind: "saved",
              title: "Saved trail",
              summary: "Saved trail summary",
              notes: "Current notes",
              recordedAt: "2026-04-19T12:00:00.000Z",
            },
          ],
        }),
        listArtifacts: vi.fn().mockResolvedValue([]),
      }),
    );

    const result = await bus.dispatch({
      type: "LoadSavedArtifactRevision",
      artifactId: "trail-1",
      recordedAt: "missing",
    });

    expect(result).toEqual({
      kind: "error",
      error: {
        category: "validation_error",
        message: "Saved artifact revision was not found for the provided recordedAt.",
        status: 404,
      },
    });
  });

  it("updates one saved artifact through the app bus", async () => {
    const savedArtifactRepository = {
      saveArtifact: vi.fn(),
      updateArtifact: vi.fn(),
      getArtifact: vi.fn().mockResolvedValue({
        artifactId: "trail-1",
        sourceCardId: "trail-card-1",
        kind: "trail",
        title: "Saved trail",
        summary: "Saved trail summary",
        notes: "Start from the damper side.",
        sourceIntent: "explain-suggestion",
        cues: {
          species: ["chanterelle"],
          habitat: [],
          region: [],
          season: [],
        },
        evidence: [],
        spatialContext: {
          species: ["chanterelle"],
          habitat: [],
          region: [],
          season: [],
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
      }),
      listArtifacts: vi.fn().mockResolvedValue([]),
    };
    const bus = createAppBus(
      createAppContext(exampleRoutes, null, createRequestTrace("unknown"), undefined, undefined, undefined, savedArtifactRepository),
    );

    const result = await bus.dispatch({
      type: "RefineSavedArtifact",
      artifactId: "trail-1",
      title: "Refined trail",
      summary: "Refined trail summary",
      notes: "Recheck the wetter edge before dusk.",
    });

    expect(savedArtifactRepository.updateArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        artifactId: "trail-1",
        title: "Refined trail",
        summary: "Refined trail summary",
        notes: "Recheck the wetter edge before dusk.",
      }),
    );
    expect(result).toEqual({
      kind: "saved-artifact",
      payload: expect.objectContaining({
        artifactId: "trail-1",
        title: "Refined trail",
        summary: "Refined trail summary",
        notes: "Recheck the wetter edge before dusk.",
      }),
    });
  });

  it("restores one saved artifact revision through the app bus", async () => {
    const savedArtifactRepository = {
      saveArtifact: vi.fn(),
      updateArtifact: vi.fn(),
      getArtifact: vi.fn().mockResolvedValue({
        artifactId: "trail-1",
        sourceCardId: "trail-card-1",
        kind: "trail",
        title: "Current trail",
        summary: "Current summary",
        notes: "Current notes",
        sourceIntent: "explain-suggestion",
        cues: {
          species: ["chanterelle"],
          habitat: [],
          region: [],
          season: [],
        },
        evidence: [],
        spatialContext: {
          species: ["chanterelle"],
          habitat: [],
          region: [],
          season: [],
        },
        savedAt: "2026-04-19T12:00:00.000Z",
        updatedAt: "2026-04-19T12:45:00.000Z",
        revisions: [
          {
            kind: "saved",
            title: "Saved trail",
            summary: "Saved trail summary",
            notes: "Original notes",
            recordedAt: "2026-04-19T12:00:00.000Z",
          },
          {
            kind: "refined",
            title: "Current trail",
            summary: "Current summary",
            notes: "Current notes",
            recordedAt: "2026-04-19T12:45:00.000Z",
          },
        ],
      }),
      listArtifacts: vi.fn().mockResolvedValue([]),
    };
    const bus = createAppBus(
      createAppContext(exampleRoutes, null, createRequestTrace("unknown"), undefined, undefined, undefined, savedArtifactRepository),
    );

    const result = await bus.dispatch({
      type: "RestoreSavedArtifactRevision",
      artifactId: "trail-1",
      recordedAt: "2026-04-19T12:00:00.000Z",
    });

    expect(savedArtifactRepository.updateArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        artifactId: "trail-1",
        title: "Saved trail",
        summary: "Saved trail summary",
        notes: "Original notes",
        revisions: expect.arrayContaining([
          expect.objectContaining({
            kind: "restored",
            title: "Saved trail",
            summary: "Saved trail summary",
            notes: "Original notes",
          }),
        ]),
      }),
    );
    expect(result).toEqual({
      kind: "saved-artifact",
      payload: expect.objectContaining({
        artifactId: "trail-1",
        title: "Saved trail",
        summary: "Saved trail summary",
        notes: "Original notes",
      }),
    });
  });

  it("returns a typed error when refining a missing saved artifact", async () => {
    const bus = createAppBus(
      createAppContext(exampleRoutes, null, createRequestTrace("unknown"), undefined, undefined, undefined, {
        saveArtifact: vi.fn(),
        updateArtifact: vi.fn(),
        getArtifact: vi.fn().mockResolvedValue(null),
        listArtifacts: vi.fn().mockResolvedValue([]),
      }),
    );

    const result = await bus.dispatch({
      type: "RefineSavedArtifact",
      artifactId: "missing",
      title: "Refined trail",
      summary: "Refined trail summary",
      notes: "Recheck the wetter edge before dusk.",
    });

    expect(result).toEqual({
      kind: "error",
      error: {
        category: "validation_error",
        message: "Saved artifact was not found for the provided artifactId.",
        status: 404,
      },
    });
  });

  it("returns a typed error when a saved artifact revision is missing", async () => {
    const bus = createAppBus(
      createAppContext(exampleRoutes, null, createRequestTrace("unknown"), undefined, undefined, undefined, {
        saveArtifact: vi.fn(),
        updateArtifact: vi.fn(),
        getArtifact: vi.fn().mockResolvedValue({
          artifactId: "trail-1",
          sourceCardId: "trail-card-1",
          kind: "trail",
          title: "Saved trail",
          summary: "Saved trail summary",
          notes: "Current notes",
          sourceIntent: "explain-suggestion",
          cues: {
            species: [],
            habitat: [],
            region: [],
            season: [],
          },
          evidence: [],
          spatialContext: {
            species: [],
            habitat: [],
            region: [],
            season: [],
          },
          savedAt: "2026-04-19T12:00:00.000Z",
          updatedAt: "2026-04-19T12:00:00.000Z",
          revisions: [
            {
              kind: "saved",
              title: "Saved trail",
              summary: "Saved trail summary",
              notes: "Current notes",
              recordedAt: "2026-04-19T12:00:00.000Z",
            },
          ],
        }),
        listArtifacts: vi.fn().mockResolvedValue([]),
      }),
    );

    const result = await bus.dispatch({
      type: "RestoreSavedArtifactRevision",
      artifactId: "trail-1",
      recordedAt: "missing",
    });

    expect(result).toEqual({
      kind: "error",
      error: {
        category: "validation_error",
        message: "Saved artifact revision was not found for the provided recordedAt.",
        status: 404,
      },
    });
  });

  it("returns a typed storage error when saved artifacts cannot be refined", async () => {
    const bus = createAppBus(
      createAppContext(exampleRoutes, null, createRequestTrace("unknown"), undefined, undefined, undefined, {
        saveArtifact: vi.fn(),
        updateArtifact: vi.fn().mockRejectedValue(new Error("storage unavailable")),
        getArtifact: vi.fn().mockResolvedValue({
          artifactId: "trail-1",
          sourceCardId: "trail-card-1",
          kind: "trail",
          title: "Saved trail",
          summary: "Saved trail summary",
          notes: "Start from the damper side.",
          sourceIntent: "explain-suggestion",
          cues: {
            species: [],
            habitat: [],
            region: [],
            season: [],
          },
          evidence: [],
          spatialContext: {
            species: [],
            habitat: [],
            region: [],
            season: [],
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
        }),
        listArtifacts: vi.fn().mockResolvedValue([]),
      }),
    );

    const result = await bus.dispatch({
      type: "RefineSavedArtifact",
      artifactId: "trail-1",
      title: "Refined trail",
      summary: "Refined trail summary",
      notes: "Recheck the wetter edge before dusk.",
    });

    expect(result).toEqual({
      kind: "error",
      error: {
        category: "storage_failure",
        message: "Saved artifact state could not be updated.",
        status: 503,
      },
    });
  });

  it("returns a deterministic explanation result for query messages without a model provider", async () => {
    const bus = createAppBus(createAppContext(exampleRoutes));

    const result = await bus.dispatch({
      type: "RequestExplanation",
      title: "Search result selected",
      facts: ["The query matched the title", "The result has a recent timestamp"],
    });

    expect(result).toEqual({
      kind: "explanation",
      payload: {
        title: "Search result selected",
        facts: ["The query matched the title", "The result has a recent timestamp"],
        explanation: "Search result selected. This result is based on the available structured information in the application.",
        provenance: {
          source: "deterministic-fallback",
          provider: null,
          reason: "no-model-provider",
        },
      },
    });
  });

  it("stores supported candidate cards as saved artifacts", async () => {
    const bus = createAppBus(createAppContext(exampleRoutes));

    const result = await bus.dispatch({
      type: "SaveArtifact",
      sourceIntent: "create-field-note",
      candidate: {
        id: "field-note-scaffold",
        kind: "field-note",
        title: "Field note scaffold",
        summary: "A starter note seeded from the current request.",
        statusLabel: "Draft note",
        evidence: [
          {
            label: "Intent fit",
            detail: "The request was classified as create-field-note.",
          },
        ],
        spatialContext: {
          species: ["chanterelle"],
          habitat: ["spruce"],
          region: ["helsinki"],
          season: ["autumn"],
        },
      },
    });

    expect(result).toEqual({
      kind: "saved-artifact",
      payload: expect.objectContaining({
        artifactId: expect.stringMatching(/^field-note-/),
        sourceCardId: "field-note-scaffold",
        kind: "field-note",
        sourceIntent: "create-field-note",
      }),
    });
  });

  it("rejects unsupported candidate kinds in the save-artifact flow", async () => {
    const bus = createAppBus(createAppContext(exampleRoutes));

    const result = await bus.dispatch({
      type: "SaveArtifact",
      sourceIntent: "find-observations",
      candidate: {
        id: "observation-autumn-chanterelle-cluster",
        kind: "observation",
        title: "Autumn chanterelle cluster",
        summary: "Observation lead.",
        statusLabel: "Observation cluster",
        evidence: [],
        spatialContext: {
          species: ["chanterelle"],
          habitat: ["spruce"],
          region: ["helsinki"],
          season: ["autumn"],
        },
      },
    });

    expect(result).toEqual({
      kind: "error",
      error: {
        category: "validation_error",
        message: "This candidate cannot be saved as a durable artifact.",
        status: 400,
      },
    });
  });

  it("returns a typed storage error when saved artifacts cannot be stored", async () => {
    const bus = createAppBus(
      createAppContext(exampleRoutes, null, createRequestTrace("unknown"), undefined, undefined, undefined, {
        saveArtifact: vi.fn().mockRejectedValue(new Error("storage unavailable")),
        updateArtifact: vi.fn(),
        getArtifact: vi.fn(),
        listArtifacts: vi.fn().mockResolvedValue([]),
      }),
    );

    const result = await bus.dispatch({
      type: "SaveArtifact",
      sourceIntent: "inspect-patch",
      candidate: {
        id: "patch-mossy-spruce-hollow",
        kind: "patch",
        title: "Mossy spruce hollow",
        summary: "Patch lead.",
        statusLabel: "Patch candidate",
        evidence: [],
        spatialContext: {
          species: ["chanterelle"],
          habitat: ["spruce", "wet"],
          region: ["helsinki"],
          season: ["autumn"],
        },
      },
    });

    expect(result).toEqual({
      kind: "error",
      error: {
        category: "storage_failure",
        message: "Saved artifact state could not be stored.",
        status: 503,
      },
    });
  });

  it("records trace events for dispatched app messages", async () => {
    const trace = createRequestTrace("/api/health");
    const context = createAppContext(exampleRoutes, null, trace);
    const bus = createAppBus(context);

    await bus.dispatch({ type: "RunHealthCheck" });

    expect(trace.events).toEqual([
      expect.objectContaining({
        module: "app.use-cases.run-health-check",
        messageType: "RunHealthCheck",
      }),
      expect.objectContaining({
        module: "app.bus",
        messageType: "RunHealthCheck",
      }),
    ]);
  });

  it("records provenance reasons in intent trace notes", async () => {
    const trace = createRequestTrace("/api/intent");
    const bus = createAppBus(createAppContext(exampleRoutes, null, trace));

    await bus.dispatch({
      type: "SubmitUserIntent",
      rawInput: "Create a new note",
    });

    expect(trace.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: "app.use-cases.handle-user-intent",
          messageType: "SubmitUserIntent",
          notes: expect.arrayContaining([
            "provenance:deterministic-fallback",
            "provenance-reason:no-model-provider",
            "missing:species|region",
          ]),
        }),
      ]),
    );
  });

  it("records provenance reasons in explanation trace notes", async () => {
    const trace = createRequestTrace("/api/explanation");
    const bus = createAppBus(createAppContext(exampleRoutes, null, trace));

    await bus.dispatch({
      type: "RequestExplanation",
      title: "Search result selected",
      facts: ["The query matched the title", "The result has a recent timestamp"],
    });

    expect(trace.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: "app.use-cases.request-explanation",
          messageType: "RequestExplanation",
          notes: expect.arrayContaining(["provenance:deterministic-fallback", "provenance-reason:no-model-provider"]),
        }),
      ]),
    );
  });
});
