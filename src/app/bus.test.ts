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
        routes: ["/", "/api/health", "/api/app/query", "/api/intent", "/api/intent/clarify", "/api/explanation"],
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
        workflow: {
          name: "intent-classification",
          state: "awaiting_clarification",
          question: 'What do you want to do with "Help": search, create, or explain?',
          options: ["search", "create", "explain"],
        },
      },
    });
  });

  it("resolves a clarification follow-up through the workflow continuation message", async () => {
    const bus = createAppBus(createAppContext(exampleRoutes));

    const result = await bus.dispatch({
      type: "ClarifyUserIntent",
      rawInput: "Help",
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
        workflow: {
          name: "intent-classification",
          state: "completed",
        },
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
