import type { StoredIntentWorkflow } from "../../domain/contracts/workflow";

export interface WorkflowRepository {
  saveIntentWorkflow(workflow: StoredIntentWorkflow): Promise<void>;
  getIntentWorkflow(workflowId: string): Promise<StoredIntentWorkflow | null>;
}
