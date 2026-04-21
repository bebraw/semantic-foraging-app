import type { ForagingIntentSubmissionState } from "../contracts/app-state";
import type { ForagingCandidateCard } from "../contracts/foraging-knowledge";
import type {
  SemanticComponentKind,
  SemanticComponentModel,
  SemanticPresentationModel,
  SemanticPresentationSignal,
  SemanticTableModel,
  SemanticTableRow,
} from "../contracts/screen";
import type { StoredForagingArtifact } from "../contracts/artifact";
import type { StoredForagingSession } from "../contracts/session";
import type { MapViewModel } from "../contracts/map";

type BuildSemanticPresentationInput = {
  rawInput: string;
  latestSubmission?: ForagingIntentSubmissionState;
  candidateCards: ForagingCandidateCard[];
  savedArtifacts: StoredForagingArtifact[];
  recentSessions: StoredForagingSession[];
  preferredComponent?: ExplicitComponentKind;
  mapView: MapViewModel;
};

type ExplicitComponentKind = Exclude<SemanticComponentKind, "empty" | "clarification">;
type SemanticFocus = "comparison" | "inventory" | "location" | "explanation" | "general";

type SemanticSelection = {
  primaryKind: SemanticComponentKind;
  focus: SemanticFocus;
  explicitKind?: ExplicitComponentKind;
  signals: SemanticPresentationSignal[];
};

const componentTitles: Record<SemanticComponentKind, string> = {
  empty: "Awaiting a query",
  clarification: "Clarification",
  map: "Map",
  cards: "Cards",
  table: "Table",
  prose: "Prose",
};

const explicitComponentMatchers: Array<{ kind: ExplicitComponentKind; patterns: string[] }> = [
  { kind: "table", patterns: ["table", "tabular", "grid"] },
  { kind: "map", patterns: ["map", "mapped", "plot"] },
  { kind: "cards", patterns: ["cards", "card view", "tiles"] },
  { kind: "prose", patterns: ["prose", "paragraph", "summary", "explain in text"] },
];

export function buildSemanticPresentationModel(input: BuildSemanticPresentationInput): SemanticPresentationModel {
  const latestSubmission = input.latestSubmission;
  const query = input.rawInput.trim();

  if (!latestSubmission) {
    return {
      title: "",
      summary: "",
      emptyState: "Use the search box or an example above to start.",
      primaryKind: "empty",
      signals: [
        {
          kind: "data",
          value: "no-query",
          reason: "",
        },
      ],
      components: [
        {
          kind: "empty",
          title: componentTitles.empty,
          priority: 1,
          selected: true,
          reason: "",
          signals: ["no-query"],
          contentIds: [],
        },
      ],
      prose: [],
    };
  }

  if (latestSubmission.workflow.state === "awaiting_clarification") {
    return {
      title: "Clarification needed",
      summary: latestSubmission.workflow.question,
      emptyState: "Answer the follow-up prompt to continue.",
      primaryKind: "clarification",
      signals: [
        {
          kind: "intent",
          value: latestSubmission.classification.intent,
          reason: "",
        },
      ],
      components: [
        {
          kind: "clarification",
          title: componentTitles.clarification,
          priority: 1,
          selected: true,
          reason: "",
          signals: [latestSubmission.classification.intent],
          contentIds: latestSubmission.workflow.options,
        },
      ],
      prose: [],
    };
  }

  const selection = choosePrimaryComponent(query, latestSubmission, input.candidateCards, input.mapView, input.preferredComponent);
  const table = buildSemanticTable(latestSubmission, input.candidateCards, selection.primaryKind);
  const prose = buildSemanticProse(
    latestSubmission,
    input.candidateCards,
    input.savedArtifacts,
    input.recentSessions,
    selection.primaryKind,
  );
  const components = buildSemanticComponents(selection, input.candidateCards, input.mapView, table);

  return {
    title: buildPresentationTitle(selection.primaryKind, latestSubmission.input),
    summary: buildPresentationSummary(selection, latestSubmission, input.candidateCards, table),
    emptyState: "No grounded results were available for this query yet.",
    primaryKind: selection.primaryKind,
    signals: selection.signals,
    components,
    prose,
    table,
  };
}

function choosePrimaryComponent(
  rawInput: string,
  latestSubmission: ForagingIntentSubmissionState,
  candidateCards: ForagingCandidateCard[],
  mapView: MapViewModel,
  preferredComponent?: ExplicitComponentKind,
): SemanticSelection {
  const text = rawInput.toLowerCase();
  const explicitKind = preferredComponent ?? detectExplicitComponent(text);
  const focus = detectSemanticFocus(text, latestSubmission.classification.intent);
  const signals: SemanticPresentationSignal[] = [
    {
      kind: "intent",
      value: latestSubmission.classification.intent,
      reason: "",
    },
    {
      kind: "semantic-focus",
      value: focus,
      reason: "",
    },
    {
      kind: "data",
      value: candidateCards.length > 0 ? "candidate-results-ready" : "no-candidate-results",
      reason: "",
    },
  ];

  if (mapView.features.length > 0) {
    signals.push({
      kind: "data",
      value: "map-ready",
      reason: "",
    });
  }

  if (explicitKind) {
    signals.unshift({
      kind: "explicit-component",
      value: explicitKind,
      reason: "",
    });
  }

  const primaryKind = explicitKind
    ? chooseExplicitPrimaryKind(explicitKind, candidateCards, mapView)
    : chooseImplicitPrimaryKind(focus, latestSubmission, candidateCards, mapView);

  return {
    primaryKind,
    focus,
    explicitKind,
    signals,
  };
}

