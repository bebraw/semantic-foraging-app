import type { AppRoute } from "../app-routes";
import type { ModelProvider } from "../infra/llm/provider";
import { createRequestTrace, observeModelProvider, type RequestTrace } from "../infra/observability/trace";

export type AppContext = {
  appName: string;
  routes: AppRoute[];
  modelProvider: ModelProvider | null;
  trace: RequestTrace;
};

export function createAppContext(
  routes: AppRoute[],
  modelProvider: ModelProvider | null = null,
  trace: RequestTrace = createRequestTrace("unknown"),
): AppContext {
  return {
    appName: "vibe-template-worker",
    routes,
    modelProvider: observeModelProvider(trace, modelProvider),
    trace,
  };
}
