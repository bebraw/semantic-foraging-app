import type { StoredIntentWorkflow } from "../../domain/contracts/workflow";
import type { WorkflowRepository } from "./repository";

export class InMemoryWorkflowRepository implements WorkflowRepository {
  private readonly intentWorkflows = new Map<string, StoredIntentWorkflow>();

  async saveIntentWorkflow(workflow: StoredIntentWorkflow): Promise<void> {
    this.intentWorkflows.set(workflow.workflowId, workflow);
  }

  async getIntentWorkflow(workflowId: string): Promise<StoredIntentWorkflow | null> {
    return this.intentWorkflows.get(workflowId) ?? null;
  }
}
