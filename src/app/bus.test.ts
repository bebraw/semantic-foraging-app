import { describe, expect, it } from "vitest";
import { exampleRoutes } from "../app-routes";
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
        routes: ["/", "/api/health", "/api/intent"],
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
      },
    });
  });
});
