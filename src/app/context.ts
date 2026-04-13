import type { AppRoute } from "../app-routes";
import type { ModelProvider } from "../infra/llm/provider";

export type AppContext = {
  appName: string;
  routes: AppRoute[];
  modelProvider: ModelProvider | null;
};

export function createAppContext(routes: AppRoute[], modelProvider: ModelProvider | null = null): AppContext {
  return {
    appName: "vibe-template-worker",
    routes,
    modelProvider,
  };
}
