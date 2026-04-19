import { createStoredForagingArtifact } from "../../domain/agents/artifact-agent";
import { createAppErrorResult, type AppErrorResult, type SavedArtifactResult } from "../../domain/contracts/result";
import type { AppContext } from "../context";
import type { SaveArtifactMessage } from "../message";

export async function saveArtifact(context: AppContext, message: SaveArtifactMessage): Promise<SavedArtifactResult | AppErrorResult> {
  const artifact = createStoredForagingArtifact(message.candidate, message.sourceIntent);

  if (!artifact) {
    context.trace.addEvent({
      module: "app.use-cases.save-artifact",
      messageType: message.type,
      notes: [`candidate:${message.candidate.id}`, `candidate-kind:${message.candidate.kind}`, "artifact:unsupported"],
    });

    return createAppErrorResult("validation_error", "This candidate cannot be saved as a durable artifact.", 400);
  }

  try {
    await context.savedArtifactRepository.saveArtifact(artifact);
  } catch {
    context.trace.addEvent({
      module: "app.use-cases.save-artifact",
      messageType: message.type,
      notes: [`candidate:${message.candidate.id}`, `artifact-kind:${artifact.kind}`, "artifact:save-failed"],
    });

    return createAppErrorResult("storage_failure", "Saved artifact state could not be stored.", 503);
  }

  context.trace.addEvent({
    module: "app.use-cases.save-artifact",
    messageType: message.type,
    notes: [`candidate:${message.candidate.id}`, `artifact-id:${artifact.artifactId}`, `artifact-kind:${artifact.kind}`, "artifact:stored"],
  });

  return {
    kind: "saved-artifact",
    payload: artifact,
  };
}
