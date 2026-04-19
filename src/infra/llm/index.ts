import type { Env } from "../../worker";
import type { ModelProvider } from "./provider";
import { CloudflareWorkersAiProvider } from "./providers/cloudflare-workers-ai";
import { CloudflareAiGatewayProvider } from "./providers/cloudflare-ai-gateway";
import { OpenAiCompatibleProvider } from "./providers/openai-compatible";

export function resolveModelProvider(env: Env): ModelProvider | null {
  if (env.LOCAL_MODEL_BASE_URL && env.LOCAL_MODEL_NAME) {
    return new OpenAiCompatibleProvider(fetch, {
      baseUrl: env.LOCAL_MODEL_BASE_URL,
      model: env.LOCAL_MODEL_NAME,
      apiKey: env.LOCAL_MODEL_API_KEY,
    });
  }

  if (env.AI) {
    return new CloudflareWorkersAiProvider({ AI: env.AI }, env.WORKERS_AI_MODEL ?? "@cf/meta/llama-3.3-8b-instruct");
  }

  if (env.AI_GATEWAY_ACCOUNT_ID && env.AI_GATEWAY_ID && env.AI_GATEWAY_TOKEN && env.AI_GATEWAY_PROVIDER_PATH && env.AI_GATEWAY_MODEL) {
    return new CloudflareAiGatewayProvider(fetch, {
      accountId: env.AI_GATEWAY_ACCOUNT_ID,
      gatewayId: env.AI_GATEWAY_ID,
      apiToken: env.AI_GATEWAY_TOKEN,
      providerPath: env.AI_GATEWAY_PROVIDER_PATH,
      model: env.AI_GATEWAY_MODEL,
    });
  }

  return null;
}
