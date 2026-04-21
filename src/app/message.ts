import type { SemanticComponentKind } from "../domain/contracts/screen";
import type { ForagingCandidateCard } from "../domain/contracts/foraging-knowledge";
import type { ForagingIntent } from "../domain/agents/intent-agent";
import type { ForagingWorkbenchState } from "../domain/contracts/app-state";

export type RenderHomeScreenMessage = {
  type: "RenderHomeScreen";
  workbench?: ForagingWorkbenchState;
  preferredComponent?: Extract<SemanticComponentKind, "map" | "cards" | "table" | "prose">;
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
  persistSession?: boolean;
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

export type SaveArtifactMessage = {
  type: "SaveArtifact";
  candidate: ForagingCandidateCard;
  sourceIntent: Exclude<ForagingIntent, "clarify">;
};

export type LoadSavedArtifactMessage = {
  type: "LoadSavedArtifact";
  artifactId: string;
};

export type LoadSavedArtifactRevisionMessage = {
  type: "LoadSavedArtifactRevision";
  artifactId: string;
  recordedAt: string;
};

export type RefineSavedArtifactMessage = {
  type: "RefineSavedArtifact";
  artifactId: string;
  title: string;
  summary: string;
  notes: string;
};

export type RestoreSavedArtifactRevisionMessage = {
  type: "RestoreSavedArtifactRevision";
  artifactId: string;
  recordedAt: string;
};

export type AppMessage =
  | RenderHomeScreenMessage
  | RunHealthCheckMessage
  | InspectModelRuntimeMessage
  | SubmitUserIntentMessage
  | ClarifyUserIntentMessage
  | RequestExplanationMessage
  | SaveArtifactMessage
  | LoadSavedArtifactMessage
  | LoadSavedArtifactRevisionMessage
  | RefineSavedArtifactMessage
  | RestoreSavedArtifactRevisionMessage;
