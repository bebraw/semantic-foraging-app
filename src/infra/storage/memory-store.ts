import type { StoredIntentWorkflow } from "../../domain/contracts/workflow";
import type { StoredForagingSession } from "../../domain/contracts/session";
import type { RecentSessionRepository, WorkflowRepository } from "./repository";

export class InMemoryWorkflowRepository implements WorkflowRepository {
  private readonly intentWorkflows = new Map<string, StoredIntentWorkflow>();

  async saveIntentWorkflow(workflow: StoredIntentWorkflow): Promise<void> {
    this.intentWorkflows.set(workflow.workflowId, workflow);
  }

  async getIntentWorkflow(workflowId: string): Promise<StoredIntentWorkflow | null> {
    return this.intentWorkflows.get(workflowId) ?? null;
  }

  async deleteIntentWorkflow(workflowId: string): Promise<void> {
    this.intentWorkflows.delete(workflowId);
  }
}

export class InMemoryRecentSessionRepository implements RecentSessionRepository {
  private readonly recentSessions: StoredForagingSession[] = [];

  async saveRecentSession(session: StoredForagingSession): Promise<void> {
    this.recentSessions.unshift(session);

    if (this.recentSessions.length > 12) {
      this.recentSessions.length = 12;
    }
  }

  async listRecentSessions(limit: number): Promise<StoredForagingSession[]> {
    return this.recentSessions.slice(0, limit);
  }
}
