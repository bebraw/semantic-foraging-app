import type { AppRoute } from "../../app-routes";
import type {
  ForagingWorkbenchState,
  ExplanationSubmissionState,
  ForagingIntentSubmissionState,
  WorkbenchAlert,
} from "../contracts/app-state";
import type { StoredForagingArtifact } from "../contracts/artifact";
import { buildMapViewModel } from "./map-agent";
import { buildForagingCandidateCards } from "./knowledge-agent";
import { createArtifactIntentSubmission, createArtifactWorkbenchSeed } from "./artifact-agent";
import { buildSemanticPresentationModel } from "./presentation-agent";
import type { RuntimeModelCapability } from "../contracts/model-runtime";
import type { HomeScreenModel } from "../contracts/screen";
import type { MapBasemapModel, MapOverlayModel } from "../contracts/map";

export type CreateHomeScreenInput = {
  routes: AppRoute[];
  runtime: RuntimeModelCapability;
  traceId: string;
  workbench: ForagingWorkbenchState;
  preferredComponent?: Extract<HomeScreenModel["presentation"]["primaryKind"], "map" | "cards" | "table" | "prose">;
  basemap?: MapBasemapModel;
  overlay?: MapOverlayModel;
};

export function createInitialForagingWorkbenchState(): ForagingWorkbenchState {
  return {
    alerts: [],
    intent: {
      rawInput: "",
      clarification: "",
    },
    explanation: {
      title: "",
      factsText: "",
    },
    recentSessions: [],
    savedArtifacts: [],
  };
}

export function createWorkbenchAlert(title: string, body: string, tone: WorkbenchAlert["tone"] = "error"): WorkbenchAlert {
  return {
    tone,
    title,
    body,
  };
}

export function withWorkbenchAlert(state: ForagingWorkbenchState, alert: WorkbenchAlert): ForagingWorkbenchState {
  return {
    ...state,
    alerts: [...state.alerts, alert],
  };
}

export function withIntentInput(state: ForagingWorkbenchState, rawInput: string, clarification = ""): ForagingWorkbenchState {
  return {
    ...state,
    intent: {
      ...state.intent,
      rawInput,
      clarification,
    },
  };
}

export function withExplanationInput(state: ForagingWorkbenchState, title: string, factsText: string): ForagingWorkbenchState {
  return {
    ...state,
    explanation: {
      ...state.explanation,
      title,
      factsText,
    },
  };
}

export function withIntentSubmission(
  state: ForagingWorkbenchState,
  submission: ForagingIntentSubmissionState,
  clarification = "",
): ForagingWorkbenchState {
  return {
    ...state,
    intent: {
      rawInput: submission.input,
      clarification: submission.workflow.state === "awaiting_clarification" ? clarification : "",
      latestSubmission: submission,
    },
  };
}

export function withExplanationSubmission(state: ForagingWorkbenchState, submission: ExplanationSubmissionState): ForagingWorkbenchState {
  return {
    ...state,
    explanation: {
      title: submission.title,
      factsText: submission.facts.join("\n"),
      latestSubmission: submission,
    },
  };
}

export function withSavedArtifactSeed(state: ForagingWorkbenchState, artifact: StoredForagingArtifact): ForagingWorkbenchState {
  const seed = createArtifactWorkbenchSeed(artifact);
  const latestSubmission = createArtifactIntentSubmission(artifact);

  return {
    ...state,
    intent: {
      ...state.intent,
      rawInput: seed.rawInput,
      clarification: "",
      latestSubmission,
    },
    explanation: {
      ...state.explanation,
      title: seed.title,
      factsText: seed.factsText,
    },
  };
}