function chooseExplicitPrimaryKind(
  explicitKind: ExplicitComponentKind,
  candidateCards: ForagingCandidateCard[],
  mapView: MapViewModel,
): SemanticComponentKind {
  if (explicitKind === "map" && mapView.features.length === 0) {
    return candidateCards.length > 0 ? "cards" : "prose";
  }

  if ((explicitKind === "cards" || explicitKind === "table") && candidateCards.length === 0) {
    return "prose";
  }

  return explicitKind;
}

function chooseImplicitPrimaryKind(
  focus: SemanticFocus,
  latestSubmission: ForagingIntentSubmissionState,
  candidateCards: ForagingCandidateCard[],
  mapView: MapViewModel,
): SemanticComponentKind {
  if (focus === "comparison" && candidateCards.length > 0) {
    return "table";
  }

  if (focus === "location" && mapView.features.length > 0) {
    return "map";
  }

  if (focus === "inventory" && candidateCards.length > 0) {
    return "cards";
  }

  if (focus === "explanation") {
    return "prose";
  }

  if (latestSubmission.classification.intent === "explain-suggestion") {
    return "prose";
  }

  if (candidateCards.length > 0) {
    return "cards";
  }

  if (mapView.features.length > 0) {
    return "map";
  }

  return "prose";
}

function detectExplicitComponent(text: string): ExplicitComponentKind | undefined {
  for (const matcher of explicitComponentMatchers) {
    if (matcher.patterns.some((pattern) => text.includes(pattern))) {
      return matcher.kind;
    }
  }

  return undefined;
}

function detectSemanticFocus(text: string, intent: ForagingIntentSubmissionState["classification"]["intent"]): SemanticFocus {
  if (
    text.includes("most prevalent") ||
    text.includes("prevalent") ||
    text.includes("common") ||
    text.includes("top ") ||
    text.includes("compare") ||
    text.includes("ranking") ||
    text.includes("rank ")
  ) {
    return "comparison";
  }

  if (
    text.includes("nearby") ||
    text.includes("near me") ||
    text.includes("around me") ||
    text.includes("spots") ||
    text.includes("spot ") ||
    text.includes("where") ||
    text.includes("route")
  ) {
    return "location";
  }

  if (
    text.includes("what kind") ||
    text.includes("which") ||
    text.includes("available") ||
    text.includes("types") ||
    text.includes("kinds") ||
    text.includes("species")
  ) {
    return "inventory";
  }

  if (text.includes("why") || text.includes("explain") || intent === "explain-suggestion") {
    return "explanation";
  }

  return "general";
}

function buildSemanticComponents(
  selection: SemanticSelection,
  candidateCards: ForagingCandidateCard[],
  mapView: MapViewModel,
  table?: SemanticTableModel,
): SemanticComponentModel[] {
  const availableKinds = new Set<SemanticComponentKind>([
    selection.primaryKind,
    "prose",
    ...(candidateCards.length > 0 ? (["cards", "table"] as SemanticComponentKind[]) : []),
    ...(mapView.features.length > 0 ? (["map"] as SemanticComponentKind[]) : []),
  ]);

  return [...availableKinds]
    .map(
      (kind): SemanticComponentModel => ({
        kind,
        title: componentTitles[kind],
        priority: kind === selection.primaryKind ? 1 : computeFallbackPriority(kind, selection.primaryKind),
        selected: kind === selection.primaryKind,
        reason: describeComponentReason(),
        signals: selection.signals.map((signal) => signal.value),
        contentIds: collectContentIds(kind, candidateCards, mapView, table),
      }),
    )
    .sort((left, right) => left.priority - right.priority);
}

function computeFallbackPriority(kind: SemanticComponentKind, primaryKind: SemanticComponentKind): number {
  const ranking: SemanticComponentKind[] = [primaryKind, "map", "cards", "table", "prose", "empty", "clarification"];
  const index = ranking.indexOf(kind);
  return index === -1 ? 99 : index + 1;
}

function describeComponentReason(): string {
  return "";
}

function collectContentIds(
  kind: SemanticComponentKind,
  candidateCards: ForagingCandidateCard[],
  mapView: MapViewModel,
  table?: SemanticTableModel,
): string[] {
  switch (kind) {
    case "map":
      return mapView.features.map((feature) => feature.id);
    case "cards":
      return candidateCards.map((card) => card.id);
    case "table":
      return table?.rows.map((row) => row.id) ?? [];
    case "prose":
      return candidateCards.slice(0, 3).map((card) => card.id);
    case "empty":
    case "clarification":
      return [];
  }
}

