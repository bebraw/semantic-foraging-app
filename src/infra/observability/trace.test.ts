import { afterEach, describe, expect, it, vi } from "vitest";
import type { ModelProvider } from "../llm/provider";
import { attachTraceHeaders, createRequestTrace, observeModelProvider, traceOperation } from "./trace";

function createProvider(overrides: Partial<ModelProvider> = {}): ModelProvider {
  return {
    name: "test-provider",
    isAvailable: vi.fn().mockResolvedValue(true),
    getCapabilities: vi.fn().mockResolvedValue({
      available: true,
      supportsStructuredOutput: true,
      supportsStreaming: false,
      maxContextClass: "medium",
    }),
    completeText: vi.fn().mockResolvedValue("done"),
    completeJson: vi.fn().mockResolvedValue({ ok: true }),
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("traceOperation", () => {
  it("records timing and module metadata for traced work", async () => {
    const trace = createRequestTrace("/api/health");

    await expect(
      traceOperation(trace, "app.bus", "RunHealthCheck", async () => {
        return "ok";
      }),
    ).resolves.toBe("ok");

    expect(trace.events).toEqual([
      expect.objectContaining({
        module: "app.bus",
        messageType: "RunHealthCheck",
        durationMs: expect.any(Number),
      }),
    ]);
  });

  it("records error details for failed traced work", async () => {
    const trace = createRequestTrace("/api/intent");

    await expect(
      traceOperation(trace, "app.bus", "SubmitUserIntent", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(trace.events).toEqual([
      expect.objectContaining({
        module: "app.bus",
        messageType: "SubmitUserIntent",
        notes: ["error:boom"],
      }),
    ]);
  });

  it("records unknown errors without assuming Error instances", async () => {
    const trace = createRequestTrace("/api/intent");

    await expect(
      traceOperation(trace, "app.bus", "SubmitUserIntent", async () => {
        throw "boom";
      }),
    ).rejects.toBe("boom");

    expect(trace.events[0]?.notes).toEqual(["error:unknown"]);
  });
});

describe("attachTraceHeaders", () => {
  it("adds stable trace headers to responses", async () => {
    const trace = createRequestTrace("/api/health");
    trace.addEvent({
      module: "app.bus",
      messageType: "RunHealthCheck",
    });

    const response = attachTraceHeaders(new Response("ok"), trace);

    expect(response.headers.get("x-trace-id")).toBe(trace.id);
    expect(response.headers.get("x-trace-events")).toBe("1");
    await expect(response.text()).resolves.toBe("ok");
  });
});

describe("observeModelProvider", () => {
  it("returns null when no provider is configured", () => {
    const trace = createRequestTrace("/api/explanation");

    expect(observeModelProvider(trace, null)).toBeNull();
  });

  it("records model calls through the traced wrapper", async () => {
    const trace = createRequestTrace("/api/explanation");
    const provider = observeModelProvider(trace, createProvider());

    await expect(provider?.completeText({ prompt: "hello" })).resolves.toBe("done");

    expect(trace.events).toEqual([
      expect.objectContaining({
        module: "infra.llm",
        messageType: "completeText",
        notes: ["provider:test-provider"],
      }),
    ]);
  });

  it("records model capability and structured output calls", async () => {
    const trace = createRequestTrace("/api/explanation");
    const provider = observeModelProvider(trace, createProvider());

    await expect(provider?.isAvailable()).resolves.toBe(true);
    await expect(provider?.getCapabilities()).resolves.toEqual({
      available: true,
      supportsStructuredOutput: true,
      supportsStreaming: false,
      maxContextClass: "medium",
    });
    await expect(
      provider?.completeJson({
        prompt: "hello",
        schemaName: "result",
        schema: { type: "object" },
      }),
    ).resolves.toEqual({ ok: true });

    expect(trace.events).toEqual([
      expect.objectContaining({
        module: "infra.llm",
        messageType: "isAvailable",
      }),
      expect.objectContaining({
        module: "infra.llm",
        messageType: "getCapabilities",
      }),
      expect.objectContaining({
        module: "infra.llm",
        messageType: "completeJson",
        notes: ["provider:test-provider", "schema:result"],
      }),
    ]);
  });
});

describe("createRequestTrace", () => {
  it("falls back to a generated trace prefix when crypto UUID support is unavailable", () => {
    vi.stubGlobal("crypto", {});

    const trace = createRequestTrace("/api/health");

    expect(trace.id).toMatch(/^trace-/);
    expect(trace.route).toBe("/api/health");
  });
});
