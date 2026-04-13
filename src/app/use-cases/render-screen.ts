import type { AppContext } from "../context";
import type { RenderHomeScreenMessage } from "../message";
import type { ScreenResult } from "../../domain/contracts/result";

export async function renderScreen(context: AppContext, message: RenderHomeScreenMessage): Promise<ScreenResult> {
  switch (message.type) {
    case "RenderHomeScreen":
      context.trace.addEvent({
        module: "app.use-cases.render-screen",
        messageType: message.type,
        notes: ["screen:home"],
      });

      return {
        kind: "screen",
        screen: {
          kind: "home",
          eyebrow: "Starter Surface",
          title: "vibe-template Worker",
          description: "A minimal Cloudflare Worker baseline for experiments, tests, and local CI.",
          overviewTitle: "What this gives you",
          overviewBody:
            "A concrete Worker entry point, a simple HTML page, a health endpoint, and testable flows that keep the template green from the start.",
          routesTitle: "Available routes",
          nextStepsTitle: "Next steps",
          nextStepsBody:
            "Replace this stub with your real feature work, update the relevant spec, and keep the quality gate passing as the app evolves.",
          healthPath: "/api/health",
          routes: context.routes,
        },
      };
  }
}
