import type { AppRoute } from "../app-routes";
import { createGeodataProvider, type GeodataProvider } from "../infra/geodata";
import type { ModelProvider } from "../infra/llm/provider";
import { createRequestTrace, observeModelProvider, type RequestTrace } from "../infra/observability/trace";
import {
  InMemoryRecentSessionRepository,
  InMemorySavedArtifactRepository,
  InMemoryWorkflowRepository,
} from "../infra/storage/memory-store";
import type { RecentSessionRepository, SavedArtifactRepository, WorkflowRepository } from "../infra/storage/repository";

export type AppContext = {
  appName: string;
  routes: AppRoute[];
  modelProvider: ModelProvider | null;
  geodataProvider: GeodataProvider;
  trace: RequestTrace;
  workflowRepository: WorkflowRepository;
  recentSessionRepository: RecentSessionRepository;
  savedArtifactRepository: SavedArtifactRepository;
};

export function createAppContext(
  routes: AppRoute[],
  modelProvider: ModelProvider | null = null,
  trace: RequestTrace = createRequestTrace("unknown"),
  workflowRepository: WorkflowRepository = new InMemoryWorkflowRepository(),
  recentSessionRepository: RecentSessionRepository = new InMemoryRecentSessionRepository(),
  geodataProvider: GeodataProvider = createGeodataProvider(),
  savedArtifactRepository: SavedArtifactRepository = new InMemorySavedArtifactRepository(),
): AppContext {
  return {
    appName: "vibe-template-worker",
    routes,
    modelProvider: observeModelProvider(trace, modelProvider),
    geodataProvider,
    trace,
    workflowRepository,
    recentSessionRepository,
    savedArtifactRepository,
  };
}
