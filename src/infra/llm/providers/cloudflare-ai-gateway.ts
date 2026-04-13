import type { JsonCompletionRequest, ModelCapability, ModelProvider, TextCompletionRequest } from "../provider";

type FetchLike = typeof fetch;

export type AiGatewayConfig = {
  accountId: string;
  gatewayId: string;
  apiToken: string;
  providerPath: string;
  model: string;
};

export class CloudflareAiGatewayProvider implements ModelProvider {
  readonly name = "cloudflare-ai-gateway";

  constructor(
    private readonly fetchImpl: FetchLike,
    private readonly config: AiGatewayConfig,
  ) {}

  async isAvailable(): Promise<boolean> {
    return Boolean(this.config.accountId && this.config.gatewayId && this.config.apiToken && this.config.providerPath && this.config.model);
  }

  async getCapabilities(): Promise<ModelCapability> {
    return {
      available: await this.isAvailable(),
      supportsStructuredOutput: true,
      supportsStreaming: false,
      maxContextClass: "medium",
    };
  }

  async completeText(input: TextCompletionRequest): Promise<string> {
    const response = await this.fetchImpl(this.endpoint(), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: this.config.model,
        messages: [...(input.system ? [{ role: "system", content: input.system }] : []), { role: "user", content: input.prompt }],
        temperature: input.temperature ?? 0.2,
        max_tokens: input.maxOutputTokens ?? 400,
      }),
    });

    const json = await response.json();
    return extractGatewayText(json);
  }

  async completeJson<T>(input: JsonCompletionRequest): Promise<T> {
    const response = await this.fetchImpl(this.endpoint(), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          ...(input.system ? [{ role: "system", content: input.system }] : []),
          {
            role: "user",
            content: [input.prompt, "", "Return only valid JSON that matches the provided schema."].join("\n"),
          },
        ],
        temperature: input.temperature ?? 0,
        max_tokens: input.maxOutputTokens ?? 400,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: input.schemaName,
            schema: input.schema,
          },
        },
      }),
    });

    const json = await response.json();
    const text = extractGatewayText(json);
    return JSON.parse(text) as T;
  }

  private endpoint(): string {
    return `https://gateway.ai.cloudflare.com/v1/${this.config.accountId}/${this.config.gatewayId}/${this.config.providerPath}`;
  }

  private headers(): HeadersInit {
    return {
      "content-type": "application/json",
      authorization: `Bearer ${this.config.apiToken}`,
    };
  }
}

function extractGatewayText(json: unknown): string {
  const obj = json as {
    result?: {
      response?: string;
      choices?: Array<{ message?: { content?: string } }>;
    };
    response?: string;
    choices?: Array<{ message?: { content?: string } }>;
  };

  return obj?.result?.response ?? obj?.response ?? obj?.result?.choices?.[0]?.message?.content ?? obj?.choices?.[0]?.message?.content ?? "";
}
