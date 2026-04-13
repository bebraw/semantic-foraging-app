import type { RequestTrace } from "./trace";

export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
}

export const silentLogger: Logger = {
  info() {},
};

export const consoleLogger: Logger = {
  info(message, context) {
    console.info(message, context);
  },
};

export function logTraceSummary(logger: Logger, trace: RequestTrace): void {
  logger.info("request trace", {
    traceId: trace.id,
    route: trace.route,
    events: trace.events.length,
  });
}
