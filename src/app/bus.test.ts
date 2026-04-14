import { describe, expect, it } from "vitest";
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
        title: "vibe-template Worker",
        healthPath: "/api/health",
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
          intent: "create",
          confidence: 0.66,
          needsClarification: false,
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
          question: 'What do you want to do with "Help": search, create, or explain?',
          options: ["search", "create", "explain"],
        },
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
          intent: "search",
          confidence: 0.61,
          needsClarification: false,
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
});
