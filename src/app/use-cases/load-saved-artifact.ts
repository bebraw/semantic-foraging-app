import { createAppErrorResult, type AppErrorResult, type SavedArtifactResult } from "../../domain/contracts/result";
import type { AppContext } from "../context";
import type { LoadSavedArtifactMessage } from "../message";

export async function loadSavedArtifact(
  context: AppContext,
  message: LoadSavedArtifactMessage,
): Promise<SavedArtifactResult | AppErrorResult> {
  try {
    const artifact = await context.savedArtifactRepository.getArtifact(message.artifactId);

    if (!artifact) {
      context.trace.addEvent({
        module: "app.use-cases.load-saved-artifact",
        messageType: message.type,
        notes: [`artifact-id:${message.artifactId}`, "artifact:missing"],
      });

      return createAppErrorResult("validation_error", "Saved artifact was not found for the provided artifactId.", 404);
    }

    context.trace.addEvent({
      module: "app.use-cases.load-saved-artifact",
      messageType: message.type,
      notes: [`artifact-id:${message.artifactId}`, `artifact-kind:${artifact.kind}`, "artifact:loaded"],
    });

    return {
      kind: "saved-artifact",
      payload: artifact,
    };
  } catch {
    context.trace.addEvent({
      module: "app.use-cases.load-saved-artifact",
      messageType: message.type,
      notes: [`artifact-id:${message.artifactId}`, "artifact:load-failed"],
    });

    return createAppErrorResult("storage_failure", "Saved artifact state could not be loaded.", 503);
  }
}
