import { describe, expect, it } from "vitest";
import { exampleRoutes } from "../app-routes";
import { createAppContext } from "../app/context";
import { createRequestTrace } from "../infra/observability/trace";
import type { WorkflowRepository } from "../infra/storage/repository";
import { handleExplanationActionRequest, handleIntentActionRequest, handleIntentClarificationActionRequest } from "./workbench";

describe("workbench actions", () => {
  it("renders an intent result back into the workbench page", async () => {
    const formData = new FormData();
    formData.set("input", "Create a new field note");

    const response = await handleIntentActionRequest(
      new Request("http://example.com/actions/intent", {
        method: "POST",
        body: formData,
      }),
      createAppContext(exampleRoutes),
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Foraging Workbench");
    expect(body).toContain("Latest intent result");
    expect(body).toContain("create-field-note");
    expect(body).toContain("Detected cues");
    expect(body).toContain("Field note scaffold");
  });

  it("renders a clarification prompt back into the workbench page", async () => {
    const formData = new FormData();
    formData.set("input", "Help");

    const response = await handleIntentActionRequest(
      new Request("http://example.com/actions/intent", {
        method: "POST",
        body: formData,
      }),
      createAppContext(exampleRoutes),
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Clarification needed");
    expect(body).toContain("Continue workflow");
  });

  it("continues a clarification workflow through the server-rendered workbench", async () => {
    const context = createAppContext(exampleRoutes);
    const initialFormData = new FormData();
    initialFormData.set("input", "Help");

    const initialResponse = await handleIntentActionRequest(
      new Request("http://example.com/actions/intent", {
        method: "POST",
        body: initialFormData,
      }),
      context,
    );
    const initialBody = await initialResponse.text();
    const workflowIdMatch = initialBody.match(/name="workflowId" value="([^"]+)"/);

    if (!workflowIdMatch) {
      throw new Error("Expected a workflow id in the rendered clarification form");
    }

    const clarificationFormData = new FormData();
    clarificationFormData.set("workflowId", workflowIdMatch[1]);
    clarificationFormData.set("clarification", "Search for similar observations");

    const response = await handleIntentClarificationActionRequest(
      new Request("http://example.com/actions/intent/clarify", {
        method: "POST",
        body: clarificationFormData,
      }),
      context,
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Latest intent result");
    expect(body).toContain("find-observations");
    expect(body).not.toContain("Clarification needed");
    expect(body).toContain("Autumn chanterelle cluster");
  });

  it("renders an explanation result back into the workbench page", async () => {
    const formData = new FormData();
    formData.set("title", "Suggested forage trail selected");
    formData.set("facts", "Observation cluster overlaps the current region\nRecent notes mention wet spruce habitat");

    const response = await handleExplanationActionRequest(
      new Request("http://example.com/actions/explanation", {
        method: "POST",
        body: formData,
      }),
      createAppContext(exampleRoutes),
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Latest explanation");
    expect(body).toContain("Suggested forage trail selected");
  });

  it("renders a validation alert when the intent form is empty", async () => {
    const formData = new FormData();
    formData.set("input", "   ");

    const response = await handleIntentActionRequest(
      new Request("http://example.com/actions/intent", {
        method: "POST",
        body: formData,
      }),
      createAppContext(exampleRoutes),
    );

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toContain("Intent input required");
  });

  it("renders a validation alert when clarification data is missing", async () => {
    const formData = new FormData();
    formData.set("workflowId", "");
    formData.set("clarification", "");

    const response = await handleIntentClarificationActionRequest(
      new Request("http://example.com/actions/intent/clarify", {
        method: "POST",
        body: formData,
      }),
      createAppContext(exampleRoutes),
    );

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toContain("Clarification required");
  });

  it("renders a validation alert when explanation facts are missing", async () => {
    const formData = new FormData();
    formData.set("title", "Suggested forage trail selected");
    formData.set("facts", "   ");

    const response = await handleExplanationActionRequest(
      new Request("http://example.com/actions/explanation", {
        method: "POST",
        body: formData,
      }),
      createAppContext(exampleRoutes),
    );

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toContain("Grounded explanation input required");
  });

  it("renders typed app errors back into the workbench page", async () => {
    const failingRepository: WorkflowRepository = {
      saveIntentWorkflow: async () => {
        throw new Error("storage unavailable");
      },
      getIntentWorkflow: async () => null,
      deleteIntentWorkflow: async () => undefined,
    };
    const formData = new FormData();
    formData.set("input", "Help");

    const response = await handleIntentActionRequest(
      new Request("http://example.com/actions/intent", {
        method: "POST",
        body: formData,
      }),
      createAppContext(exampleRoutes, null, createRequestTrace("unknown"), failingRepository),
    );

    expect(response.status).toBe(503);
    await expect(response.text()).resolves.toContain("Intent request failed");
  });
});
