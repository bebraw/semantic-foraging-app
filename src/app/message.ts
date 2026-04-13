export type RenderHomeScreenMessage = {
  type: "RenderHomeScreen";
};

export type RunHealthCheckMessage = {
  type: "RunHealthCheck";
};

export type SubmitUserIntentMessage = {
  type: "SubmitUserIntent";
  rawInput: string;
};

export type RequestExplanationMessage = {
  type: "RequestExplanation";
  title: string;
  facts: string[];
};

export type AppMessage = RenderHomeScreenMessage | RunHealthCheckMessage | SubmitUserIntentMessage | RequestExplanationMessage;
