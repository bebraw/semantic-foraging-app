import type { AppRoute } from "../../app-routes";
import type { ForagingWorkbenchState, WorkbenchAlert } from "./app-state";
import type { StoredForagingArtifact } from "./artifact";
import type { ForagingCandidateCard } from "./foraging-knowledge";
import type { MapViewModel } from "./map";
import type { RuntimeModelCapability } from "./model-runtime";
import type { StoredForagingSession } from "./session";

export type ScreenMeta = {
  traceId: string;
};

export type AlertModel = WorkbenchAlert;

export type IntentWorkbenchModel = {
  title: string;
  description: string;
  actionPath: string;
  rawInputName: string;
  rawInputLabel: string;
  rawInputPlaceholder: string;
  rawInputValue: string;
  submitLabel: string;
  latestSubmission?: ForagingWorkbenchState["intent"]["latestSubmission"];
  clarificationActionPath: string;
  clarificationWorkflowIdName: string;
  clarificationName: string;
  clarificationLabel: string;
  clarificationPlaceholder: string;
  clarificationValue: string;
};

export type ExplanationWorkbenchModel = {
  title: string;
  description: string;
  actionPath: string;
  titleName: string;
  titleLabel: string;
  titlePlaceholder: string;
  titleValue: string;
  factsName: string;
  factsLabel: string;
  factsPlaceholder: string;
  factsValue: string;
  submitLabel: string;
  latestSubmission?: ForagingWorkbenchState["explanation"]["latestSubmission"];
};

export type ArtifactWorkbenchModel = {
  saveActionPath: string;
  useActionPath: string;
  refineActionPath: string;
  restoreActionPath: string;
};

export type HomeScreenModel = {
  kind: "home";
  eyebrow: string;
  title: string;
  description: string;
  overviewTitle: string;
  overviewBody: string;
  runtimeTitle: string;
  runtimeModeLabel: string;
  runtimeSummary: string;
  runtime: RuntimeModelCapability;
  alerts: AlertModel[];
  workbenchTitle: string;
  workbenchBody: string;
  intentWorkbench: IntentWorkbenchModel;
  explanationWorkbench: ExplanationWorkbenchModel;
  artifactWorkbench: ArtifactWorkbenchModel;
  mapView: MapViewModel;
  retrievalTitle: string;
  retrievalBody: string;
  retrievalEmptyState: string;
  candidateCards: ForagingCandidateCard[];
  savedArtifactsTitle: string;
  savedArtifactsBody: string;
  savedArtifactsEmptyState: string;
  savedArtifacts: StoredForagingArtifact[];
  recentSessionsTitle: string;
  recentSessionsBody: string;
  recentSessionsEmptyState: string;
  recentSessions: StoredForagingSession[];
  routesTitle: string;
  nextStepsTitle: string;
  nextStepsBody: string;
  healthPath: string;
  routes: AppRoute[];
  meta: ScreenMeta;
};

export type ScreenModel = HomeScreenModel;
