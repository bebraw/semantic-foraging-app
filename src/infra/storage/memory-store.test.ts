import { describe, expect, it } from "vitest";
import { InMemoryRecentSessionRepository, InMemorySavedArtifactRepository, InMemoryWorkflowRepository } from "./memory-store";

describe("InMemoryWorkflowRepository", () => {
  it("stores and returns intent workflow snapshots", async () => {
    const repository = new InMemoryWorkflowRepository();

    await repository.saveIntentWorkflow({
      workflowId: "workflow-123",
      rawInput: "Help",
      state: "awaiting_clarification",
      question:
        'What kind of foraging task does "Help" describe: find observations, create a field note, inspect a patch, explain a suggestion, or resume a session?',
      options: ["find-observations", "create-field-note", "inspect-patch", "explain-suggestion", "resume-session"],
    });

    await expect(repository.getIntentWorkflow("workflow-123")).resolves.toEqual({
      workflowId: "workflow-123",
      rawInput: "Help",
      state: "awaiting_clarification",
      question:
        'What kind of foraging task does "Help" describe: find observations, create a field note, inspect a patch, explain a suggestion, or resume a session?',
      options: ["find-observations", "create-field-note", "inspect-patch", "explain-suggestion", "resume-session"],
    });
  });

  it("returns null for unknown workflow ids", async () => {
    const repository = new InMemoryWorkflowRepository();

    await expect(repository.getIntentWorkflow("missing")).resolves.toBeNull();
  });

  it("removes stored workflow snapshots", async () => {
    const repository = new InMemoryWorkflowRepository();

    await repository.saveIntentWorkflow({
      workflowId: "workflow-123",
      rawInput: "Help",
      state: "awaiting_clarification",
      question:
        'What kind of foraging task does "Help" describe: find observations, create a field note, inspect a patch, explain a suggestion, or resume a session?',
      options: ["find-observations", "create-field-note", "inspect-patch", "explain-suggestion", "resume-session"],
    });

    await repository.deleteIntentWorkflow("workflow-123");

    await expect(repository.getIntentWorkflow("workflow-123")).resolves.toBeNull();
  });
});

describe("InMemoryRecentSessionRepository", () => {
  it("stores recent sessions newest first", async () => {
    const repository = new InMemoryRecentSessionRepository();

    await repository.saveRecentSession({
      sessionId: "session-1",
      input: "First",
      title: "First",
      summary: "First summary",
      sourceIntent: "find-observations",
      cues: {
        species: [],
        habitat: [],
        region: [],
        season: [],
      },
      savedAt: "2026-04-19T10:00:00.000Z",
    });
    await repository.saveRecentSession({
      sessionId: "session-2",
      input: "Second",
      title: "Second",
      summary: "Second summary",
      sourceIntent: "resume-session",
      cues: {
        species: ["chanterelle"],
        habitat: [],
        region: [],
        season: [],
      },
      savedAt: "2026-04-19T11:00:00.000Z",
    });

    await expect(repository.listRecentSessions(5)).resolves.toEqual([
      expect.objectContaining({ sessionId: "session-2" }),
      expect.objectContaining({ sessionId: "session-1" }),
    ]);
  });
});

describe("InMemorySavedArtifactRepository", () => {
  it("stores saved artifacts newest first", async () => {
    const repository = new InMemorySavedArtifactRepository();

    await repository.saveArtifact({
      artifactId: "trail-1",
      sourceCardId: "trail-card-1",
      kind: "trail",
      title: "First trail",
      summary: "First summary",
      sourceIntent: "explain-suggestion",
      cues: {
        species: [],
        habitat: [],
        region: [],
        season: [],
      },
      evidence: [],
      spatialContext: {
        species: [],
        habitat: [],
        region: [],
        season: [],
      },
      savedAt: "2026-04-19T10:00:00.000Z",
    });
    await repository.saveArtifact({
      artifactId: "trail-2",
      sourceCardId: "trail-card-2",
      kind: "trail",
      title: "Second trail",
      summary: "Second summary",
      sourceIntent: "explain-suggestion",
      cues: {
        species: ["chanterelle"],
        habitat: [],
        region: [],
        season: [],
      },
      evidence: [],
      spatialContext: {
        species: ["chanterelle"],
        habitat: [],
        region: [],
        season: [],
      },
      savedAt: "2026-04-19T11:00:00.000Z",
    });

    await expect(repository.listArtifacts(5)).resolves.toEqual([
      expect.objectContaining({ artifactId: "trail-2" }),
      expect.objectContaining({ artifactId: "trail-1" }),
    ]);
  });

  it("returns a saved artifact by id", async () => {
    const repository = new InMemorySavedArtifactRepository();

    await repository.saveArtifact({
      artifactId: "trail-1",
      sourceCardId: "trail-card-1",
      kind: "trail",
      title: "Saved trail",
      summary: "Saved trail summary",
      sourceIntent: "explain-suggestion",
      cues: {
        species: [],
        habitat: [],
        region: [],
        season: [],
      },
      evidence: [],
      spatialContext: {
        species: [],
        habitat: [],
        region: [],
        season: [],
      },
      savedAt: "2026-04-19T10:00:00.000Z",
    });

    await expect(repository.getArtifact("trail-1")).resolves.toEqual(expect.objectContaining({ artifactId: "trail-1" }));
    await expect(repository.getArtifact("missing")).resolves.toBeNull();
  });

  it("updates a saved artifact in place", async () => {
    const repository = new InMemorySavedArtifactRepository();

    await repository.saveArtifact({
      artifactId: "trail-1",
      sourceCardId: "trail-card-1",
      kind: "trail",
      title: "Saved trail",
      summary: "Saved trail summary",
      sourceIntent: "explain-suggestion",
      cues: {
        species: [],
        habitat: [],
        region: [],
        season: [],
      },
      evidence: [],
      spatialContext: {
        species: [],
        habitat: [],
        region: [],
        season: [],
      },
      savedAt: "2026-04-19T10:00:00.000Z",
    });

    await repository.updateArtifact({
      artifactId: "trail-1",
      sourceCardId: "trail-card-1",
      kind: "trail",
      title: "Refined trail",
      summary: "Refined trail summary",
      sourceIntent: "explain-suggestion",
      cues: {
        species: [],
        habitat: [],
        region: [],
        season: [],
      },
      evidence: [],
      spatialContext: {
        species: [],
        habitat: [],
        region: [],
        season: [],
      },
      savedAt: "2026-04-19T10:00:00.000Z",
    });

    await expect(repository.getArtifact("trail-1")).resolves.toEqual(
      expect.objectContaining({
        title: "Refined trail",
        summary: "Refined trail summary",
      }),
    );
  });

  it("fails when updating a missing saved artifact", async () => {
    const repository = new InMemorySavedArtifactRepository();

    await expect(
      repository.updateArtifact({
        artifactId: "missing",
        sourceCardId: "trail-card-1",
        kind: "trail",
        title: "Refined trail",
        summary: "Refined trail summary",
        sourceIntent: "explain-suggestion",
        cues: {
          species: [],
          habitat: [],
          region: [],
          season: [],
        },
        evidence: [],
        spatialContext: {
          species: [],
          habitat: [],
          region: [],
          season: [],
        },
        savedAt: "2026-04-19T10:00:00.000Z",
      }),
    ).rejects.toThrow("Artifact missing was not found.");
  });
});
