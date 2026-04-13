import type { AppRoute } from "../../app-routes";

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
  routesTitle: string;
  nextStepsTitle: string;
  nextStepsBody: string;
  healthPath: string;
  routes: AppRoute[];
  meta: ScreenMeta;
};

export type ScreenModel = HomeScreenModel;
