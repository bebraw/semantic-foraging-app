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
      title: "Search-ready surface",
      summary: "The page stays minimal until a query provides enough meaning to pick a result view.",
      emptyState: "Try a natural-language query such as nearby berry spots, available berries nearby, or a request for a table.",
      primaryKind: "empty",
      signals: [
        {
          kind: "data",
          value: "no-query",
          reason: "No query has been submitted yet, so the UI stays on the neutral search state.",
        },
      ],
      components: [
        {
          kind: "empty",
          title: componentTitles.empty,
          priority: 1,
          selected: true,
          reason: "The semantic mapper is waiting for an input query.",
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
          reason: "Intent classification could not complete without one more piece of context.",
        },
      ],
      components: [
        {
          kind: "clarification",
          title: componentTitles.clarification,
          priority: 1,
          selected: true,
          reason: "Clarification takes precedence over result rendering.",
          signals: [latestSubmission.classification.intent],
          contentIds: latestSubmission.workflow.options,
        },
      ],
      prose: [],
    };
  }

  const selection = choosePrimaryComponent(query, latestSubmission, input.candidateCards, input.mapView);
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
): SemanticSelection {
  const text = rawInput.toLowerCase();
  const explicitKind = detectExplicitComponent(text);
  const focus = detectSemanticFocus(text, latestSubmission.classification.intent);
  const signals: SemanticPresentationSignal[] = [
    {
      kind: "intent",
      value: latestSubmission.classification.intent,
      reason: `The query classified as ${latestSubmission.classification.intent}.`,
    },
    {
      kind: "semantic-focus",
      value: focus,
      reason: describeFocusReason(focus),
    },
    {
      kind: "data",
      value: candidateCards.length > 0 ? "candidate-results-ready" : "no-candidate-results",
      reason:
        candidateCards.length > 0
          ? `${candidateCards.length} candidate result${candidateCards.length === 1 ? "" : "s"} are available for rendering.`
          : "No candidate results were available, so only prose fallback can be shown.",
    },
  ];

  if (mapView.features.length > 0) {
    signals.push({
      kind: "data",
      value: "map-ready",
      reason: `${mapView.features.length} mappable feature${mapView.features.length === 1 ? "" : "s"} are available.`,
    });
  }

  if (explicitKind) {
    signals.unshift({
      kind: "explicit-component",
      value: explicitKind,
      reason: `The query explicitly asked for a ${explicitKind} view.`,
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

function describeFocusReason(focus: SemanticFocus): string {
  switch (focus) {
    case "comparison":
      return "The query asks for comparison or ranking, which maps naturally to a table.";
    case "inventory":
      return "The query asks what is available, which maps naturally to cards or prose.";
    case "location":
      return "The query emphasizes place or proximity, which maps naturally to a map.";
    case "explanation":
      return "The query asks for explanation, so prose is a natural fit.";
    case "general":
      return "The query did not force a single view, so the mapper can pick the most useful default.";
  }
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
        reason: describeComponentReason(kind, selection, candidateCards, mapView, table),
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

function describeComponentReason(
  kind: SemanticComponentKind,
  selection: SemanticSelection,
  candidateCards: ForagingCandidateCard[],
  mapView: MapViewModel,
  table?: SemanticTableModel,
): string {
  if (kind === selection.primaryKind) {
    if (selection.explicitKind === kind) {
      return `Selected because the query explicitly requested ${kind}.`;
    }

    switch (kind) {
      case "map":
        return "Selected because the query emphasizes location and mappable leads are available.";
      case "cards":
        return "Selected because the query asks what is available and distinct grounded leads are available.";
      case "table":
        return "Selected because the query asks for comparison or prevalence.";
      case "prose":
        return "Selected because explanation is more important than spatial or tabular structure for this query.";
      case "empty":
        return "Selected because no query has been submitted yet.";
      case "clarification":
        return "Selected because clarification must complete before results can be rendered.";
    }
  }

  switch (kind) {
    case "map":
      return `${mapView.features.length} mappable lead${mapView.features.length === 1 ? "" : "s"} remain available as a fallback view.`;
    case "cards":
      return `${candidateCards.length} candidate card${candidateCards.length === 1 ? "" : "s"} remain available as a fallback view.`;
    case "table":
      return `${table?.rows.length ?? 0} tabular row${table?.rows.length === 1 ? "" : "s"} can be derived from the surfaced leads.`;
    case "prose":
      return "A prose summary can always explain why the current results were surfaced.";
    case "empty":
      return "No content is available yet.";
    case "clarification":
      return "Clarification is only relevant when the workflow is blocked.";
  }
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
      return `Mapped results for "${input}"`;
    case "cards":
      return `Result cards for "${input}"`;
    case "table":
      return `Table view for "${input}"`;
    case "prose":
      return `Summary for "${input}"`;
    case "clarification":
      return "Clarification needed";
    case "empty":
      return "Search-ready surface";
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
      return `${candidateCards.length} grounded lead${candidateCards.length === 1 ? "" : "s"} were mapped because the query leans on location or nearby spots.`;
    case "cards":
      return `${candidateCards.length} grounded lead${candidateCards.length === 1 ? "" : "s"} were surfaced as cards because the query asks what is available.`;
    case "table":
      return `${table?.rows.length ?? 0} ranked row${table?.rows.length === 1 ? "" : "s"} were assembled from the surfaced leads for comparison.`;
    case "prose":
      return `A narrative summary was selected for ${latestSubmission.classification.intent} because the query reads more like explanation than exploration.`;
    case "clarification":
      return latestSubmission.workflow.state === "awaiting_clarification"
        ? latestSubmission.workflow.question
        : "Clarification is required.";
    case "empty":
      return "The semantic mapper will select a result view after the first query.";
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
    title: "Derived prevalence table",
    description:
      latestSubmission.input.trim().length > 0
        ? "The table ranks species from the currently surfaced leads, not from a nationwide live statistics feed."
        : "The table ranks species from the currently surfaced leads.",
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
    return [
      "No grounded candidate leads were available yet, so the search surface can only report the current classification and any missing context.",
    ];
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

  const paragraphs = [
    `${candidateCards.length} lead${candidateCards.length === 1 ? "" : "s"} were surfaced for ${latestSubmission.classification.intent}. The strongest current signals are ${leadNames}.`,
    cueSummary.length > 0
      ? `The active query emphasizes ${cueSummary}.`
      : "The active query does not yet expose strong explicit species, habitat, region, or season cues.",
  ];

  if (primaryKind !== "prose") {
    paragraphs.push(`Prose remains available as a fallback even though ${primaryKind} was selected as the primary result view.`);
  }

  if (memorySummary.length > 0) {
    paragraphs.push(`The search surface also has ${memorySummary} available as lightweight continuation context.`);
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