function buildPresentationTitle(primaryKind: SemanticComponentKind, input: string): string {
  switch (primaryKind) {
    case "map":
    case "cards":
    case "table":
    case "prose":
      return input;
    case "clarification":
      return "Clarification needed";
    case "empty":
      return "";
  }
}

function buildPresentationSummary(
  selection: SemanticSelection,
  latestSubmission: ForagingIntentSubmissionState,
  candidateCards: ForagingCandidateCard[],
  table?: SemanticTableModel,
): string {
  switch (selection.primaryKind) {
    case "map":
      return `${candidateCards.length} lead${candidateCards.length === 1 ? "" : "s"}.`;
    case "cards":
      return `${candidateCards.length} lead${candidateCards.length === 1 ? "" : "s"}.`;
    case "table":
      return `${table?.rows.length ?? 0} row${table?.rows.length === 1 ? "" : "s"}.`;
    case "prose":
      return "";
    case "clarification":
      return latestSubmission.workflow.state === "awaiting_clarification"
        ? latestSubmission.workflow.question
        : "Clarification is required.";
    case "empty":
      return "";
  }
}

function buildSemanticTable(
  latestSubmission: ForagingIntentSubmissionState,
  candidateCards: ForagingCandidateCard[],
  primaryKind: SemanticComponentKind,
): SemanticTableModel | undefined {
  if (candidateCards.length === 0 && primaryKind !== "table") {
    return undefined;
  }

  const speciesRows = collectSpeciesRows(candidateCards);

  if (speciesRows.length === 0) {
    return undefined;
  }

  return {
    title: "",
    description: "",
    columns: [
      { key: "signal", label: "Signal", align: "end" },
      { key: "habitats", label: "Habitats" },
      { key: "regions", label: "Regions" },
    ],
    rows: speciesRows,
  };
}

function collectSpeciesRows(candidateCards: ForagingCandidateCard[]): SemanticTableRow[] {
  const rows = new Map<
    string,
    {
      score: number;
      habitats: Set<string>;
      regions: Set<string>;
    }
  >();

  for (const card of candidateCards) {
    const weight = scoreCardKind(card.kind);

    for (const species of card.spatialContext.species.filter((value) => !isGenericSpecies(value))) {
      const current = rows.get(species) ?? {
        score: 0,
        habitats: new Set<string>(),
        regions: new Set<string>(),
      };

      current.score += weight;
      card.spatialContext.habitat.forEach((habitat) => current.habitats.add(habitat));
      card.spatialContext.region.forEach((region) => current.regions.add(region));
      rows.set(species, current);
    }
  }

  return [...rows.entries()]
    .sort((left, right) => right[1].score - left[1].score || left[0].localeCompare(right[0]))
    .slice(0, 6)
    .map(([species, row]) => ({
      id: `row-${species}`,
      label: species,
      cells: {
        signal: row.score.toString(),
        habitats: [...row.habitats].join(", "),
        regions: [...row.regions].join(", "),
      },
    }));
}

function scoreCardKind(kind: ForagingCandidateCard["kind"]): number {
  switch (kind) {
    case "observation":
    case "patch":
      return 3;
    case "trail":
      return 2;
    case "session":
    case "field-note":
      return 1;
  }
}

function isGenericSpecies(value: string): boolean {
  return value === "berry" || value === "mushroom";
}

function buildSemanticProse(
  latestSubmission: ForagingIntentSubmissionState,
  candidateCards: ForagingCandidateCard[],
  savedArtifacts: StoredForagingArtifact[],
  recentSessions: StoredForagingSession[],
  primaryKind: SemanticComponentKind,
): string[] {
  if (candidateCards.length === 0) {
    return ["No grounded leads yet."];
  }

  const leadNames = candidateCards
    .slice(0, 3)
    .map((card) => card.title)
    .join(", ");
  const cueSummary = summarizeCues(latestSubmission.classification.cues);
  const memorySummary = [
    savedArtifacts.length > 0 ? `${savedArtifacts.length} saved artifact${savedArtifacts.length === 1 ? "" : "s"}` : null,
    recentSessions.length > 0 ? `${recentSessions.length} recent session${recentSessions.length === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(" and ");

  const paragraphs = [`Current leads include ${leadNames}.`];

  if (cueSummary.length > 0) {
    paragraphs.push(`Relevant cues: ${cueSummary}.`);
  }

  if (memorySummary.length > 0) {
    paragraphs.push(`Also available: ${memorySummary}.`);
  }

  return paragraphs;
}

function summarizeCues(cues: ForagingIntentSubmissionState["classification"]["cues"]): string {
  const segments = [
    summarizeCueSegment("species", cues.species),
    summarizeCueSegment("habitat", cues.habitat),
    summarizeCueSegment("region", cues.region),
    summarizeCueSegment("season", cues.season),
  ].filter(Boolean);

  return segments.join("; ");
}

function summarizeCueSegment(label: string, values: string[]): string {
  if (values.length === 0) {
    return "";
  }

  return `${label} ${values.join(", ")}`;
}
