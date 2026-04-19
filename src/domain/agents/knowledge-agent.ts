import type { ForagingIntentSubmissionState } from "../contracts/app-state";
import type { ForagingCandidateCard } from "../contracts/foraging-knowledge";
import type { StoredForagingSession } from "../contracts/session";
import type { ForagingCues } from "./intent-agent";

type CatalogCandidate = ForagingCandidateCard & {
  species: string[];
  habitat: string[];
  region: string[];
  season: string[];
};

const catalog: CatalogCandidate[] = [
  {
    kind: "observation",
    title: "Autumn chanterelle cluster",
    summary: "Three nearby observation notes align on damp spruce cover and recent chanterelle sightings.",
    statusLabel: "Observation cluster",
    species: ["chanterelle"],
    habitat: ["spruce", "mossy", "wet"],
    region: ["helsinki", "uusimaa"],
    season: ["autumn"],
    evidence: [],
  },
  {
    kind: "observation",
    title: "Pine-edge porcini revisit",
    summary: "A previous field note and two observations point to a dry pine margin worth rechecking.",
    statusLabel: "Observation lead",
    species: ["porcini", "boletus"],
    habitat: ["pine", "ridge"],
    region: ["north karelia"],
    season: ["summer", "autumn"],
    evidence: [],
  },
  {
    kind: "patch",
    title: "Mossy spruce hollow",
    summary: "A compact patch with repeated chanterelle and trumpet signals in wet mossy spruce cover.",
    statusLabel: "Patch candidate",
    species: ["chanterelle", "trumpet"],
    habitat: ["spruce", "mossy", "wet"],
    region: ["helsinki", "uusimaa"],
    season: ["autumn"],
    evidence: [],
  },
  {
    kind: "trail",
    title: "North ridge wet-spruce loop",
    summary: "A trail fragment linking a mossy ridge, older notes, and a recent wet-spruce observation pocket.",
    statusLabel: "Trail fragment",
    species: ["chanterelle", "morel"],
    habitat: ["spruce", "wet", "ridge"],
    region: ["north karelia"],
    season: ["summer", "autumn"],
    evidence: [],
  },
  {
    kind: "session",
    title: "Last autumn chanterelle review",
    summary: "A saved session that compared damp spruce stands and recent chanterelle observations.",
    statusLabel: "Saved session",
    species: ["chanterelle"],
    habitat: ["spruce", "wet"],
    region: ["helsinki"],
    season: ["autumn"],
    evidence: [],
  },
];

export function buildForagingCandidateCards(
  submission?: ForagingIntentSubmissionState,
  recentSessions: StoredForagingSession[] = [],
): ForagingCandidateCard[] {
  if (!submission || submission.workflow.state !== "completed") {
    return [];
  }

  switch (submission.classification.intent) {
    case "find-observations":
      return selectCatalogCards(submission, ["observation", "patch", "trail"], 3);
    case "inspect-patch":
      return selectCatalogCards(submission, ["patch", "trail", "observation"], 3);
    case "explain-suggestion":
      return selectCatalogCards(submission, ["trail", "patch", "observation"], 3);
    case "resume-session":
      return recentSessions.length > 0
        ? buildRecentSessionCards(submission, recentSessions)
        : selectCatalogCards(submission, ["session", "trail", "observation"], 3);
    case "create-field-note":
      return [createFieldNoteDraftCard(submission), ...selectCatalogCards(submission, ["observation", "patch"], 2)];
    case "clarify":
      return [];
  }
}

function createFieldNoteDraftCard(submission: ForagingIntentSubmissionState): ForagingCandidateCard {
  const { cues, missing } = submission.classification;

  return {
    kind: "field-note",
    title: "Field note scaffold",
    summary: "A starter note seeded from the current request so the next slice can persist real field-note drafts.",
    statusLabel: "Draft note",
    evidence: [
      {
        label: "Intent fit",
        detail: "The request was classified as create-field-note.",
      },
      {
        label: "Captured cues",
        detail: summarizeCueMatches(cues),
      },
      {
        label: "Still missing",
        detail: missing.length > 0 ? missing.join(", ") : "No major gaps detected.",
      },
    ],
  };
}

function selectCatalogCards(
  submission: ForagingIntentSubmissionState,
  preferredKinds: CatalogCandidate["kind"][],
  limit: number,
): ForagingCandidateCard[] {
  const preferredWeight = new Map(preferredKinds.map((kind, index) => [kind, preferredKinds.length - index]));

  return catalog
    .filter((candidate) => preferredWeight.has(candidate.kind))
    .map((candidate) => ({
      candidate,
      score: scoreCandidate(candidate, submission.classification.cues) + (preferredWeight.get(candidate.kind) ?? 0) * 10,
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ candidate }) => ({
      kind: candidate.kind,
      title: candidate.title,
      summary: candidate.summary,
      statusLabel: candidate.statusLabel,
      evidence: buildEvidenceNotes(candidate, submission),
    }));
}

