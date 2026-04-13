import { createAppContext } from "./app/context";
import { exampleRoutes } from "./app-routes";
import { handleIntentCommandRequest } from "./api/app-command";
import { handleExplanationQueryRequest, handleHealthRequest, handleHomePageRequest } from "./api/app-query";
import { resolveModelProvider } from "./infra/llm";
import { renderNotFoundPage } from "./views/not-found";
import { cssResponse, htmlResponse } from "./views/shared";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return await handleRequest(request, env);
  },
};

export async function handleRequest(request: Request, env: Env = {}): Promise<Response> {
  const url = new URL(request.url);
  const context = createAppContext(exampleRoutes, resolveModelProvider(env));

  if (url.pathname === "/styles.css") {
    return cssResponse(await loadStylesheet());
  }

  if (url.pathname === "/") {
    return await handleHomePageRequest(context);
  }

  if (url.pathname === "/api/health") {
    return await handleHealthRequest(context);
  }

  if (url.pathname === "/api/intent" && request.method === "POST") {
    return await handleIntentCommandRequest(request, context);
  }

  if (url.pathname === "/api/explanation" && request.method === "POST") {
    return await handleExplanationQueryRequest(request, context);
  }

  return htmlResponse(renderNotFoundPage(url.pathname), 404);
}

async function loadStylesheet(): Promise<string> {
  if (typeof process !== "undefined" && process.release?.name === "node") {
    const { readFile } = await import("node:fs/promises");
    return await readFile(new URL("../.generated/styles.css", import.meta.url), "utf8");
  }

  const styles = await import("./generated/styles");
  return styles.default;
}

export interface Env {
  AI?: {
    run(model: string, input: Record<string, unknown>): Promise<unknown>;
  };

  WORKERS_AI_MODEL?: string;

  AI_GATEWAY_ACCOUNT_ID?: string;
  AI_GATEWAY_ID?: string;
  AI_GATEWAY_TOKEN?: string;
  AI_GATEWAY_PROVIDER_PATH?: string;
  AI_GATEWAY_MODEL?: string;
}
