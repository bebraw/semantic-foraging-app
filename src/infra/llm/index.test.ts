import { describe, expect, it, vi } from "vitest";
import type { Env } from "../../worker";
import { resolveModelProvider } from "./index";

describe("resolveModelProvider", () => {
  it("prefers the local OpenAI-compatible provider when configured", async () => {
    const provider = resolveModelProvider({
      LOCAL_MODEL_BASE_URL: "http://127.0.0.1:11434/v1",
      LOCAL_MODEL_NAME: "gpt-oss:20b",
      LOCAL_MODEL_API_KEY: "ollama",
      AI: { run: vi.fn() },
      WORKERS_AI_MODEL: "@cf/meta/test-model",
    } as Env);

    expect(provider?.name).toBe("local-openai-compatible");
  });

  it("falls back to Workers AI when no local provider is configured", async () => {
    const run = vi.fn().mockResolvedValue("model output");
    const provider = resolveModelProvider({
      AI: { run },
      WORKERS_AI_MODEL: "@cf/meta/test-model",
      AI_GATEWAY_ACCOUNT_ID: "acct",
      AI_GATEWAY_ID: "gateway",
      AI_GATEWAY_TOKEN: "token",
      AI_GATEWAY_PROVIDER_PATH: "workers-ai/@cf/meta/test-model",
      AI_GATEWAY_MODEL: "@cf/meta/test-model",
    } as Env);

    expect(provider?.name).toBe("cloudflare-workers-ai");
    await expect(
      provider?.completeText({
        prompt: "Explain this decision",
      }),
    ).resolves.toBe("model output");
    expect(run).toHaveBeenCalledWith("@cf/meta/test-model", {
      messages: [{ role: "user", content: "Explain this decision" }],
      temperature: 0.2,
      max_tokens: 400,
    });
  });

  it("returns AI Gateway when only gateway configuration is present", async () => {
    const provider = resolveModelProvider({
      AI_GATEWAY_ACCOUNT_ID: "acct",
      AI_GATEWAY_ID: "gateway",
      AI_GATEWAY_TOKEN: "token",
      AI_GATEWAY_PROVIDER_PATH: "workers-ai/@cf/meta/test-model",
      AI_GATEWAY_MODEL: "@cf/meta/test-model",
    } as Env);

    expect(provider?.name).toBe("cloudflare-ai-gateway");
    await expect(provider?.isAvailable()).resolves.toBe(true);
  });

  it("returns null when no provider configuration is present", () => {
    expect(resolveModelProvider({} as Env)).toBeNull();
  });
});
