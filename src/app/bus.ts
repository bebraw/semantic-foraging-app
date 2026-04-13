import type { AppResult } from "../domain/contracts/result";
import type { AppContext } from "./context";
import type { AppMessage } from "./message";
import { continueIntentWorkflow } from "./use-cases/continue-intent-workflow";
import { handleUserIntent } from "./use-cases/handle-user-intent";
import { requestExplanation } from "./use-cases/request-explanation";
import { renderScreen } from "./use-cases/render-screen";
import { runHealthCheck } from "./use-cases/run-health-check";

export type AppBus = {
  dispatch(message: AppMessage): Promise<AppResult>;
};

export function createAppBus(context: AppContext): AppBus {
  return {
    async dispatch(message) {
      switch (message.type) {
        case "RenderHomeScreen":
          return await renderScreen(context, message);
        case "RunHealthCheck":
          return await runHealthCheck(context, message);
        case "SubmitUserIntent":
          return await handleUserIntent(context, message);
        case "ClarifyUserIntent":
          return await continueIntentWorkflow(context, message);
        case "RequestExplanation":
          return await requestExplanation(context, message);
      }
    },
  };
}
