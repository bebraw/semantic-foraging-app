export type RenderHomeScreenMessage = {
  type: "RenderHomeScreen";
};

export type RunHealthCheckMessage = {
  type: "RunHealthCheck";
};

export type AppMessage = RenderHomeScreenMessage | RunHealthCheckMessage;
