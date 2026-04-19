export type ModelRuntimeMode = "no-model" | "local-model" | "hosted-model";

export type RuntimeModelCapability = {
  mode: ModelRuntimeMode;
  provider: string | null;
  available: boolean;
  supportsStructuredOutput: boolean;
  supportsStreaming: boolean;
  maxContextClass: "small" | "medium" | "large" | "unknown";
};
