import type { AppRoute } from "../../app-routes";
import type {
  ForagingWorkbenchState,
  ExplanationSubmissionState,
  ForagingIntentSubmissionState,
  WorkbenchAlert,
} from "../contracts/app-state";
import { buildMapViewModel } from "./map-agent";
import { buildForagingCandidateCards } from "./knowledge-agent";
import type { RuntimeModelCapability } from "../contracts/model-runtime";
import type { HomeScreenModel } from "../contracts/screen";
import type { MapBasemapModel, MapOverlayModel } from "../contracts/map";

export type CreateHomeScreenInput = {
  routes: AppRoute[];
  runtime: RuntimeModelCapability;
  traceId: string;
  workbench: ForagingWorkbenchState;
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

export function createHomeScreenModel(input: CreateHomeScreenInput): HomeScreenModel {
  const candidateCards = buildForagingCandidateCards(input.workbench.intent.latestSubmission, input.workbench.recentSessions);
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

  return {
    kind: "home",
    eyebrow: "Semantic Foraging",
    title: "Foraging Workbench",
    description:
      "A server-rendered semantic foraging workbench for trying intent classification, clarification, and grounded explanations against the real app bus.",
    overviewTitle: "What this gives you",
    overviewBody:
      "One browser page now exercises the same typed command, query, workflow, and provenance paths that power the JSON endpoints. You can probe the current architecture without dropping to curl or Playwright.",
    runtimeTitle: "Model runtime",
    runtimeModeLabel: formatRuntimeModeLabel(input.runtime.mode),
    runtimeSummary: describeRuntime(input.runtime),
    runtime: input.runtime,
    alerts: input.workbench.alerts,
    workbenchTitle: "Manual flow rehearsal",
    workbenchBody:
      "Use these forms to rehearse bounded foraging tasks: classify whether you want to find observations, create a field note, inspect a patch, explain a suggestion, or resume a saved session, then inspect the cues and clarification gaps the app detected.",
    intentWorkbench: {
      title: "Intent rehearsal",
      description:
        "Try natural-language requests a forager might make, such as finding chanterelle observations, creating a field note, inspecting a mossy patch, or resuming a previous trail.",
      actionPath: "/actions/intent",
      rawInputName: "input",
      rawInputLabel: "What do you want to do?",
      rawInputPlaceholder: "Find notes about chanterelles near mossy spruce stands",
      rawInputValue: input.workbench.intent.rawInput,
      submitLabel: "Classify request",
      latestSubmission: input.workbench.intent.latestSubmission,
      clarificationActionPath: "/actions/intent/clarify",
      clarificationWorkflowIdName: "workflowId",
      clarificationName: "clarification",
      clarificationLabel: "Clarification",
      clarificationPlaceholder: "Search for similar observations from last autumn",
      clarificationValue: input.workbench.intent.clarification,
    },
    explanationWorkbench: {
      title: "Explanation rehearsal",
      description:
        "Send a candidate result title plus grounded facts to inspect the explanation path and provenance reporting used by the foraging UI.",
      actionPath: "/actions/explanation",
      titleName: "title",
      titleLabel: "Decision or result title",
      titlePlaceholder: "Suggested forage trail selected",
      titleValue: input.workbench.explanation.title,
      factsName: "facts",
      factsLabel: "Grounding facts",
      factsPlaceholder: "Observation cluster overlaps the current region\nRecent notes mention wet spruce habitat",
      factsValue: input.workbench.explanation.factsText,
      submitLabel: "Generate explanation",
      latestSubmission: input.workbench.explanation.latestSubmission,
    },
    mapView,
    retrievalTitle: "Candidate leads",
    retrievalBody:
      "Completed foraging intents now surface deterministic observation, patch, trail, note, and session candidates with explicit evidence instead of leaving retrieval implied.",
    retrievalEmptyState: "Run a completed intent to surface grounded candidate cards and evidence notes.",
    candidateCards,
    recentSessionsTitle: "Recent sessions",
    recentSessionsBody:
      "Completed intents are now persisted as lightweight recent-session snapshots through the storage boundary so resume flows have real state to target.",
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
