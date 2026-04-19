import type { AppRoute } from "../app-routes";
import { createGeodataProvider, type GeodataProvider } from "../infra/geodata";
import type { ModelProvider } from "../infra/llm/provider";
import { createRequestTrace, observeModelProvider, type RequestTrace } from "../infra/observability/trace";
import { InMemoryRecentSessionRepository, InMemoryWorkflowRepository } from "../infra/storage/memory-store";
import type { RecentSessionRepository, WorkflowRepository } from "../infra/storage/repository";

export type AppContext = {
  appName: string;
  routes: AppRoute[];
  modelProvider: ModelProvider | null;
  geodataProvider: GeodataProvider;
  trace: RequestTrace;
  workflowRepository: WorkflowRepository;
  recentSessionRepository: RecentSessionRepository;
};

export function createAppContext(
  routes: AppRoute[],
  modelProvider: ModelProvider | null = null,
  trace: RequestTrace = createRequestTrace("unknown"),
  workflowRepository: WorkflowRepository = new InMemoryWorkflowRepository(),
  recentSessionRepository: RecentSessionRepository = new InMemoryRecentSessionRepository(),
  geodataProvider: GeodataProvider = createGeodataProvider(),
): AppContext {
  return {
    appName: "vibe-template-worker",
    routes,
    modelProvider: observeModelProvider(trace, modelProvider),
    geodataProvider,
    trace,
    workflowRepository,
    recentSessionRepository,
  };
}
