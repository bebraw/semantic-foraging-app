import type { ForagingWorkbenchState } from "../domain/contracts/app-state";

export type RenderHomeScreenMessage = {
  type: "RenderHomeScreen";
  workbench?: ForagingWorkbenchState;
};

export type RunHealthCheckMessage = {
  type: "RunHealthCheck";
};

export type InspectModelRuntimeMessage = {
  type: "InspectModelRuntime";
};

export type SubmitUserIntentMessage = {
  type: "SubmitUserIntent";
  rawInput: string;
};

export type ClarifyUserIntentMessage = {
  type: "ClarifyUserIntent";
  workflowId: string;
  clarification: string;
};

export type RequestExplanationMessage = {
  type: "RequestExplanation";
  title: string;
  facts: string[];
};

export type AppMessage =
  | RenderHomeScreenMessage
  | RunHealthCheckMessage
  | InspectModelRuntimeMessage
  | SubmitUserIntentMessage
  | ClarifyUserIntentMessage
  | RequestExplanationMessage;
