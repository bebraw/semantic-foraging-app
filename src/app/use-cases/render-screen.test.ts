import { describe, expect, it, vi } from "vitest";
import { exampleRoutes } from "../../app-routes";
import { createAppContext } from "../context";
import { renderScreen } from "./render-screen";

describe("renderScreen", () => {
  it("returns a typed home screen result", async () => {
    const result = await renderScreen(createAppContext(exampleRoutes), {
      type: "RenderHomeScreen",
    });

    expect(result).toEqual({
      kind: "screen",
      screen: expect.objectContaining({
        kind: "home",
        title: "Foraging Search",
        presentation: expect.objectContaining({
          primaryKind: "empty",
        }),
      }),
    });
  });

  it("adds informational alerts when recent sessions and saved artifacts cannot be listed", async () => {
    const context = createAppContext(
      exampleRoutes,
      null,
      undefined,
      undefined,
      {
        saveRecentSession: vi.fn(),
        listRecentSessions: vi.fn().mockRejectedValue(new Error("recent sessions unavailable")),
      },
      undefined,
      {
        saveArtifact: vi.fn(),
        updateArtifact: vi.fn(),
        getArtifact: vi.fn(),
        listArtifacts: vi.fn().mockRejectedValue(new Error("saved artifacts unavailable")),
      },
    );

    const result = await renderScreen(context, {
      type: "RenderHomeScreen",
    });

    expect(result).toEqual({
      kind: "screen",
      screen: expect.objectContaining({
        alerts: [
          {
            tone: "info",
            title: "Recent sessions unavailable",
            body: "Recent sessions could not be loaded, so the workbench is showing an empty session list.",
          },
          {
            tone: "info",
            title: "Saved artifacts unavailable",
            body: "Saved artifacts could not be loaded, so the workbench is showing an empty artifact list.",
          },
        ],
      }),
    });
    expect(context.trace.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: "app.use-cases.render-screen",
          notes: expect.arrayContaining(["recent-sessions:list-failed"]),
        }),
        expect.objectContaining({
          module: "app.use-cases.render-screen",
          notes: expect.arrayContaining(["saved-artifacts:list-failed"]),
        }),
      ]),
    );
  });
});