export function createHomeScreenModel(input: CreateHomeScreenInput): HomeScreenModel {
  const candidateCards = buildForagingCandidateCards(
    input.workbench.intent.latestSubmission,
    input.workbench.recentSessions,
    input.workbench.savedArtifacts,
  );
  const mapView = buildMapViewModel(
    candidateCards,
    input.workbench.recentSessions,
    input.basemap && input.overlay
      ? {
          basemap: input.basemap,
          overlay: input.overlay,
        }
      : undefined,
  );
  const rawInput = input.workbench.intent.latestSubmission?.input ?? input.workbench.intent.rawInput;
  const searchPrompt = {
    actionPath: "/",
    rawInputName: "input",
    rawInputLabel: "Search the landscape",
    rawInputPlaceholder: "Type a place, species, or explicit view request",
    rawInputValue: rawInput,
    submitLabel: "Search",
    examples: [
      "Nearby berry spots",
      "What kind of berries are available nearby?",
      "Give me a table of the most prevalent mushrooms in Finland at the lake district.",
    ],
  };
  const presentation = buildSemanticPresentationModel({
    rawInput,
    latestSubmission: input.workbench.intent.latestSubmission,
    candidateCards,
    savedArtifacts: input.workbench.savedArtifacts,
    recentSessions: input.workbench.recentSessions,
    preferredComponent: input.preferredComponent,
    mapView,
  });

  return {
    kind: "home",
    eyebrow: "Semantic Foraging",
    title: "Foraging Search",
    description: "",
    overviewTitle: "",
    overviewBody: "",
    runtimeTitle: "Model runtime",
    runtimeModeLabel: formatRuntimeModeLabel(input.runtime.mode),
    runtimeSummary: describeRuntime(input.runtime),
    runtime: input.runtime,
    alerts: input.workbench.alerts,
    searchPrompt,
    presentation,
    workbenchTitle: "Search surface",
    workbenchBody: "",
    intentWorkbench: {
      title: "Semantic search",
      description: "",
      actionPath: "/",
      rawInputName: "input",
      rawInputLabel: searchPrompt.rawInputLabel,
      rawInputPlaceholder: searchPrompt.rawInputPlaceholder,
      rawInputValue: searchPrompt.rawInputValue,
      submitLabel: searchPrompt.submitLabel,
      latestSubmission: input.workbench.intent.latestSubmission,
      clarificationActionPath: "/actions/intent/clarify",
      clarificationWorkflowIdName: "workflowId",
      clarificationName: "clarification",
      clarificationLabel: "Clarification",
      clarificationPlaceholder: "Add the missing detail",
      clarificationValue: input.workbench.intent.clarification,
    },
    explanationWorkbench: {
      title: "Explanation rehearsal",
      description: "",
      actionPath: "/actions/explanation",
      titleName: "title",
      titleLabel: "Decision or result title",
      titlePlaceholder: "Title",
      titleValue: input.workbench.explanation.title,
      factsName: "facts",
      factsLabel: "Grounding facts",
      factsPlaceholder: "One fact per line",
      factsValue: input.workbench.explanation.factsText,
      submitLabel: "Generate explanation",
      latestSubmission: input.workbench.explanation.latestSubmission,
    },
    artifactWorkbench: {
      saveActionPath: "/actions/artifact/save",
      useActionPath: "/actions/artifact/use",
      refineActionPath: "/actions/artifact/refine",
      restoreActionPath: "/actions/artifact/restore",
    },
    mapView,
    retrievalTitle: "Search results",
    retrievalBody: "",
    retrievalEmptyState: "Run a completed intent to surface grounded candidate cards and evidence notes.",
    candidateCards,
    savedArtifactsTitle: "Library",
    savedArtifactsBody: "",
    savedArtifactsEmptyState: "Save a field note, trail, or patch inspection to keep it in the workbench.",
    savedArtifacts: input.workbench.savedArtifacts,
    recentSessionsTitle: "Recent searches",
    recentSessionsBody: "",
    recentSessionsEmptyState: "Complete a foraging intent to start building a recent-session trail.",
    recentSessions: input.workbench.recentSessions,
    routesTitle: "Programmatic routes",
    nextStepsTitle: "Roadmap focus",
    nextStepsBody:
      "The next slices should ingest field notes and observation cards, normalize species, habitat, region, and season cues, retrieve candidate patches and trails with explicit evidence cards, and let a forager save or resume a grounded search session without collapsing the app back into one orchestration loop.",
    healthPath: "/api/health",
    routes: input.routes,
    meta: {
      traceId: input.traceId,
    },
  };
}

function formatRuntimeModeLabel(mode: RuntimeModelCapability["mode"]): string {
  switch (mode) {
    case "no-model":
      return "No-model mode";
    case "local-model":
      return "Local-model mode";
    case "hosted-model":
      return "Hosted-model mode";
  }
}

function describeRuntime(runtime: RuntimeModelCapability): string {
  if (runtime.mode === "no-model") {
    return "No model provider is configured. The foraging workbench still runs through deterministic screen, workflow, and explanation fallbacks so the manual flow stays testable.";
  }

  if (!runtime.available) {
    return `The configured provider ${runtime.provider ?? "unknown"} is unavailable, so semantic foraging requests will fall back to deterministic behavior until the provider recovers.`;
  }

  if (runtime.mode === "local-model") {
    return `A local provider is available through ${runtime.provider}. This is the preferred development path for testing classification and explanation behavior without requiring an external API key.`;
  }

  return `A hosted provider is available through ${runtime.provider}. The workbench can exercise managed inference while preserving deterministic workflow rules and fallback behavior.`;
}
