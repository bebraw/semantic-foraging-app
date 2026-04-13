import type { AppRoute } from "../app-routes";

export type AppContext = {
  appName: string;
  routes: AppRoute[];
};

export function createAppContext(routes: AppRoute[]): AppContext {
  return {
    appName: "vibe-template-worker",
    routes,
  };
}
