import type { ClassifiedIntent } from "../agents/intent-agent";
import type { ConfidenceBand } from "../policies/confidence";
import type { Provenance } from "../policies/provenance";
import type { IntentWorkflow } from "./workflow";

export type WorkbenchAlert = {
  tone: "info" | "error";
  title: string;
  body: string;
};

export type ForagingIntentSubmissionState = {
  input: string;
  classification: ClassifiedIntent;
  confidenceBand: ConfidenceBand;
  provenance: Provenance;
  workflow: IntentWorkflow;
};

export type ExplanationSubmissionState = {
  title: string;
  facts: string[];
  explanation: string;
  provenance: Provenance;
};

export type IntentWorkbenchState = {
  rawInput: string;
  clarification: string;
  latestSubmission?: ForagingIntentSubmissionState;
};

export type ExplanationWorkbenchState = {
  title: string;
  factsText: string;
  latestSubmission?: ExplanationSubmissionState;
};

export type ForagingWorkbenchState = {
  alerts: WorkbenchAlert[];
  intent: IntentWorkbenchState;
  explanation: ExplanationWorkbenchState;
};
