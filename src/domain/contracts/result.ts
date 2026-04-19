import type { HealthPayload } from "../../api/health";
import type { ClassifiedIntent } from "../agents/intent-agent";
import type { StoredForagingArtifact } from "./artifact";
import type { RuntimeModelCapability } from "./model-runtime";
import type { ConfidenceBand } from "../policies/confidence";
import type { Provenance } from "../policies/provenance";
import type { ScreenModel } from "./screen";
import type { IntentWorkflow } from "./workflow";

export type ScreenResult = {
  kind: "screen";
  screen: ScreenModel;
};

export type AppErrorCategory =
  | "validation_error"
  | "unsupported_workflow_transition"
  | "storage_failure"
  | "model_timeout"
  | "model_schema_failure"
  | "rendering_failure";

export type AppErrorResult = {
  kind: "error";
  error: {
    category: AppErrorCategory;
    message: string;
    status: number;
  };
};

export type HealthCheckResult = {
  kind: "health";
  payload: HealthPayload;
};

export type ModelRuntimeResult = {
  kind: "model-runtime";
  payload: RuntimeModelCapability;
};

export type IntentResult = {
  kind: "intent";
  payload: {
    input: string;
    classification: ClassifiedIntent;
    confidenceBand: ConfidenceBand;
    provenance: Provenance;
    workflow: IntentWorkflow;
  };
};

export type ExplanationResult = {
  kind: "explanation";
  payload: {
    title: string;
    facts: string[];
    explanation: string;
    provenance: Provenance;
  };
};

export type SavedArtifactResult = {
  kind: "saved-artifact";
  payload: StoredForagingArtifact;
};

export type AppResult =
  | ScreenResult
  | HealthCheckResult
  | ModelRuntimeResult
  | IntentResult
  | ExplanationResult
  | SavedArtifactResult
  | AppErrorResult;

export function createAppErrorResult(category: AppErrorCategory, message: string, status: number): AppErrorResult {
  return {
    kind: "error",
    error: {
      category,
      message,
      status,
    },
  };
}
