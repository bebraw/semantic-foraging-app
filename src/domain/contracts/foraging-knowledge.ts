export type EvidenceNote = {
  label: string;
  detail: string;
};

export type ForagingCandidateCard = {
  kind: "observation" | "field-note" | "patch" | "trail" | "session";
  title: string;
  summary: string;
  statusLabel: string;
  evidence: EvidenceNote[];
};
