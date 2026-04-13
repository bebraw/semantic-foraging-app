import { createAppContext } from "./app/context";
import { exampleRoutes } from "./app-routes";
import { handleHealthRequest, handleHomePageRequest } from "./api/app-query";
import { renderNotFoundPage } from "./views/not-found";
import { cssResponse, htmlResponse } from "./views/shared";

export default {
  async fetch(request: Request): Promise<Response> {
    return await handleRequest(request);
  },
};

export async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const context = createAppContext(exampleRoutes);

  if (url.pathname === "/styles.css") {
    return cssResponse(await loadStylesheet());
  }

  if (url.pathname === "/") {
    return await handleHomePageRequest(context);
  }

  if (url.pathname === "/api/health") {
    return await handleHealthRequest(context);
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
