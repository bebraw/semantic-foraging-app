import { createAppContext } from "./app/context";
import { exampleRoutes } from "./app-routes";
import { handleAppCommandRequest, handleIntentClarificationRequest, handleIntentCommandRequest } from "./api/app-command";
import { handleAppQueryRequest, handleExplanationQueryRequest, handleHealthRequest, handleHomePageRequest } from "./api/app-query";
import {
  handleArtifactRefineActionRequest,
  handleArtifactRestoreActionRequest,
  handleArtifactUseActionRequest,
  handleArtifactSaveActionRequest,
  handleExplanationActionRequest,
  handleIntentActionRequest,
  handleIntentClarificationActionRequest,
} from "./api/workbench";
import { createGeodataProvider } from "./infra/geodata";
import { resolveModelProvider } from "./infra/llm";
import { consoleLogger, logTraceSummary, silentLogger } from "./infra/observability/logger";
import { attachTraceHeaders, createRequestTrace } from "./infra/observability/trace";
import { InMemoryRecentSessionRepository, InMemorySavedArtifactRepository, InMemoryWorkflowRepository } from "./infra/storage/memory-store";
import { renderNotFoundPage } from "./views/not-found";
import { cssResponse, htmlResponse, javascriptResponse } from "./views/shared";

const workflowRepository = new InMemoryWorkflowRepository();
const recentSessionRepository = new InMemoryRecentSessionRepository();
const savedArtifactRepository = new InMemorySavedArtifactRepository();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return await handleRequest(request, env);
  },
};

export async function handleRequest(request: Request, env: Env = {}): Promise<Response> {
  const url = new URL(request.url);
  const trace = createRequestTrace(url.pathname);
  const context = createAppContext(
    exampleRoutes,
    resolveModelProvider(env),
    trace,
    workflowRepository,
    recentSessionRepository,
    createGeodataProvider(env),
    savedArtifactRepository,
  );
  let response: Response;

  if (url.pathname === "/styles.css") {
    response = cssResponse(await loadStylesheet());
    return finalizeResponse(response, trace);
  }

  if (url.pathname === "/vendor/leaflet.css") {
    response = cssResponse(await loadLeafletStylesheet());
    return finalizeResponse(response, trace);
  }

  if (url.pathname === "/vendor/leaflet.js") {
    response = javascriptResponse(await loadLeafletScript());
    return finalizeResponse(response, trace);
  }

  if (url.pathname === "/" && request.method === "POST") {
    response = await handleIntentActionRequest(request, context);
    return finalizeResponse(response, trace);
  }

  if (url.pathname === "/") {
    response = await handleHomePageRequest(context);
    return finalizeResponse(response, trace);
  }

  if (url.pathname === "/api/health") {
    response = await handleHealthRequest(context);
    return finalizeResponse(response, trace);
  }

  if (url.pathname === "/api/app/command" && request.method === "POST") {
    response = await handleAppCommandRequest(request, context);
    return finalizeResponse(response, trace);
  }

  if (url.pathname === "/api/app/query" && request.method === "POST") {
    response = await handleAppQueryRequest(request, context);
    return finalizeResponse(response, trace);
  }

  if (url.pathname === "/api/intent" && request.method === "POST") {
    response = await handleIntentCommandRequest(request, context);
    return finalizeResponse(response, trace);
  }

  if (url.pathname === "/api/intent/clarify" && request.method === "POST") {
    response = await handleIntentClarificationRequest(request, context);
    return finalizeResponse(response, trace);
  }

  if (url.pathname === "/api/explanation" && request.method === "POST") {
    response = await handleExplanationQueryRequest(request, context);
    return finalizeResponse(response, trace);
  }

  if (url.pathname === "/actions/intent" && request.method === "POST") {
    response = await handleIntentActionRequest(request, context);
    return finalizeResponse(response, trace);
  }

  if (url.pathname === "/actions/intent/clarify" && request.method === "POST") {
    response = await handleIntentClarificationActionRequest(request, context);
    return finalizeResponse(response, trace);
  }

  if (url.pathname === "/actions/explanation" && request.method === "POST") {
    response = await handleExplanationActionRequest(request, context);
    return finalizeResponse(response, trace);
  }

  if (url.pathname === "/actions/artifact/save" && request.method === "POST") {
    response = await handleArtifactSaveActionRequest(request, context);
    return finalizeResponse(response, trace);
  }

  if (url.pathname === "/actions/artifact/use" && request.method === "POST") {
    response = await handleArtifactUseActionRequest(request, context);
    return finalizeResponse(response, trace);
  }

  if (url.pathname === "/actions/artifact/refine" && request.method === "POST") {
    response = await handleArtifactRefineActionRequest(request, context);
    return finalizeResponse(response, trace);
  }

  if (url.pathname === "/actions/artifact/restore" && request.method === "POST") {
    response = await handleArtifactRestoreActionRequest(request, context);
    return finalizeResponse(response, trace);
  }

  response = htmlResponse(renderNotFoundPage(url.pathname), 404);
  return finalizeResponse(response, trace);
}

async function loadStylesheet(): Promise<string> {
  if (typeof process !== "undefined" && process.release?.name === "node") {
    const { readFile } = await import("node:fs/promises");
    return await readFile(new URL("../.generated/styles.css", import.meta.url), "utf8");
  }

  const styles = await import("./generated/styles");
  return styles.default;
}

async function loadLeafletStylesheet(): Promise<string> {
  if (typeof process !== "undefined" && process.release?.name === "node") {
    const { readFile } = await import("node:fs/promises");
    return await readFile(new URL("../node_modules/leaflet/dist/leaflet.css", import.meta.url), "utf8");
  }

  const stylesheet = await import("./generated/leaflet-css");
  return stylesheet.default;
}

async function loadLeafletScript(): Promise<string> {
  if (typeof process !== "undefined" && process.release?.name === "node") {
    const { readFile } = await import("node:fs/promises");
    return await readFile(new URL("../node_modules/leaflet/dist/leaflet.js", import.meta.url), "utf8");
  }

  const script = await import("./generated/leaflet-js");
  return script.default;
}

function finalizeResponse(response: Response, trace: ReturnType<typeof createRequestTrace>): Response {
  logTraceSummary(isTestRuntime() ? silentLogger : consoleLogger, trace);
  return attachTraceHeaders(response, trace);
}

function isTestRuntime(): boolean {
  return typeof process !== "undefined" && process.env.VITEST === "true";
}

export interface Env {
  AI?: {
    run(model: string, input: Record<string, unknown>): Promise<unknown>;
  };

  LOCAL_MODEL_BASE_URL?: string;
  LOCAL_MODEL_API_KEY?: string;
  LOCAL_MODEL_NAME?: string;

  WORKERS_AI_MODEL?: string;

  AI_GATEWAY_ACCOUNT_ID?: string;
  AI_GATEWAY_ID?: string;
  AI_GATEWAY_TOKEN?: string;
  AI_GATEWAY_PROVIDER_PATH?: string;
  AI_GATEWAY_MODEL?: string;

  MAP_BASEMAP_PROVIDER?: string;
  NLS_API_KEY?: string;
  FINBIF_ACCESS_TOKEN?: string;
}
