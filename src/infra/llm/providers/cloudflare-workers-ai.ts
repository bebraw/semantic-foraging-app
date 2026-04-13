import type {
  JsonCompletionRequest,
  ModelCapability,
  ModelProvider,
  TextCompletionRequest,
} from "../provider";

type WorkersAiBinding = {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
};

export type WorkersAiEnv = {
  AI?: WorkersAiBinding;
};

export class CloudflareWorkersAiProvider implements ModelProvider {
  readonly name = "cloudflare-workers-ai";

  constructor(
    private readonly env: WorkersAiEnv,
    private readonly model: string,
  ) {}

  async isAvailable(): Promise<boolean> {
    return Boolean(this.env.AI);
  }

  async getCapabilities(): Promise<ModelCapability> {
    return {
      available: Boolean(this.env.AI),
      supportsStructuredOutput: true,
      supportsStreaming: false,
      maxContextClass: "medium",
    };
  }

  async completeText(input: TextCompletionRequest): Promise<string> {
    if (!this.env.AI) {
      throw new Error("Workers AI binding is not configured");
    }

    const messages = [
      ...(input.system ? [{ role: "system", content: input.system }] : []),
      { role: "user", content: input.prompt },
    ];

    const result = await this.env.AI.run(this.model, {
      messages,
      temperature: input.temperature ?? 0.2,
      max_tokens: input.maxOutputTokens ?? 400,
    });

    return extractText(result);
  }

  async completeJson<T>(input: JsonCompletionRequest): Promise<T> {
    if (!this.env.AI) {
      throw new Error("Workers AI binding is not configured");
    }

    const messages = [
      ...(input.system ? [{ role: "system", content: input.system }] : []),
      {
        role: "user",
        content: [
          input.prompt,
          "",
          "Return only valid JSON that matches the provided schema.",
        ].join("\n"),
      },
    ];

    const result = await this.env.AI.run(this.model, {
      messages,
      temperature: input.temperature ?? 0,
      max_tokens: input.maxOutputTokens ?? 400,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: input.schemaName,
          schema: input.schema,
        },
      },
    });

    const text = extractText(result);
    return JSON.parse(text) as T;
  }
}

function extractText(result: unknown): string {
  if (typeof result === "string") {
    return result;
  }

  if (
    result &&
    typeof result === "object" &&
    "response" in result &&
    typeof (result as { response?: unknown }).response === "string"
  ) {
    return (result as { response: string }).response;
  }

  throw new Error("Unsupported Workers AI response shape");
}