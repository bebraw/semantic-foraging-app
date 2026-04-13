import type { AppResult } from "../domain/contracts/result";
import type { AppContext } from "./context";
import type { AppMessage } from "./message";
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
      }
    },
  };
}
