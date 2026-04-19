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
        workbenchTitle: "Manual flow rehearsal",
        intentWorkbench: expect.objectContaining({
          actionPath: "/actions/intent",
          rawInputValue: "Find chanterelle notes",
        }),
        explanationWorkbench: expect.objectContaining({
          actionPath: "/actions/explanation",
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
