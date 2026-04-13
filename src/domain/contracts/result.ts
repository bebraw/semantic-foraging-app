import type { HealthPayload } from "../../api/health";
import type { ClassifiedIntent } from "../agents/intent-agent";
import type { ScreenModel } from "./screen";

export type ScreenResult = {
  kind: "screen";
  screen: ScreenModel;
};

export type HealthCheckResult = {
  kind: "health";
  payload: HealthPayload;
};

export type IntentResult = {
  kind: "intent";
  payload: {
    input: string;
    classification: ClassifiedIntent;
  };
};

export type AppResult = ScreenResult | HealthCheckResult | IntentResult;
