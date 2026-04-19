import type { AppResult } from "../domain/contracts/result";
import { traceOperation } from "../infra/observability/trace";
import type { AppContext } from "./context";
import type { AppMessage } from "./message";
import { continueIntentWorkflow } from "./use-cases/continue-intent-workflow";
import { handleUserIntent } from "./use-cases/handle-user-intent";
import { inspectModelRuntime } from "./use-cases/inspect-model-runtime";
import { requestExplanation } from "./use-cases/request-explanation";
import { refineSavedArtifact } from "./use-cases/refine-saved-artifact";
import { renderScreen } from "./use-cases/render-screen";
import { runHealthCheck } from "./use-cases/run-health-check";
import { saveArtifact } from "./use-cases/save-artifact";
import { loadSavedArtifact } from "./use-cases/load-saved-artifact";

export type AppBus = {
  dispatch(message: AppMessage): Promise<AppResult>;
};

export function createAppBus(context: AppContext): AppBus {
  return {
    async dispatch(message) {
      return await traceOperation(context.trace, "app.bus", message.type, async () => {
        switch (message.type) {
          case "RenderHomeScreen":
            return await renderScreen(context, message);
          case "RunHealthCheck":
            return await runHealthCheck(context, message);
          case "InspectModelRuntime":
            return await inspectModelRuntime(context, message);
          case "SubmitUserIntent":
            return await handleUserIntent(context, message);
          case "ClarifyUserIntent":
            return await continueIntentWorkflow(context, message);
          case "RequestExplanation":
            return await requestExplanation(context, message);
          case "SaveArtifact":
            return await saveArtifact(context, message);
          case "LoadSavedArtifact":
            return await loadSavedArtifact(context, message);
          case "RefineSavedArtifact":
            return await refineSavedArtifact(context, message);
        }
      });
    },
  };
}
