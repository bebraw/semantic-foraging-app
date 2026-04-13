export type AppRoute = {
  path: string;
  purpose: string;
};

export const exampleRoutes: AppRoute[] = [
  { path: "/", purpose: "HTML stub app for developers" },
  { path: "/api/health", purpose: "JSON health endpoint for tooling and smoke tests" },
  { path: "/api/app/query", purpose: "JSON query endpoint for typed screen models" },
  { path: "/api/intent", purpose: "JSON command endpoint for intent classification" },
  { path: "/api/intent/clarify", purpose: "JSON command endpoint for intent clarification follow-up" },
  { path: "/api/explanation", purpose: "JSON query endpoint for grounded explanation text" },
];
