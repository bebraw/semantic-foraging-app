import { createAppBus } from "../app/bus";
import type { AppContext } from "../app/context";
import { renderHomePage } from "../views/home";
import { htmlResponse } from "../views/shared";

export async function handleHomePageRequest(context: AppContext): Promise<Response> {
  const result = await createAppBus(context).dispatch({ type: "RenderHomeScreen" });

  if (result.kind !== "screen" || result.screen.kind !== "home") {
    throw new Error("Expected a home screen result");
  }

  return htmlResponse(renderHomePage(result.screen));
}

export async function handleHealthRequest(context: AppContext): Promise<Response> {
  const result = await createAppBus(context).dispatch({ type: "RunHealthCheck" });

  if (result.kind !== "health") {
    throw new Error("Expected a health result");
  }

  return Response.json(result.payload);
}
