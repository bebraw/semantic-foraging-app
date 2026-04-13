import { z } from "zod";
import { createAppBus } from "../app/bus";
import type { AppContext } from "../app/context";

const IntentCommandSchema = z.object({
  input: z.string().trim().min(1),
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

  return Response.json({
    ok: true,
    input: result.payload.input,
    classification: result.payload.classification,
  });
}
