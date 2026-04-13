import type { HealthPayload } from "../../api/health";
import type { ClassifiedIntent } from "../agents/intent-agent";
import type { ConfidenceBand } from "../policies/confidence";
import type { Provenance } from "../policies/provenance";
import type { ScreenModel } from "./screen";
import type { IntentWorkflow } from "./workflow";

export type ScreenResult = {
  kind: "screen";
  screen: ScreenModel;
};

export type HealthCheckResult = {
  kind: "health";
  payload: HealthPayload;
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

export type AppResult = ScreenResult | HealthCheckResult | IntentResult | ExplanationResult;
