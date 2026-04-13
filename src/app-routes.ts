export type AppRoute = {
  path: string;
  purpose: string;
};

export const exampleRoutes: AppRoute[] = [
  { path: "/", purpose: "HTML stub app for developers" },
  { path: "/api/health", purpose: "JSON health endpoint for tooling and smoke tests" },
];
