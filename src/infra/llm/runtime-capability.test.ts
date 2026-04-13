import { describe, expect, it, vi } from "vitest";
import type { ModelProvider } from "./provider";
import { getRuntimeModelCapability } from "./runtime-capability";

describe("getRuntimeModelCapability", () => {
  it("reports an unavailable runtime when the provider is disabled", async () => {
    const provider: ModelProvider = {
      name: "test-provider",
      isAvailable: vi.fn().mockResolvedValue(false),
      getCapabilities: vi.fn(),
      completeText: vi.fn(),
      completeJson: vi.fn(),
    };

    await expect(getRuntimeModelCapability(provider)).resolves.toEqual({
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
      provider: "test-provider",
      available: true,
      supportsStructuredOutput: true,
      supportsStreaming: false,
      maxContextClass: "medium",
    });
  });
});
