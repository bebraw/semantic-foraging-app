import {
  createHomeScreenModel,
  createInitialForagingWorkbenchState,
  createWorkbenchAlert,
  withWorkbenchAlert,
} from "../../domain/agents/ui-agent";
import type { AppErrorResult, ScreenResult } from "../../domain/contracts/result";
import { getRuntimeModelCapability } from "../../infra/llm/runtime-capability";
import type { AppContext } from "../context";
import type { RenderHomeScreenMessage } from "../message";

export async function renderScreen(context: AppContext, message: RenderHomeScreenMessage): Promise<ScreenResult | AppErrorResult> {
  switch (message.type) {
    case "RenderHomeScreen":
      const runtime = await getRuntimeModelCapability(context.modelProvider);
      let workbench = message.workbench ?? createInitialForagingWorkbenchState();

      try {
        workbench = {
          ...workbench,
          recentSessions: await context.recentSessionRepository.listRecentSessions(5),
        };
      } catch {
        workbench = withWorkbenchAlert(
          workbench,
          createWorkbenchAlert(
            "Recent sessions unavailable",
            "Recent sessions could not be loaded, so the workbench is showing an empty session list.",
            "info",
          ),
        );

        context.trace.addEvent({
          module: "app.use-cases.render-screen",
          messageType: message.type,
          notes: ["recent-sessions:list-failed"],
        });
      }

      context.trace.addEvent({
        module: "app.use-cases.render-screen",
        messageType: message.type,
        notes: ["screen:home", `runtime-mode:${runtime.mode}`, `runtime-provider:${runtime.provider ?? "none"}`],
      });

      const basemap = context.geodataProvider.getBasemap();
      const overlay = await context.geodataProvider.loadObservationOverlay(
        workbench.intent.latestSubmission?.classification.cues ?? {
          species: [],
          habitat: [],
          region: [],
          season: [],
        },
      );

      return {
        kind: "screen",
        screen: createHomeScreenModel({
          routes: context.routes,
          runtime,
          traceId: context.trace.id,
          workbench,
          basemap,
          overlay,
        }),
      };
  }
}
