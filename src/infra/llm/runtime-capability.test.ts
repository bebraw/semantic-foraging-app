import { describe, expect, it, vi } from "vitest";
import type { ModelProvider } from "./provider";
import { getRuntimeModelCapability } from "./runtime-capability";

describe("getRuntimeModelCapability", () => {
  it("reports no-model mode when no provider is configured", async () => {
    await expect(getRuntimeModelCapability(null)).resolves.toEqual({
      mode: "no-model",
      provider: null,
      available: false,
      supportsStructuredOutput: false,
      supportsStreaming: false,
      maxContextClass: "unknown",
    });
  });

  it("reports an unavailable runtime when the provider is disabled", async () => {
    const provider: ModelProvider = {
      name: "test-provider",
      isAvailable: vi.fn().mockResolvedValue(false),
      getCapabilities: vi.fn(),
      completeText: vi.fn(),
      completeJson: vi.fn(),
    };

    await expect(getRuntimeModelCapability(provider)).resolves.toEqual({
      mode: "hosted-model",
      provider: "test-provider",
      available: false,
      supportsStructuredOutput: false,
      supportsStreaming: false,
      maxContextClass: "unknown",
    });
    expect(provider.getCapabilities).not.toHaveBeenCalled();
  });

  it("returns the provider capability payload when available", async () => {
    const provider: ModelProvider = {
      name: "test-provider",
      isAvailable: vi.fn().mockResolvedValue(true),
      getCapabilities: vi.fn().mockResolvedValue({
        available: true,
        supportsStructuredOutput: true,
        supportsStreaming: false,
        maxContextClass: "medium",
      }),
      completeText: vi.fn(),
      completeJson: vi.fn(),
    };

    await expect(getRuntimeModelCapability(provider)).resolves.toEqual({
      mode: "hosted-model",
      provider: "test-provider",
      available: true,
      supportsStructuredOutput: true,
      supportsStreaming: false,
      maxContextClass: "medium",
    });
  });

  it("classifies the local OpenAI-compatible provider as local-model mode", async () => {
    const provider: ModelProvider = {
      name: "local-openai-compatible",
      isAvailable: vi.fn().mockResolvedValue(true),
      getCapabilities: vi.fn().mockResolvedValue({
        available: true,
        supportsStructuredOutput: true,
        supportsStreaming: false,
        maxContextClass: "medium",
      }),
      completeText: vi.fn(),
      completeJson: vi.fn(),
    };

    await expect(getRuntimeModelCapability(provider)).resolves.toEqual({
      mode: "local-model",
      provider: "local-openai-compatible",
      available: true,
      supportsStructuredOutput: true,
      supportsStreaming: false,
      maxContextClass: "medium",
    });
  });
});
