import { describe, expect, it, vi } from "vitest";
import { OpenAiCompatibleProvider } from "./openai-compatible";

describe("OpenAiCompatibleProvider", () => {
  it("checks availability through the models endpoint", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn(),
    });
    const provider = new OpenAiCompatibleProvider(fetchImpl, {
      baseUrl: "http://127.0.0.1:11434/v1",
      model: "gpt-oss:20b",
    });

    await expect(provider.isAvailable()).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith("http://127.0.0.1:11434/v1/models", {
      method: "GET",
      headers: {
        "content-type": "application/json",
      },
    });
  });

  it("posts text completions to the OpenAI-compatible chat endpoint", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: "Local explanation" } }],
      }),
    });
    const provider = new OpenAiCompatibleProvider(fetchImpl, {
      baseUrl: "http://127.0.0.1:1234/v1/",
      model: "qwen2.5-7b-instruct",
      apiKey: "lm-studio",
    });

    await expect(
      provider.completeText({
        system: "Be concise",
        prompt: "Explain the result",
      }),
    ).resolves.toBe("Local explanation");
    expect(fetchImpl).toHaveBeenCalledWith("http://127.0.0.1:1234/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer lm-studio",
      },
      body: JSON.stringify({
        model: "qwen2.5-7b-instruct",
        messages: [
          { role: "system", content: "Be concise" },
          { role: "user", content: "Explain the result" },
        ],
        temperature: 0.2,
        max_tokens: 400,
      }),
    });
  });

  it("parses structured output from OpenAI-compatible providers", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: '{"intent":"search","confidence":0.88}' } }],
      }),
    });
    const provider = new OpenAiCompatibleProvider(fetchImpl, {
      baseUrl: "http://127.0.0.1:11434/v1",
      model: "gpt-oss:20b",
    });

    await expect(
      provider.completeJson<{ intent: string; confidence: number }>({
        schemaName: "intent",
        schema: { type: "object" },
        prompt: "Classify this input",
      }),
    ).resolves.toEqual({
      intent: "search",
      confidence: 0.88,
    });
  });

  it("supports text content arrays in OpenAI-style responses", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: [{ type: "text", text: "Array-based explanation" }],
            },
          },
        ],
      }),
    });
    const provider = new OpenAiCompatibleProvider(fetchImpl, {
      baseUrl: "http://127.0.0.1:1234/v1",
      model: "model-identifier",
    });

    await expect(
      provider.completeText({
        prompt: "Explain the result",
      }),
    ).resolves.toBe("Array-based explanation");
  });

  it("rejects unsupported response shapes", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ choices: [{ message: { content: 42 } }] }),
    });
    const provider = new OpenAiCompatibleProvider(fetchImpl, {
      baseUrl: "http://127.0.0.1:11434/v1",
      model: "gpt-oss:20b",
    });

    await expect(
      provider.completeText({
        prompt: "Explain the result",
      }),
    ).rejects.toThrow("Unsupported OpenAI-compatible response shape");
  });

  it("reports unavailable when required config is missing", async () => {
    const provider = new OpenAiCompatibleProvider(vi.fn(), {
      baseUrl: "",
      model: "",
    });

    await expect(provider.isAvailable()).resolves.toBe(false);
    await expect(provider.getCapabilities()).resolves.toEqual({
      available: false,
      supportsStructuredOutput: true,
      supportsStreaming: false,
      maxContextClass: "medium",
    });
  });
});
