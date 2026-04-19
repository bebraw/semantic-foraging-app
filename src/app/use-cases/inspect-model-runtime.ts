import type { ModelRuntimeResult } from "../../domain/contracts/result";
import { getRuntimeModelCapability } from "../../infra/llm/runtime-capability";
import type { AppContext } from "../context";
import type { InspectModelRuntimeMessage } from "../message";

export async function inspectModelRuntime(context: AppContext, message: InspectModelRuntimeMessage): Promise<ModelRuntimeResult> {
  const runtime = await getRuntimeModelCapability(context.modelProvider);

  context.trace.addEvent({
    module: "app.use-cases.inspect-model-runtime",
    messageType: message.type,
    notes: [`mode:${runtime.mode}`, `provider:${runtime.provider ?? "none"}`, `available:${String(runtime.available)}`],
  });

  return {
    kind: "model-runtime",
    payload: runtime,
  };
}
