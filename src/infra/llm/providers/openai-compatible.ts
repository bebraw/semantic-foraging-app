import type { JsonCompletionRequest, ModelCapability, ModelProvider, TextCompletionRequest } from "../provider";

type FetchLike = typeof fetch;

export type OpenAiCompatibleConfig = {
  baseUrl: string;
  model: string;
  apiKey?: string;
};

type OpenAiCompatibleResponse = {
  response?: string;
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
};

export class OpenAiCompatibleProvider implements ModelProvider {
  readonly name = "local-openai-compatible";

  constructor(
    private readonly fetchImpl: FetchLike,
    private readonly config: OpenAiCompatibleConfig,
  ) {}

  async isAvailable(): Promise<boolean> {
    if (!this.hasRequiredConfig()) {
      return false;
    }

    try {
      const response = await this.fetchImpl(this.endpoint("models"), {
        method: "GET",
        headers: this.headers(),
      });

      return response.ok;
    } catch {
      return false;
    }
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
    const response = await this.fetchImpl(this.endpoint("chat/completions"), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: this.config.model,
        messages: [...(input.system ? [{ role: "system", content: input.system }] : []), { role: "user", content: input.prompt }],
        temperature: input.temperature ?? 0.2,
        max_tokens: input.maxOutputTokens ?? 400,
      }),
    });

    const json = await parseJsonResponse(response);
    return extractCompletionText(json);
  }

  async completeJson<T>(input: JsonCompletionRequest): Promise<T> {
    const response = await this.fetchImpl(this.endpoint("chat/completions"), {
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

    const json = await parseJsonResponse(response);
    return JSON.parse(extractCompletionText(json)) as T;
  }

  private endpoint(pathname: string): string {
    return new URL(pathname, ensureTrailingSlash(this.config.baseUrl)).toString();
  }

  private headers(): HeadersInit {
    return {
      "content-type": "application/json",
      ...(this.config.apiKey ? { authorization: `Bearer ${this.config.apiKey}` } : {}),
    };
  }

  private hasRequiredConfig(): boolean {
    return Boolean(this.config.baseUrl && this.config.model);
  }
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  if (!response.ok) {
    throw new Error(`OpenAI-compatible provider returned HTTP ${response.status}`);
  }

  return await response.json();
}

function ensureTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

function extractCompletionText(json: unknown): string {
  const payload = json as OpenAiCompatibleResponse;
  const messageContent = payload?.choices?.[0]?.message?.content;

  if (typeof payload?.response === "string") {
    return payload.response;
  }

  if (typeof messageContent === "string") {
    return messageContent;
  }

  if (Array.isArray(messageContent)) {
    const text = messageContent
      .map((part) => (part.type === "text" && typeof part.text === "string" ? part.text : ""))
      .join("")
      .trim();

    if (text) {
      return text;
    }
  }

  throw new Error("Unsupported OpenAI-compatible response shape");
}
