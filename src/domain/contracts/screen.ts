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

export type SearchPromptModel = {
  actionPath: string;
  rawInputName: string;
  rawInputLabel: string;
  rawInputPlaceholder: string;
  rawInputValue: string;
  submitLabel: string;
  examples: string[];
};

export type SemanticPresentationSignal = {
  kind: "explicit-component" | "semantic-focus" | "intent" | "data";
  value: string;
  reason: string;
};

export type SemanticComponentKind = "empty" | "clarification" | "map" | "cards" | "table" | "prose";

export type SemanticComponentModel = {
  kind: SemanticComponentKind;
  title: string;
  priority: number;
  selected: boolean;
  reason: string;
  signals: string[];
  contentIds: string[];
};

export type SemanticTableColumn = {
  key: string;
  label: string;
  align?: "start" | "end";
};

export type SemanticTableRow = {
  id: string;
  label: string;
  cells: Record<string, string>;
};

export type SemanticTableModel = {
  title: string;
  description: string;
  columns: SemanticTableColumn[];
  rows: SemanticTableRow[];
};

export type SemanticPresentationModel = {
  title: string;
  summary: string;
  emptyState: string;
  primaryKind: SemanticComponentKind;
  signals: SemanticPresentationSignal[];
  components: SemanticComponentModel[];
  prose: string[];
  table?: SemanticTableModel;
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
  searchPrompt: SearchPromptModel;
  presentation: SemanticPresentationModel;
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
