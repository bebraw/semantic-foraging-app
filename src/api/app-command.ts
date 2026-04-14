import { z } from "zod";
import { createAppBus } from "../app/bus";
import type { AppContext } from "../app/context";
import { createAppErrorResult } from "../domain/contracts/result";
import { createErrorResponse } from "./error-response";

const IntentCommandSchema = z.object({
  input: z.string().trim().min(1),
});

const IntentClarificationSchema = z.object({
  workflowId: z.string().trim().min(1),
  clarification: z.string().trim().min(1),
});

const AppCommandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("SubmitUserIntent"),
    input: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal("ClarifyUserIntent"),
    workflowId: z.string().trim().min(1),
    clarification: z.string().trim().min(1),
  }),
]);

export async function handleIntentCommandRequest(request: Request, context: AppContext): Promise<Response> {
  const body = await request.json().catch(() => null);
  const parsed = IntentCommandSchema.safeParse(body);

  if (!parsed.success) {
    return createErrorResponse(createAppErrorResult("validation_error", "Request body must be JSON with a non-empty input string.", 400));
  }

  return createIntentResponseFromDispatch(context, {
    type: "SubmitUserIntent",
    rawInput: parsed.data.input,
  });
}

export async function handleAppCommandRequest(request: Request, context: AppContext): Promise<Response> {
  const body = await request.json().catch(() => null);
  const parsed = AppCommandSchema.safeParse(body);

  if (!parsed.success) {
    return createErrorResponse(
      createAppErrorResult(
        "validation_error",
        'Request body must be JSON with type "SubmitUserIntent" plus input, or type "ClarifyUserIntent" plus workflowId and clarification.',
        400,
      ),
    );
  }

  if (parsed.data.type === "SubmitUserIntent") {
    return createIntentResponseFromDispatch(context, {
      type: "SubmitUserIntent",
      rawInput: parsed.data.input,
    });
  }

  return createIntentResponseFromDispatch(context, {
    type: "ClarifyUserIntent",
    workflowId: parsed.data.workflowId,
    clarification: parsed.data.clarification,
  });
}

export async function handleIntentClarificationRequest(request: Request, context: AppContext): Promise<Response> {
  const body = await request.json().catch(() => null);
  const parsed = IntentClarificationSchema.safeParse(body);

  if (!parsed.success) {
    return createErrorResponse(
      createAppErrorResult("validation_error", "Request body must be JSON with non-empty workflowId and clarification strings.", 400),
    );
  }

  return createIntentResponseFromDispatch(context, {
    type: "ClarifyUserIntent",
    workflowId: parsed.data.workflowId,
    clarification: parsed.data.clarification,
  });
}

function createIntentResponse(payload: {
  input: string;
  classification: {
    intent: string;
    confidence: number;
    needsClarification: boolean;
  };
  confidenceBand: string;
  provenance: {
    source: string;
    provider: string | null;
    reason: string;
  };
  workflow: { name: string; state: string; workflowId?: string; question?: string; options?: string[] };
}): Response {
  return Response.json({
    ok: true,
    input: payload.input,
    classification: payload.classification,
    confidenceBand: payload.confidenceBand,
    provenance: payload.provenance,
    workflow: payload.workflow,
  });
}

async function createIntentResponseFromDispatch(
  context: AppContext,
  message:
    | {
        type: "SubmitUserIntent";
        rawInput: string;
      }
    | {
        type: "ClarifyUserIntent";
        workflowId: string;
        clarification: string;
      },
): Promise<Response> {
  const result = await createAppBus(context).dispatch(message);

  if (result.kind === "error") {
    return createErrorResponse(result);
  }

  if (result.kind !== "intent") {
    throw new Error("Expected an intent result");
  }

  return createIntentResponse(result.payload);
}
