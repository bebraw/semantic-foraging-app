import { createAppBus } from "../app/bus";
import type { AppContext } from "../app/context";
import { renderHomePage } from "../views/home";
import { htmlResponse } from "../views/shared";
import { z } from "zod";

const ExplanationQuerySchema = z.object({
  title: z.string().trim().min(1),
  facts: z.array(z.string().trim().min(1)).min(1),
});

const AppQuerySchema = z.object({
  screen: z.literal("home"),
});

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
    return Response.json(
      {
        ok: false,
        error: 'Request body must be JSON with screen: "home".',
      },
      { status: 400 },
    );
  }

  const result = await createAppBus(context).dispatch({ type: "RenderHomeScreen" });

  if (result.kind !== "screen") {
    throw new Error("Expected a screen result");
  }

  return Response.json({
    ok: true,
    screen: result.screen,
  });
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
    return Response.json(
      {
        ok: false,
        error: "Request body must be JSON with a non-empty title and at least one fact.",
      },
      { status: 400 },
    );
  }

  const result = await createAppBus(context).dispatch({
    type: "RequestExplanation",
    title: parsed.data.title,
    facts: parsed.data.facts,
  });

  if (result.kind !== "explanation") {
    throw new Error("Expected an explanation result");
  }

  return Response.json({
    ok: true,
    title: result.payload.title,
    facts: result.payload.facts,
    explanation: result.payload.explanation,
  });
}
