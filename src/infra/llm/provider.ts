export type ModelCapability = {
  available: boolean;
  supportsStructuredOutput: boolean;
  supportsStreaming: boolean;
  maxContextClass: "small" | "medium" | "large" | "unknown";
};

export type TextCompletionRequest = {
  system?: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
};

export type JsonCompletionRequest<TSchemaName extends string = string> = {
  system?: string;
  prompt: string;
  schemaName: TSchemaName;
  schema: unknown;
  temperature?: number;
  maxOutputTokens?: number;
};

export interface ModelProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  getCapabilities(): Promise<ModelCapability>;
  completeText(input: TextCompletionRequest): Promise<string>;
  completeJson<T>(input: JsonCompletionRequest): Promise<T>;
}
