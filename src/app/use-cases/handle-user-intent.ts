import { classifyIntent } from "../../domain/agents/intent-agent";
import type { IntentResult } from "../../domain/contracts/result";
import type { AppContext } from "../context";
import type { SubmitUserIntentMessage } from "../message";

export async function handleUserIntent(context: AppContext, message: SubmitUserIntentMessage): Promise<IntentResult> {
  const classification = await classifyIntent(context.modelProvider, message.rawInput);

  return {
    kind: "intent",
    payload: {
      input: message.rawInput,
      classification,
    },
  };
}
