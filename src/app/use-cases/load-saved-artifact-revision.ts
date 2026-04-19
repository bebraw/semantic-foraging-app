import { createAppErrorResult, type AppErrorResult, type SavedArtifactResult } from "../../domain/contracts/result";
import type { StoredForagingArtifact } from "../../domain/contracts/artifact";
import type { AppContext } from "../context";
import type { LoadSavedArtifactRevisionMessage } from "../message";

export async function loadSavedArtifactRevision(
  context: AppContext,
  message: LoadSavedArtifactRevisionMessage,
): Promise<SavedArtifactResult | AppErrorResult> {
  try {
    const artifact = await context.savedArtifactRepository.getArtifact(message.artifactId);

    if (!artifact) {
      context.trace.addEvent({
        module: "app.use-cases.load-saved-artifact-revision",
        messageType: message.type,
        notes: [`artifact-id:${message.artifactId}`, "artifact:missing"],
      });

      return createAppErrorResult("validation_error", "Saved artifact was not found for the provided artifactId.", 404);
    }

    const revision = artifact.revisions.find((entry) => entry.recordedAt === message.recordedAt);

    if (!revision) {
      context.trace.addEvent({
        module: "app.use-cases.load-saved-artifact-revision",
        messageType: message.type,
        notes: [`artifact-id:${message.artifactId}`, `revision:${message.recordedAt}`, "artifact:revision-missing"],
      });

      return createAppErrorResult("validation_error", "Saved artifact revision was not found for the provided recordedAt.", 404);
    }

    const artifactRevision = createArtifactRevisionSnapshot(artifact, message.recordedAt);

    context.trace.addEvent({
      module: "app.use-cases.load-saved-artifact-revision",
      messageType: message.type,
      notes: [
        `artifact-id:${message.artifactId}`,
        `revision:${message.recordedAt}`,
        `artifact-kind:${artifact.kind}`,
        "artifact:revision-loaded",
      ],
    });

    return {
      kind: "saved-artifact",
      payload: artifactRevision,
    };
  } catch {
    context.trace.addEvent({
      module: "app.use-cases.load-saved-artifact-revision",
      messageType: message.type,
      notes: [`artifact-id:${message.artifactId}`, `revision:${message.recordedAt}`, "artifact:load-failed"],
    });

    return createAppErrorResult("storage_failure", "Saved artifact revision could not be loaded.", 503);
  }
}

function createArtifactRevisionSnapshot(artifact: StoredForagingArtifact, recordedAt: string): StoredForagingArtifact {
  const revision = artifact.revisions.find((entry) => entry.recordedAt === recordedAt);

  if (!revision) {
    throw new Error(`Revision ${recordedAt} was not found for artifact ${artifact.artifactId}.`);
  }

  return {
    ...artifact,
    title: revision.title,
    summary: revision.summary,
    notes: revision.notes ?? "",
  };
}
