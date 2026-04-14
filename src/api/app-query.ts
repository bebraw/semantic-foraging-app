import { createAppBus } from "../app/bus";
import type { AppContext } from "../app/context";
import { createAppErrorResult } from "../domain/contracts/result";
import { renderHomePage } from "../views/home";
import { htmlResponse } from "../views/shared";
import { z } from "zod";
import { createErrorResponse } from "./error-response";

const AppExplanationQuerySchema = z.object({
  type: z.literal("RequestExplanation"),
  title: z.string().trim().min(1),
  facts: z.array(z.string().trim().min(1)).min(1),
});

const ExplanationQuerySchema = z.object({
  title: z.string().trim().min(1),
  facts: z.array(z.string().trim().min(1)).min(1),
});

const AppQuerySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("RenderHomeScreen"),
  }),
  AppExplanationQuerySchema,
]);

export async function handleHomePageRequest(context: AppContext): Promise<Response> {
  const result = await createAppBus(context).dispatch({ type: "RenderHomeScreen" });

  if (result.kind !== "screen" || result.screen.kind !== "home") {
    throw new Error("Expected a home screen result");
  }

  return htmlResponse(renderHomePage(result.screen));
}

export async function handleAppQueryRequest(request: Request, context: AppContext): Promise<Response> {
  const body = await request.json().catch(() => null);
  const parsed = AppQuerySchema.safeParse(body);

  if (!parsed.success) {
    return createErrorResponse(
      createAppErrorResult(
        "validation_error",
        'Request body must be JSON with type "RenderHomeScreen", or type "RequestExplanation" plus title and at least one fact.',
        400,
      ),
    );
  }

  if (parsed.data.type === "RenderHomeScreen") {
    return createHomeScreenQueryResponse(context);
  }

  return createExplanationQueryResponse(context, parsed.data.title, parsed.data.facts, true);
}

export async function handleHealthRequest(context: AppContext): Promise<Response> {
  const result = await createAppBus(context).dispatch({ type: "RunHealthCheck" });

  if (result.kind !== "health") {
    throw new Error("Expected a health result");
  }

  return Response.json(result.payload);
}

export async function handleExplanationQueryRequest(request: Request, context: AppContext): Promise<Response> {
  const body = await request.json().catch(() => null);
  const parsed = ExplanationQuerySchema.safeParse(body);

  if (!parsed.success) {
    return createErrorResponse(
      createAppErrorResult("validation_error", "Request body must be JSON with a non-empty title and at least one fact.", 400),
    );
  }

  return createExplanationQueryResponse(context, parsed.data.title, parsed.data.facts);
}

async function createHomeScreenQueryResponse(context: AppContext): Promise<Response> {
  const result = await createAppBus(context).dispatch({ type: "RenderHomeScreen" });

  if (result.kind === "error") {
    return createErrorResponse(result);
  }

  if (result.kind !== "screen") {
    throw new Error("Expected a screen result");
  }

  return Response.json({
    ok: true,
    type: "RenderHomeScreen",
    screen: result.screen,
  });
}

async function createExplanationQueryResponse(context: AppContext, title: string, facts: string[], includeType = false): Promise<Response> {
  const result = await createAppBus(context).dispatch({
    type: "RequestExplanation",
    title,
    facts,
  });

  if (result.kind === "error") {
    return createErrorResponse(result);
  }

  if (result.kind !== "explanation") {
    throw new Error("Expected an explanation result");
  }

  return Response.json({
    ok: true,
    ...(includeType ? { type: "RequestExplanation" } : {}),
    title: result.payload.title,
    facts: result.payload.facts,
    explanation: result.payload.explanation,
    provenance: result.payload.provenance,
  });
}
