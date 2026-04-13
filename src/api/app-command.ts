import { z } from "zod";
import { createAppBus } from "../app/bus";
import type { AppContext } from "../app/context";

const IntentCommandSchema = z.object({
  input: z.string().trim().min(1),
});

const IntentClarificationSchema = z.object({
  input: z.string().trim().min(1),
  clarification: z.string().trim().min(1),
});

export async function handleIntentCommandRequest(request: Request, context: AppContext): Promise<Response> {
  const body = await request.json().catch(() => null);
  const parsed = IntentCommandSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: "Request body must be JSON with a non-empty input string.",
      },
      { status: 400 },
    );
  }

  const result = await createAppBus(context).dispatch({
    type: "SubmitUserIntent",
    rawInput: parsed.data.input,
  });

  if (result.kind !== "intent") {
    throw new Error("Expected an intent result");
  }

  return createIntentResponse(result.payload);
}

export async function handleIntentClarificationRequest(request: Request, context: AppContext): Promise<Response> {
  const body = await request.json().catch(() => null);
  const parsed = IntentClarificationSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: "Request body must be JSON with non-empty input and clarification strings.",
      },
      { status: 400 },
    );
  }

  const result = await createAppBus(context).dispatch({
    type: "ClarifyUserIntent",
    rawInput: parsed.data.input,
    clarification: parsed.data.clarification,
  });

  if (result.kind !== "intent") {
    throw new Error("Expected an intent result");
  }

  return createIntentResponse(result.payload);
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
  workflow: { name: string; state: string; question?: string; options?: string[] };
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
