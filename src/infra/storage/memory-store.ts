import type { StoredForagingArtifact } from "../../domain/contracts/artifact";
import type { StoredIntentWorkflow } from "../../domain/contracts/workflow";
import type { StoredForagingSession } from "../../domain/contracts/session";
import type { RecentSessionRepository, SavedArtifactRepository, WorkflowRepository } from "./repository";

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

export class InMemorySavedArtifactRepository implements SavedArtifactRepository {
  private readonly artifacts: StoredForagingArtifact[] = [];

  async saveArtifact(artifact: StoredForagingArtifact): Promise<void> {
    this.artifacts.unshift(artifact);

    if (this.artifacts.length > 24) {
      this.artifacts.length = 24;
    }
  }

  async updateArtifact(artifact: StoredForagingArtifact): Promise<void> {
    const index = this.artifacts.findIndex((item) => item.artifactId === artifact.artifactId);

    if (index < 0) {
      throw new Error(`Artifact ${artifact.artifactId} was not found.`);
    }

    this.artifacts[index] = artifact;
  }

  async getArtifact(artifactId: string): Promise<StoredForagingArtifact | null> {
    return this.artifacts.find((artifact) => artifact.artifactId === artifactId) ?? null;
  }

  async listArtifacts(limit: number): Promise<StoredForagingArtifact[]> {
    return this.artifacts.slice(0, limit);
  }
}
