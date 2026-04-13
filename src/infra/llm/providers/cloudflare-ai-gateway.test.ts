import { describe, expect, it, vi } from "vitest";
import { CloudflareAiGatewayProvider } from "./cloudflare-ai-gateway";

describe("CloudflareAiGatewayProvider", () => {
  it("posts text completion requests to the gateway endpoint", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        result: {
          choices: [{ message: { content: "Gateway explanation" } }],
        },
      }),
    });
    const provider = new CloudflareAiGatewayProvider(fetchImpl, {
      accountId: "acct",
      gatewayId: "gateway",
      apiToken: "token",
      providerPath: "workers-ai/@cf/meta/llama-3.3-8b-instruct",
      model: "@cf/meta/llama-3.3-8b-instruct",
    });

    await expect(
      provider.completeText({
        system: "Be concise",
        prompt: "Explain the result",
      }),
    ).resolves.toBe("Gateway explanation");
    expect(fetchImpl).toHaveBeenCalledWith("https://gateway.ai.cloudflare.com/v1/acct/gateway/workers-ai/@cf/meta/llama-3.3-8b-instruct", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer token",
      },
      body: JSON.stringify({
        model: "@cf/meta/llama-3.3-8b-instruct",
        messages: [
          { role: "system", content: "Be concise" },
          { role: "user", content: "Explain the result" },
        ],
        temperature: 0.2,
        max_tokens: 400,
      }),
    });
  });

  it("parses structured output from AI Gateway", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        response: '{"intent":"search","confidence":0.91}',
      }),
    });
    const provider = new CloudflareAiGatewayProvider(fetchImpl, {
      accountId: "acct",
      gatewayId: "gateway",
      apiToken: "token",
      providerPath: "workers-ai/@cf/meta/llama-3.3-8b-instruct",
      model: "@cf/meta/llama-3.3-8b-instruct",
    });

    await expect(
      provider.completeJson<{ intent: string; confidence: number }>({
        schemaName: "intent",
        schema: { type: "object" },
        prompt: "Classify this input",
      }),
    ).resolves.toEqual({
      intent: "search",
      confidence: 0.91,
    });
  });

  it("reports availability from the configured credentials", async () => {
    const provider = new CloudflareAiGatewayProvider(vi.fn(), {
      accountId: "acct",
      gatewayId: "gateway",
      apiToken: "token",
      providerPath: "workers-ai/@cf/meta/llama-3.3-8b-instruct",
      model: "@cf/meta/llama-3.3-8b-instruct",
    });

    await expect(provider.isAvailable()).resolves.toBe(true);
    await expect(provider.getCapabilities()).resolves.toEqual({
      available: true,
      supportsStructuredOutput: true,
      supportsStreaming: false,
      maxContextClass: "medium",
    });
  });
});
