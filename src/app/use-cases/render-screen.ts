import { createHomeScreenModel, createInitialForagingWorkbenchState } from "../../domain/agents/ui-agent";
import type { ScreenResult } from "../../domain/contracts/result";
import { getRuntimeModelCapability } from "../../infra/llm/runtime-capability";
import type { AppContext } from "../context";
import type { RenderHomeScreenMessage } from "../message";

export async function renderScreen(context: AppContext, message: RenderHomeScreenMessage): Promise<ScreenResult> {
  switch (message.type) {
    case "RenderHomeScreen":
      const runtime = await getRuntimeModelCapability(context.modelProvider);

      context.trace.addEvent({
        module: "app.use-cases.render-screen",
        messageType: message.type,
        notes: ["screen:home", `runtime-mode:${runtime.mode}`, `runtime-provider:${runtime.provider ?? "none"}`],
      });

      return {
        kind: "screen",
        screen: createHomeScreenModel({
          routes: context.routes,
          runtime,
          traceId: context.trace.id,
          workbench: message.workbench ?? createInitialForagingWorkbenchState(),
        }),
      };
  }
}
