import type { StoredIntentWorkflow } from "../../domain/contracts/workflow";
import type { StoredForagingSession } from "../../domain/contracts/session";

export interface WorkflowRepository {
  saveIntentWorkflow(workflow: StoredIntentWorkflow): Promise<void>;
  getIntentWorkflow(workflowId: string): Promise<StoredIntentWorkflow | null>;
  deleteIntentWorkflow(workflowId: string): Promise<void>;
}

export interface RecentSessionRepository {
  saveRecentSession(session: StoredForagingSession): Promise<void>;
  listRecentSessions(limit: number): Promise<StoredForagingSession[]>;
}
