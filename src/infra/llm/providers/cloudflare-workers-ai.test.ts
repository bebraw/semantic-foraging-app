import { describe, expect, it, vi } from "vitest";
import { CloudflareWorkersAiProvider } from "./cloudflare-workers-ai";

describe("CloudflareWorkersAiProvider", () => {
  it("completes text prompts through the Workers AI binding", async () => {
    const run = vi.fn().mockResolvedValue({ response: "Generated explanation" });
    const provider = new CloudflareWorkersAiProvider({ AI: { run } }, "@cf/meta/llama-3.3-8b-instruct");

    await expect(
      provider.completeText({
        system: "Be concise",
        prompt: "Explain the result",
        temperature: 0.4,
        maxOutputTokens: 32,
      }),
    ).resolves.toBe("Generated explanation");
    expect(run).toHaveBeenCalledWith("@cf/meta/llama-3.3-8b-instruct", {
      messages: [
        { role: "system", content: "Be concise" },
        { role: "user", content: "Explain the result" },
      ],
      temperature: 0.4,
      max_tokens: 32,
    });
  });

  it("parses structured output from the Workers AI response", async () => {
    const run = vi.fn().mockResolvedValue('{"intent":"search","confidence":0.9}');
    const provider = new CloudflareWorkersAiProvider({ AI: { run } }, "@cf/meta/llama-3.3-8b-instruct");

    await expect(
      provider.completeJson<{ intent: string; confidence: number }>({
        schemaName: "intent",
        schema: { type: "object" },
        prompt: "Classify this input",
      }),
    ).resolves.toEqual({
      intent: "search",
      confidence: 0.9,
    });
    expect(run).toHaveBeenCalledWith("@cf/meta/llama-3.3-8b-instruct", {
      messages: [
        {
          role: "user",
          content: "Classify this input\n\nReturn only valid JSON that matches the provided schema.",
        },
      ],
      temperature: 0,
      max_tokens: 400,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "intent",
          schema: { type: "object" },
        },
      },
    });
  });

  it("throws when the binding is missing", async () => {
    const provider = new CloudflareWorkersAiProvider({}, "@cf/meta/llama-3.3-8b-instruct");

    await expect(
      provider.completeText({
        prompt: "Explain the result",
      }),
    ).rejects.toThrow("Workers AI binding is not configured");
    await expect(
      provider.completeJson({
        schemaName: "intent",
        schema: { type: "object" },
        prompt: "Classify this input",
      }),
    ).rejects.toThrow("Workers AI binding is not configured");
  });

  it("rejects unsupported response shapes", async () => {
    const provider = new CloudflareWorkersAiProvider(
      {
        AI: {
          run: vi.fn().mockResolvedValue({ notResponse: true }),
        },
      },
      "@cf/meta/llama-3.3-8b-instruct",
    );

    await expect(
      provider.completeText({
        prompt: "Explain the result",
      }),
    ).rejects.toThrow("Unsupported Workers AI response shape");
  });
});
