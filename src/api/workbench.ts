import { z } from "zod";
import { createAppBus } from "../app/bus";
import type { AppContext } from "../app/context";
import type { AppErrorResult } from "../domain/contracts/result";
import {
  createInitialForagingWorkbenchState,
  createWorkbenchAlert,
  withExplanationInput,
  withExplanationSubmission,
  withIntentInput,
  withIntentSubmission,
  withSavedArtifactSeed,
  withWorkbenchAlert,
} from "../domain/agents/ui-agent";
import { renderHomePage } from "../views/home";
import { htmlResponse } from "../views/shared";

const CuesSchema = z.object({
  species: z.array(z.string()),
  habitat: z.array(z.string()),
  region: z.array(z.string()),
  season: z.array(z.string()),
});
const MissingContextSchema = z.enum(["artifact_scope", "species", "habitat", "region", "season"]);

const CandidateSchema = z.object({
  id: z.string().trim().min(1),
  kind: z.enum(["observation", "field-note", "patch", "trail", "session"]),
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  statusLabel: z.string().trim().min(1),
  evidence: z.array(
    z.object({
      label: z.string(),
      detail: z.string(),
    }),
  ),
  spatialContext: CuesSchema,
});

const ProvenanceSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("deterministic-fallback"),
    provider: z.null(),
    reason: z.enum(["no-model-provider", "provider-unavailable", "model-inference-failed", "model-schema-failed", "artifact-reuse"]),
  }),
  z.object({
    source: z.literal("model"),
    provider: z.string().min(1),
    reason: z.literal("structured-inference"),
  }),
]);

const CompletedIntentSubmissionSchema = z.object({
  input: z.string().trim().min(1),
  classification: z.object({
    intent: z.enum(["find-observations", "create-field-note", "inspect-patch", "explain-suggestion", "resume-session"]),
    confidence: z.number(),
    needsClarification: z.boolean(),
    cues: CuesSchema,
    missing: z.array(MissingContextSchema),
  }),
  confidenceBand: z.enum(["low", "medium", "high"]),
  provenance: ProvenanceSchema,
  workflow: z.object({
    name: z.literal("intent-classification"),
    state: z.literal("completed"),
  }),
});

export async function handleIntentActionRequest(request: Request, context: AppContext): Promise<Response> {
  const formData = await request.formData();
  const rawInput = readFirstRequiredField(formData, ["inputExample", "input"]);
  let state = withIntentInput(createInitialForagingWorkbenchState(), rawInput.value);

  if (!rawInput.ok) {
    return await renderWorkbenchResponse(
      context,
      withWorkbenchAlert(
        state,
        createWorkbenchAlert("Intent input required", "Enter a natural-language foraging request before submitting."),
      ),
      400,
    );
  }

  const result = await createAppBus(context).dispatch({
    type: "SubmitUserIntent",
    rawInput: rawInput.value,
  });

  if (result.kind === "error") {
    return await renderWorkbenchErrorResponse(context, state, result, "Intent request failed");
  }

  if (result.kind !== "intent") {
    throw new Error("Expected an intent result");
  }

  state = withIntentSubmission(state, result.payload);

  if (new URL(request.url).pathname === "/") {
    return redirectToSearchQuery(result.payload.input);
  }

  return await renderWorkbenchResponse(context, state);
}

export async function handleIntentClarificationActionRequest(request: Request, context: AppContext): Promise<Response> {
  const formData = await request.formData();
  const workflowId = readRequiredField(formData, "workflowId");
  const clarification = readRequiredField(formData, "clarification");
  let state = withIntentInput(createInitialForagingWorkbenchState(), "", clarification.value);

  if (!workflowId.ok || !clarification.ok) {
    return await renderWorkbenchResponse(
      context,
      withWorkbenchAlert(
        state,
        createWorkbenchAlert(
          "Clarification required",
          "Provide the workflow id and a clarification response before retrying the foraging workflow.",
        ),
      ),
      400,
    );
  }

  const result = await createAppBus(context).dispatch({
    type: "ClarifyUserIntent",
    workflowId: workflowId.value,
    clarification: clarification.value,
  });

  if (result.kind === "error") {
    return await renderWorkbenchErrorResponse(context, state, result, "Clarification failed");
  }

  if (result.kind !== "intent") {
    throw new Error("Expected an intent result");
  }

  state = withIntentSubmission(state, result.payload, clarification.value);
  return await renderWorkbenchResponse(context, state);
}

