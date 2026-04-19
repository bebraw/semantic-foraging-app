import { createAppErrorResult, type AppErrorResult, type SavedArtifactResult } from "../../domain/contracts/result";
import type { AppContext } from "../context";
import type { RestoreSavedArtifactRevisionMessage } from "../message";

export async function restoreSavedArtifactRevision(
  context: AppContext,
  message: RestoreSavedArtifactRevisionMessage,
): Promise<SavedArtifactResult | AppErrorResult> {
  const existingArtifact = await context.savedArtifactRepository.getArtifact(message.artifactId);

  if (!existingArtifact) {
    context.trace.addEvent({
      module: "app.use-cases.restore-saved-artifact-revision",
      messageType: message.type,
      notes: [`artifact-id:${message.artifactId}`, "artifact:missing"],
    });

    return createAppErrorResult("validation_error", "Saved artifact was not found for the provided artifactId.", 404);
  }

  const revision = existingArtifact.revisions.find((entry) => entry.recordedAt === message.recordedAt);

  if (!revision) {
    context.trace.addEvent({
      module: "app.use-cases.restore-saved-artifact-revision",
      messageType: message.type,
      notes: [`artifact-id:${message.artifactId}`, `revision:${message.recordedAt}`, "artifact:revision-missing"],
    });

    return createAppErrorResult("validation_error", "Saved artifact revision was not found for the provided recordedAt.", 404);
  }

  const now = new Date().toISOString();
  const restoredArtifact = {
    ...existingArtifact,
    title: revision.title,
    summary: revision.summary,
    notes: revision.notes ?? "",
    updatedAt: now,
    revisions: [
      ...existingArtifact.revisions,
      {
        kind: "restored" as const,
        title: revision.title,
        summary: revision.summary,
        notes: revision.notes ?? "",
        recordedAt: now,
      },
    ],
  };

  try {
    await context.savedArtifactRepository.updateArtifact(restoredArtifact);
  } catch {
    context.trace.addEvent({
      module: "app.use-cases.restore-saved-artifact-revision",
      messageType: message.type,
      notes: [`artifact-id:${message.artifactId}`, `revision:${message.recordedAt}`, "artifact:update-failed"],
    });

    return createAppErrorResult("storage_failure", "Saved artifact revision could not be restored.", 503);
  }

  context.trace.addEvent({
    module: "app.use-cases.restore-saved-artifact-revision",
    messageType: message.type,
    notes: [`artifact-id:${message.artifactId}`, `revision:${message.recordedAt}`, "artifact:restored"],
  });

  return {
    kind: "saved-artifact",
    payload: restoredArtifact,
  };
}
