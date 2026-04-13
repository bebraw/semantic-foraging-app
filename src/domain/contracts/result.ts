import type { HealthPayload } from "../../api/health";
import type { ScreenModel } from "./screen";

export type ScreenResult = {
  kind: "screen";
  screen: ScreenModel;
};

export type HealthCheckResult = {
  kind: "health";
  payload: HealthPayload;
};

export type AppResult = ScreenResult | HealthCheckResult;
