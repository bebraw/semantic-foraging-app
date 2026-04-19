import { createAppErrorResult, type AppErrorResult, type SavedArtifactResult } from "../../domain/contracts/result";
import type { AppContext } from "../context";
import type { RefineSavedArtifactMessage } from "../message";

export async function refineSavedArtifact(
  context: AppContext,
  message: RefineSavedArtifactMessage,
): Promise<SavedArtifactResult | AppErrorResult> {
  const existingArtifact = await context.savedArtifactRepository.getArtifact(message.artifactId);

  if (!existingArtifact) {
    context.trace.addEvent({
      module: "app.use-cases.refine-saved-artifact",
      messageType: message.type,
      notes: [`artifact-id:${message.artifactId}`, "artifact:missing"],
    });

    return createAppErrorResult("validation_error", "Saved artifact was not found for the provided artifactId.", 404);
  }

  const now = new Date().toISOString();
  const refinedArtifact = {
    ...existingArtifact,
    title: message.title,
    summary: message.summary,
    notes: message.notes,
    updatedAt: now,
    revisions: [
      ...existingArtifact.revisions,
      {
        kind: "refined" as const,
        title: message.title,
        summary: message.summary,
        notes: message.notes,
        recordedAt: now,
      },
    ],
  };

  try {
    await context.savedArtifactRepository.updateArtifact(refinedArtifact);
  } catch {
    context.trace.addEvent({
      module: "app.use-cases.refine-saved-artifact",
      messageType: message.type,
      notes: [`artifact-id:${message.artifactId}`, "artifact:update-failed"],
    });

    return createAppErrorResult("storage_failure", "Saved artifact state could not be updated.", 503);
  }

  context.trace.addEvent({
    module: "app.use-cases.refine-saved-artifact",
    messageType: message.type,
    notes: [`artifact-id:${message.artifactId}`, "artifact:refined"],
  });

  return {
    kind: "saved-artifact",
    payload: refinedArtifact,
  };
}