export async function handleExplanationActionRequest(request: Request, context: AppContext): Promise<Response> {
  const formData = await request.formData();
  const title = readRequiredField(formData, "title");
  const factsText = readRequiredField(formData, "facts");
  let state = withExplanationInput(createInitialForagingWorkbenchState(), title.value, factsText.value);

  const facts = splitFacts(factsText.value);

  if (!title.ok || !factsText.ok || facts.length === 0) {
    return await renderWorkbenchResponse(
      context,
      withWorkbenchAlert(
        state,
        createWorkbenchAlert(
          "Grounded explanation input required",
          "Provide a title and at least one fact line before requesting an explanation.",
        ),
      ),
      400,
    );
  }

  const result = await createAppBus(context).dispatch({
    type: "RequestExplanation",
    title: title.value,
    facts,
  });

  if (result.kind === "error") {
    return await renderWorkbenchErrorResponse(context, state, result, "Explanation request failed");
  }

  if (result.kind !== "explanation") {
    throw new Error("Expected an explanation result");
  }

  state = withExplanationSubmission(state, result.payload);
  return await renderWorkbenchResponse(context, state);
}

export async function handleArtifactSaveActionRequest(request: Request, context: AppContext): Promise<Response> {
  const formData = await request.formData();
  const candidateField = readRequiredField(formData, "candidate");
  const sourceIntent = readRequiredField(formData, "sourceIntent");
  const intentSubmissionField = readRequiredField(formData, "intentSubmission");
  const parsedCandidate = parseJsonField(candidateField.value, CandidateSchema);
  const parsedSubmission = parseJsonField(intentSubmissionField.value, CompletedIntentSubmissionSchema);
  let state = createInitialForagingWorkbenchState();

  if (parsedSubmission) {
    state = withIntentSubmission(state, parsedSubmission);
  }

  if (
    !candidateField.ok ||
    !sourceIntent.ok ||
    !intentSubmissionField.ok ||
    !parsedCandidate ||
    !parsedSubmission ||
    sourceIntent.value !== parsedSubmission.classification.intent
  ) {
    return await renderWorkbenchResponse(
      context,
      withWorkbenchAlert(
        state,
        createWorkbenchAlert("Artifact save failed", "Provide a supported candidate and completed intent state before saving."),
      ),
      400,
    );
  }

  const result = await createAppBus(context).dispatch({
    type: "SaveArtifact",
    candidate: parsedCandidate,
    sourceIntent: parsedSubmission.classification.intent,
  });

  if (result.kind === "error") {
    return await renderWorkbenchErrorResponse(context, state, result, "Artifact save failed");
  }

  if (result.kind !== "saved-artifact") {
    throw new Error("Expected a saved-artifact result");
  }

  return await renderWorkbenchResponse(
    context,
    withWorkbenchAlert(state, createWorkbenchAlert("Artifact saved", `Saved ${result.payload.title} as ${result.payload.kind}.`, "info")),
  );
}

export async function handleArtifactUseActionRequest(request: Request, context: AppContext): Promise<Response> {
  const formData = await request.formData();
  const artifactId = readRequiredField(formData, "artifactId");
  const recordedAt = readOptionalField(formData, "recordedAt");
  const state = createInitialForagingWorkbenchState();

  if (!artifactId.ok) {
    return await renderWorkbenchResponse(
      context,
      withWorkbenchAlert(state, createWorkbenchAlert("Artifact load failed", "Provide an artifact id before reusing a saved artifact.")),
      400,
    );
  }

  const result = recordedAt.value
    ? await createAppBus(context).dispatch({
        type: "LoadSavedArtifactRevision",
        artifactId: artifactId.value,
        recordedAt: recordedAt.value,
      })
    : await createAppBus(context).dispatch({
        type: "LoadSavedArtifact",
        artifactId: artifactId.value,
      });

  if (result.kind === "error") {
    return await renderWorkbenchErrorResponse(context, state, result, "Artifact load failed");
  }

  if (result.kind !== "saved-artifact") {
    throw new Error("Expected a saved-artifact result");
  }

  return await renderWorkbenchResponse(
    context,
    withWorkbenchAlert(
      withSavedArtifactSeed(state, result.payload),
      createWorkbenchAlert(
        "Artifact loaded",
        recordedAt.value
          ? `Loaded ${result.payload.title} from revision history into the workbench forms.`
          : `Loaded ${result.payload.title} into the workbench forms.`,
        "info",
      ),
    ),
  );
}

