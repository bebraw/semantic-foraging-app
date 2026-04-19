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
  withWorkbenchAlert,
} from "../domain/agents/ui-agent";
import { renderHomePage } from "../views/home";
import { htmlResponse } from "../views/shared";

export async function handleIntentActionRequest(request: Request, context: AppContext): Promise<Response> {
  const formData = await request.formData();
  const rawInput = readRequiredField(formData, "input");
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

async function renderWorkbenchResponse(
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

function splitFacts(factsText: string): string[] {
  return factsText
    .split("\n")
    .map((fact) => fact.trim())
    .filter(Boolean);
}
