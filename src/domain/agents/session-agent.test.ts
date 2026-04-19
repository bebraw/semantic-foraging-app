import { describe, expect, it } from "vitest";
import { createStoredForagingSession } from "./session-agent";

describe("createStoredForagingSession", () => {
  it("creates a serializable recent session snapshot for completed intents", () => {
    const session = createStoredForagingSession(
      "Find chanterelles near wet spruce in Helsinki",
      {
        intent: "find-observations",
        confidence: 0.69,
        needsClarification: false,
        cues: {
          species: ["chanterelle"],
          habitat: ["spruce", "wet"],
          region: ["helsinki"],
          season: [],
        },
        missing: [],
      },
      "medium",
      "2026-04-19T12:00:00.000Z",
    );

    expect(session).toEqual({
      sessionId: expect.any(String),
      input: "Find chanterelles near wet spruce in Helsinki",
      title: "Find chanterelles near wet spruce in Helsinki",
      summary: "Intent: find-observations | species: chanterelle | habitat: spruce, wet | region: helsinki | Confidence: 0.69",
      sourceIntent: "find-observations",
      cues: {
        species: ["chanterelle"],
        habitat: ["spruce", "wet"],
        region: ["helsinki"],
        season: [],
      },
      savedAt: "2026-04-19T12:00:00.000Z",
    });
  });

  it("skips clarification-only results", () => {
    expect(
      createStoredForagingSession(
        "Help",
        {
          intent: "clarify",
          confidence: 0.31,
          needsClarification: true,
          cues: {
            species: [],
            habitat: [],
            region: [],
            season: [],
          },
          missing: ["artifact_scope"],
        },
        "low",
      ),
    ).toBeNull();
  });
});