export async function handleArtifactRefineActionRequest(request: Request, context: AppContext): Promise<Response> {
  const formData = await request.formData();
  const artifactId = readRequiredField(formData, "artifactId");
  const title = readRequiredField(formData, "title");
  const summary = readRequiredField(formData, "summary");
  const notes = readOptionalField(formData, "notes");
  const state = createInitialForagingWorkbenchState();

  if (!artifactId.ok || !title.ok || !summary.ok) {
    return await renderWorkbenchResponse(
      context,
      withWorkbenchAlert(
        state,
        createWorkbenchAlert("Artifact update failed", "Provide an artifact id, title, and summary before refining a saved artifact."),
      ),
      400,
    );
  }

  const result = await createAppBus(context).dispatch({
    type: "RefineSavedArtifact",
    artifactId: artifactId.value,
    title: title.value,
    summary: summary.value,
    notes: notes.value,
  });

  if (result.kind === "error") {
    return await renderWorkbenchErrorResponse(context, state, result, "Artifact update failed");
  }

  if (result.kind !== "saved-artifact") {
    throw new Error("Expected a saved-artifact result");
  }

  return await renderWorkbenchResponse(
    context,
    withWorkbenchAlert(
      state,
      createWorkbenchAlert("Artifact updated", `Updated ${result.payload.title} without leaving the workbench.`, "info"),
    ),
  );
}

export async function handleArtifactRestoreActionRequest(request: Request, context: AppContext): Promise<Response> {
  const formData = await request.formData();
  const artifactId = readRequiredField(formData, "artifactId");
  const recordedAt = readRequiredField(formData, "recordedAt");
  const state = createInitialForagingWorkbenchState();

  if (!artifactId.ok || !recordedAt.ok) {
    return await renderWorkbenchResponse(
      context,
      withWorkbenchAlert(
        state,
        createWorkbenchAlert("Artifact restore failed", "Provide an artifact id and recorded revision timestamp before restoring."),
      ),
      400,
    );
  }

  const result = await createAppBus(context).dispatch({
    type: "RestoreSavedArtifactRevision",
    artifactId: artifactId.value,
    recordedAt: recordedAt.value,
  });

  if (result.kind === "error") {
    return await renderWorkbenchErrorResponse(context, state, result, "Artifact restore failed");
  }

  if (result.kind !== "saved-artifact") {
    throw new Error("Expected a saved-artifact result");
  }

  return await renderWorkbenchResponse(
    context,
    withWorkbenchAlert(state, createWorkbenchAlert("Artifact restored", `Restored ${result.payload.title} from revision history.`, "info")),
  );
}

async function renderWorkbenchErrorResponse(
  context: AppContext,
  state: ReturnType<typeof createInitialForagingWorkbenchState>,
  result: AppErrorResult,
  title: string,
): Promise<Response> {
  return await renderWorkbenchResponse(
    context,
    withWorkbenchAlert(state, createWorkbenchAlert(title, result.error.message)),
    result.error.status,
  );
}

export async function renderWorkbenchResponse(
  context: AppContext,
  workbench: ReturnType<typeof createInitialForagingWorkbenchState>,
  status = 200,
) {
  const result = await createAppBus(context).dispatch({
    type: "RenderHomeScreen",
    workbench,
  });

  if (result.kind !== "screen" || result.screen.kind !== "home") {
    throw new Error("Expected a home screen result");
  }

  return htmlResponse(renderHomePage(result.screen), status);
}

function redirectToSearchQuery(rawInput: string): Response {
  const destination = new URL("http://local/");
  destination.searchParams.set("input", rawInput);

  return new Response(null, {
    status: 303,
    headers: {
      location: destination.pathname + destination.search,
    },
  });
}

function readRequiredField(formData: FormData, name: string): { ok: true; value: string } | { ok: false; value: string } {
  const rawValue = formData.get(name);
  const value = typeof rawValue === "string" ? rawValue.trim() : "";

  if (!value) {
    return {
      ok: false,
      value: "",
    };
  }

  return {
    ok: true,
    value,
  };
}

function readFirstRequiredField(formData: FormData, names: string[]): { ok: true; value: string } | { ok: false; value: string } {
  for (const name of names) {
    const field = readRequiredField(formData, name);

    if (field.ok) {
      return field;
    }
  }

  return {
    ok: false,
    value: "",
  };
}

function readOptionalField(formData: FormData, name: string): { value: string } {
  const rawValue = formData.get(name);

  return {
    value: typeof rawValue === "string" ? rawValue.trim() : "",
  };
}

function splitFacts(factsText: string): string[] {
  return factsText
    .split("\n")
    .map((fact) => fact.trim())
    .filter(Boolean);
}

function parseJsonField<T extends z.ZodTypeAny>(value: string, schema: T): z.infer<T> | null {
  try {
    const parsed = value ? JSON.parse(value) : null;
    const result = schema.safeParse(parsed);

    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
