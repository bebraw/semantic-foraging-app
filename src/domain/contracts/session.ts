import type { ForagingIntent, ForagingCues } from "../agents/intent-agent";

export type StoredForagingSession = {
  sessionId: string;
  input: string;
  title: string;
  summary: string;
  sourceIntent: Exclude<ForagingIntent, "clarify">;
  cues: ForagingCues;
  savedAt: string;
};
