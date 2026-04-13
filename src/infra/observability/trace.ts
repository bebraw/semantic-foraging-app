import type { JsonCompletionRequest, ModelCapability, ModelProvider, TextCompletionRequest } from "../llm/provider";

export type TraceEvent = {
  at: string;
  module: string;
  messageType: string;
  durationMs?: number;
  notes?: string[];
};

export type RequestTrace = {
  id: string;
  route: string;
  events: TraceEvent[];
  addEvent(event: Omit<TraceEvent, "at">): void;
};

export function createRequestTrace(route: string): RequestTrace {
  const events: TraceEvent[] = [];

  return {
    id: createTraceId(),
    route,
    events,
    addEvent(event) {
      events.push({
        at: new Date().toISOString(),
        ...event,
      });
    },
  };
}

export async function traceOperation<T>(
  trace: RequestTrace,
  module: string,
  messageType: string,
  run: () => Promise<T>,
  notes: string[] = [],
): Promise<T> {
  const startedAt = Date.now();

  try {
    const result = await run();

    trace.addEvent({
      module,
      messageType,
      durationMs: Date.now() - startedAt,
      notes,
    });

    return result;
  } catch (error) {
    trace.addEvent({
      module,
      messageType,
      durationMs: Date.now() - startedAt,
      notes: [...notes, `error:${summarizeError(error)}`],
    });

    throw error;
  }
}

export function attachTraceHeaders(response: Response, trace: RequestTrace): Response {
  const headers = new Headers(response.headers);
  headers.set("x-trace-id", trace.id);
  headers.set("x-trace-events", String(trace.events.length));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function observeModelProvider(trace: RequestTrace, provider: ModelProvider | null): ModelProvider | null {
  if (!provider) {
    return null;
  }

  return {
    name: provider.name,
    async isAvailable(): Promise<boolean> {
      return await traceOperation(trace, "infra.llm", "isAvailable", async () => await provider.isAvailable(), [
        `provider:${provider.name}`,
      ]);
    },
    async getCapabilities(): Promise<ModelCapability> {
      return await traceOperation(trace, "infra.llm", "getCapabilities", async () => await provider.getCapabilities(), [
        `provider:${provider.name}`,
      ]);
    },
    async completeText(input: TextCompletionRequest): Promise<string> {
      return await traceOperation(trace, "infra.llm", "completeText", async () => await provider.completeText(input), [
        `provider:${provider.name}`,
      ]);
    },
    async completeJson<T>(input: JsonCompletionRequest): Promise<T> {
      return await traceOperation(trace, "infra.llm", "completeJson", async () => await provider.completeJson<T>(input), [
        `provider:${provider.name}`,
        `schema:${input.schemaName}`,
      ]);
    },
  };
}

function createTraceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `trace-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function summarizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "unknown";
}
