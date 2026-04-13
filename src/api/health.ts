export type HealthPayload = {
  ok: true;
  name: string;
  routes: string[];
};

export function createHealthPayload(name: string, routes: string[]): HealthPayload {
  return {
    ok: true,
    name,
    routes,
  };
}

export function createHealthResponse(routes: string[]): Response {
  return Response.json(createHealthPayload("vibe-template-worker", routes));
}
