import { describe, expect, it, vi } from "vitest";
import { consoleLogger, logTraceSummary, silentLogger } from "./logger";
import { createRequestTrace } from "./trace";

describe("silentLogger", () => {
  it("accepts info logs without throwing", () => {
    expect(() => {
      silentLogger.info("message", { ok: true });
    }).not.toThrow();
  });
});

describe("consoleLogger", () => {
  it("writes info logs to console", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});

    consoleLogger.info("message", { ok: true });

    expect(spy).toHaveBeenCalledWith("message", { ok: true });
    spy.mockRestore();
  });
});

describe("logTraceSummary", () => {
  it("logs a stable request trace summary", () => {
    const logger = {
      info: vi.fn(),
    };
    const trace = createRequestTrace("/api/health");
    trace.addEvent({
      module: "app.bus",
      messageType: "RunHealthCheck",
    });

    logTraceSummary(logger, trace);

    expect(logger.info).toHaveBeenCalledWith("request trace", {
      traceId: trace.id,
      route: "/api/health",
      events: 1,
    });
  });
});