function buildRecentSessionCards(
  submission: ForagingIntentSubmissionState,
  recentSessions: StoredForagingSession[],
): ForagingCandidateCard[] {
  return recentSessions
    .map((session) => ({
      session,
      score:
        scoreRecentSession(session, submission.classification.cues) +
        (session.sourceIntent === "resume-session" ? 2 : 0) +
        (session.sourceIntent === "find-observations" ? 1 : 0),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map(({ session }) => ({
      kind: "session",
      title: session.title,
      summary: session.summary,
      statusLabel: "Recent session",
      evidence: buildRecentSessionEvidence(session, submission),
    }));
}

function scoreCandidate(candidate: CatalogCandidate, cues: ForagingCues): number {
  return (
    countOverlap(candidate.species, cues.species) * 5 +
    countOverlap(candidate.habitat, cues.habitat) * 4 +
    countOverlap(candidate.region, cues.region) * 4 +
    countOverlap(candidate.season, cues.season) * 3
  );
}

function scoreRecentSession(session: StoredForagingSession, cues: ForagingCues): number {
  return (
    countOverlap(session.cues.species, cues.species) * 5 +
    countOverlap(session.cues.habitat, cues.habitat) * 4 +
    countOverlap(session.cues.region, cues.region) * 4 +
    countOverlap(session.cues.season, cues.season) * 3
  );
}

function buildEvidenceNotes(candidate: CatalogCandidate, submission: ForagingIntentSubmissionState): ForagingCandidateCard["evidence"] {
  const cues = submission.classification.cues;
  const notes: ForagingCandidateCard["evidence"] = [
    {
      label: "Intent fit",
      detail: `Ranked for ${submission.classification.intent}.`,
    },
  ];
  const species = collectOverlap(candidate.species, cues.species);
  const habitat = collectOverlap(candidate.habitat, cues.habitat);
  const region = collectOverlap(candidate.region, cues.region);
  const season = collectOverlap(candidate.season, cues.season);

  if (species.length > 0) {
    notes.push({
      label: "Species overlap",
      detail: species.join(", "),
    });
  }

  if (habitat.length > 0) {
    notes.push({
      label: "Habitat fit",
      detail: habitat.join(", "),
    });
  }

  if (region.length > 0) {
    notes.push({
      label: "Region fit",
      detail: region.join(", "),
    });
  }

  if (season.length > 0) {
    notes.push({
      label: "Season fit",
      detail: season.join(", "),
    });
  }

  if (notes.length === 1) {
    notes.push({
      label: "Fallback ranking",
      detail: summarizeCueMatches(cues),
    });
  }

  if (submission.classification.missing.length > 0) {
    notes.push({
      label: "Open questions",
      detail: submission.classification.missing.join(", "),
    });
  }

  return notes;
}

function buildRecentSessionEvidence(
  session: StoredForagingSession,
  submission: ForagingIntentSubmissionState,
): ForagingCandidateCard["evidence"] {
  const notes: ForagingCandidateCard["evidence"] = [
    {
      label: "Recent session",
      detail: `Stored from ${session.sourceIntent} at ${session.savedAt}.`,
    },
  ];
  const species = collectOverlap(session.cues.species, submission.classification.cues.species);
  const habitat = collectOverlap(session.cues.habitat, submission.classification.cues.habitat);
  const region = collectOverlap(session.cues.region, submission.classification.cues.region);
  const season = collectOverlap(session.cues.season, submission.classification.cues.season);

  if (species.length > 0) {
    notes.push({
      label: "Species overlap",
      detail: species.join(", "),
    });
  }

  if (habitat.length > 0) {
    notes.push({
      label: "Habitat fit",
      detail: habitat.join(", "),
    });
  }

  if (region.length > 0) {
    notes.push({
      label: "Region fit",
      detail: region.join(", "),
    });
  }

  if (season.length > 0) {
    notes.push({
      label: "Season fit",
      detail: season.join(", "),
    });
  }

  if (notes.length === 1) {
    notes.push({
      label: "Fallback ranking",
      detail: summarizeCueMatches(submission.classification.cues),
    });
  }

  return notes;
}

function countOverlap(left: string[], right: string[]): number {
  return collectOverlap(left, right).length;
}

function collectOverlap(left: string[], right: string[]): string[] {
  return left.filter((item) => right.includes(item));
}

function summarizeCueMatches(cues: ForagingCues): string {
  const parts = [
    summarizeCueGroup("species", cues.species),
    summarizeCueGroup("habitat", cues.habitat),
    summarizeCueGroup("region", cues.region),
    summarizeCueGroup("season", cues.season),
  ].filter(Boolean);

  return parts.join(" | ") || "No strong grounded cues detected yet.";
}

function summarizeCueGroup(label: string, values: string[]): string {
  if (values.length === 0) {
    return "";
  }

  return `${label}: ${values.join(", ")}`;
}
