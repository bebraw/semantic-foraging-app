import type { AppContext } from "../context";
import type { RenderHomeScreenMessage } from "../message";
import type { ScreenResult } from "../../domain/contracts/result";
import { getRuntimeModelCapability } from "../../infra/llm/runtime-capability";

export async function renderScreen(context: AppContext, message: RenderHomeScreenMessage): Promise<ScreenResult> {
  switch (message.type) {
    case "RenderHomeScreen":
      const runtime = await getRuntimeModelCapability(context.modelProvider);

      context.trace.addEvent({
        module: "app.use-cases.render-screen",
        messageType: message.type,
        notes: ["screen:home", `runtime-mode:${runtime.mode}`, `runtime-provider:${runtime.provider ?? "none"}`],
      });

      return {
        kind: "screen",
        screen: {
          kind: "home",
          eyebrow: "Starter Surface",
          title: "vibe-template Worker",
          description: "A minimal Cloudflare Worker baseline for experiments, tests, and local CI.",
          overviewTitle: "What this gives you",
          overviewBody:
            "A concrete Worker entry point, a simple HTML page, a health endpoint, and testable flows that keep the template green from the start.",
          runtimeTitle: "Model runtime",
          runtimeModeLabel: formatRuntimeModeLabel(runtime.mode),
          runtimeSummary: describeRuntime(runtime),
          runtime,
          routesTitle: "Available routes",
          nextStepsTitle: "Next steps",
          nextStepsBody:
            "Replace this stub with your real feature work, update the relevant spec, and keep the quality gate passing as the app evolves.",
          healthPath: "/api/health",
          routes: context.routes,
          meta: {
            traceId: context.trace.id,
          },
        },
      };
  }
}

function formatRuntimeModeLabel(mode: "no-model" | "local-model" | "hosted-model"): string {
  switch (mode) {
    case "no-model":
      return "No-model mode";
    case "local-model":
      return "Local-model mode";
    case "hosted-model":
      return "Hosted-model mode";
  }
}

function describeRuntime(runtime: Awaited<ReturnType<typeof getRuntimeModelCapability>>): string {
  if (runtime.mode === "no-model") {
    return "No model provider is configured. The app stays deterministic and keeps the shell, query, and workflow paths available.";
  }

  if (!runtime.available) {
    return `The configured provider ${runtime.provider ?? "unknown"} is unavailable, so the app will fall back to deterministic behavior until it recovers.`;
  }

  if (runtime.mode === "local-model") {
    return `A local OpenAI-compatible provider is available through ${runtime.provider}. Structured output support can be used without requiring an external API key.`;
  }

  return `A hosted model provider is available through ${runtime.provider}. The app can use managed inference while keeping deterministic fallback behavior in place.`;
}
