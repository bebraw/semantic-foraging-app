import type { AppRoute } from "../app-routes";
import type { ModelProvider } from "../infra/llm/provider";
import { createRequestTrace, observeModelProvider, type RequestTrace } from "../infra/observability/trace";
import { InMemoryRecentSessionRepository, InMemoryWorkflowRepository } from "../infra/storage/memory-store";
import type { RecentSessionRepository, WorkflowRepository } from "../infra/storage/repository";

export type AppContext = {
  appName: string;
  routes: AppRoute[];
  modelProvider: ModelProvider | null;
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
): AppContext {
  return {
    appName: "vibe-template-worker",
    routes,
    modelProvider: observeModelProvider(trace, modelProvider),
    trace,
    workflowRepository,
    recentSessionRepository,
  };
}
