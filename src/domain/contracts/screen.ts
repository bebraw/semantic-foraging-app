import type { AppRoute } from "../../app-routes";
import type { RuntimeModelCapability } from "./model-runtime";

export type ScreenMeta = {
  traceId: string;
};

export type HomeScreenModel = {
  kind: "home";
  eyebrow: string;
  title: string;
  description: string;
  overviewTitle: string;
  overviewBody: string;
  runtimeTitle: string;
  runtimeModeLabel: string;
  runtimeSummary: string;
  runtime: RuntimeModelCapability;
  routesTitle: string;
  nextStepsTitle: string;
  nextStepsBody: string;
  healthPath: string;
  routes: AppRoute[];
  meta: ScreenMeta;
};

export type ScreenModel = HomeScreenModel;
