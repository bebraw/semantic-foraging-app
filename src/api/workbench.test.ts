import { beforeEach, describe, expect, it, vi } from "vitest";
import { exampleRoutes } from "../app-routes";
import { createAppContext } from "../app/context";
import { createRequestTrace } from "../infra/observability/trace";
import type { WorkflowRepository } from "../infra/storage/repository";
import {
  handleArtifactRefineActionRequest,
  handleArtifactRestoreActionRequest,
  handleArtifactSaveActionRequest,
  handleArtifactUseActionRequest,
  handleExplanationActionRequest,
  handleIntentActionRequest,
  handleIntentClarificationActionRequest,
} from "./workbench";

describe("workbench actions", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

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
    expect(body).toContain("Recent sessions");
    expect(body).toContain("Create a new field note");
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

  it("uses persisted recent sessions when resuming a saved search trail", async () => {
    const context = createAppContext(exampleRoutes);
    const initialFormData = new FormData();
    initialFormData.set("input", "Find chanterelles near wet spruce in Helsinki");

    await handleIntentActionRequest(
      new Request("http://example.com/actions/intent", {
        method: "POST",
        body: initialFormData,
      }),
      context,
    );

    const resumeFormData = new FormData();
    resumeFormData.set("input", "Resume my chanterelle session");

    const response = await handleIntentActionRequest(
      new Request("http://example.com/actions/intent", {
        method: "POST",
        body: resumeFormData,
      }),
      context,
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Recent session");
    expect(body).toContain("Find chanterelles near wet spruce in Helsinki");
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

  it("saves a supported candidate artifact through the server-rendered workbench", async () => {
    const formData = new FormData();
    formData.set(
      "candidate",
      JSON.stringify({
        id: "field-note-scaffold",
        kind: "field-note",
        title: "Field note scaffold",
        summary: "A starter note seeded from the current request.",
        statusLabel: "Draft note",
        evidence: [
          {
            label: "Intent fit",
            detail: "The request was classified as create-field-note.",
          },
        ],
        spatialContext: {
          species: ["chanterelle"],
          habitat: ["spruce"],
          region: ["helsinki"],
          season: ["autumn"],
        },
      }),
    );
    formData.set("sourceIntent", "create-field-note");
    formData.set(
      "intentSubmission",
      JSON.stringify({
        input: "Create a new field note",
        classification: {
          intent: "create-field-note",
          confidence: 0.74,
          needsClarification: false,
          cues: {
            species: ["chanterelle"],
            habitat: ["spruce"],
            region: ["helsinki"],
            season: ["autumn"],
          },
          missing: [],
        },
        confidenceBand: "medium",
        provenance: {
          source: "deterministic-fallback",
          provider: null,
          reason: "no-model-provider",
        },
        workflow: {
          name: "intent-classification",
          state: "completed",
        },
      }),
    );

    const response = await handleArtifactSaveActionRequest(
      new Request("http://example.com/actions/artifact/save", {
        method: "POST",
        body: formData,
      }),
      createAppContext(exampleRoutes),
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Artifact saved");
    expect(body).toContain("Saved artifacts");
    expect(body).toContain("Field note scaffold");
  });

  it("loads a saved artifact back into the workbench as continued intent context", async () => {
    const context = createAppContext(exampleRoutes);
    const saveFormData = new FormData();
    saveFormData.set(
      "candidate",
      JSON.stringify({
        id: "trail-north-ridge-wet-spruce-loop",
        kind: "trail",
        title: "Saved chanterelle trail",
        summary: "A saved trail connecting damp spruce pockets and recent chanterelle signals.",
        statusLabel: "Trail fragment",
        evidence: [
          {
            label: "Intent fit",
            detail: "Ranked for explain-suggestion.",
          },
        ],
        spatialContext: {
          species: ["chanterelle"],
          habitat: ["spruce", "wet"],
          region: ["helsinki"],
          season: ["autumn"],
        },
      }),
    );
    saveFormData.set("sourceIntent", "explain-suggestion");
    saveFormData.set(
      "intentSubmission",
      JSON.stringify({
        input: "Explain this trail",
        classification: {
          intent: "explain-suggestion",
          confidence: 0.82,
          needsClarification: false,
          cues: {
            species: ["chanterelle"],
            habitat: ["spruce", "wet"],
            region: ["helsinki"],
            season: ["autumn"],
          },
          missing: [],
        },
        confidenceBand: "high",
        provenance: {
          source: "deterministic-fallback",
          provider: null,
          reason: "no-model-provider",
        },
        workflow: {
          name: "intent-classification",
          state: "completed",
        },
      }),
    );

    await handleArtifactSaveActionRequest(
      new Request("http://example.com/actions/artifact/save", {
        method: "POST",
        body: saveFormData,
      }),
      context,
    );

    const artifacts = await context.savedArtifactRepository.listArtifacts(1);
    const useFormData = new FormData();
    useFormData.set("artifactId", artifacts[0].artifactId);

    const response = await handleArtifactUseActionRequest(
      new Request("http://example.com/actions/artifact/use", {
        method: "POST",
        body: useFormData,
      }),
      context,
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Artifact loaded");
    expect(body).toContain("Latest intent result");
    expect(body).toContain("explain-suggestion");
    expect(body).toContain("deterministic-fallback / artifact-reuse");
    expect(body).toContain('value="Saved chanterelle trail"');
    expect(body).toContain("Summary: A saved trail connecting damp spruce pockets and recent chanterelle signals.");
    expect(body).toContain("Candidate leads");
  });

  it("loads a saved artifact revision into the workbench without mutating the stored artifact", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T12:00:00.000Z"));

    const context = createAppContext(exampleRoutes);
    const saveFormData = new FormData();
    saveFormData.set(
      "candidate",
      JSON.stringify({
        id: "trail-north-ridge-wet-spruce-loop",
        kind: "trail",
        title: "Saved chanterelle trail",
        summary: "A saved trail connecting damp spruce pockets and recent chanterelle signals.",
        statusLabel: "Trail fragment",
        evidence: [
          {
            label: "Intent fit",
            detail: "Ranked for explain-suggestion.",
          },
        ],
        spatialContext: {
          species: ["chanterelle"],
          habitat: ["spruce", "wet"],
          region: ["helsinki"],
          season: ["autumn"],
        },
      }),
    );
    saveFormData.set("sourceIntent", "explain-suggestion");
    saveFormData.set(
      "intentSubmission",
      JSON.stringify({
        input: "Explain this trail",
        classification: {
          intent: "explain-suggestion",
          confidence: 0.82,
          needsClarification: false,
          cues: {
            species: ["chanterelle"],
            habitat: ["spruce", "wet"],
            region: ["helsinki"],
            season: ["autumn"],
          },
          missing: [],
        },
        confidenceBand: "high",
        provenance: {
          source: "deterministic-fallback",
          provider: null,
          reason: "no-model-provider",
        },
        workflow: {
          name: "intent-classification",
          state: "completed",
        },
      }),
    );

    await handleArtifactSaveActionRequest(
      new Request("http://example.com/actions/artifact/save", {
        method: "POST",
        body: saveFormData,
      }),
      context,
    );

    const artifacts = await context.savedArtifactRepository.listArtifacts(1);
    const refineFormData = new FormData();
    refineFormData.set("artifactId", artifacts[0].artifactId);
    refineFormData.set("title", "Refined chanterelle trail");
    refineFormData.set("summary", "Refined summary for the saved chanterelle route.");
    refineFormData.set("notes", "Start near the wetter spruce edge and keep the old moss hollow in view.");

    vi.setSystemTime(new Date("2026-04-19T13:15:00.000Z"));

    await handleArtifactRefineActionRequest(
      new Request("http://example.com/actions/artifact/refine", {
        method: "POST",
        body: refineFormData,
      }),
      context,
    );

    const useFormData = new FormData();
    useFormData.set("artifactId", artifacts[0].artifactId);
    useFormData.set("recordedAt", "2026-04-19T12:00:00.000Z");

    const response = await handleArtifactUseActionRequest(
      new Request("http://example.com/actions/artifact/use", {
        method: "POST",
        body: useFormData,
      }),
      context,
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Artifact loaded");
    expect(body).toContain("Loaded Saved chanterelle trail from revision history into the workbench forms.");
    expect(body).toContain('value="Saved chanterelle trail"');
    expect(body).toContain("Summary: A saved trail connecting damp spruce pockets and recent chanterelle signals.");

    const storedArtifact = await context.savedArtifactRepository.getArtifact(artifacts[0].artifactId);
    expect(storedArtifact).toEqual(
      expect.objectContaining({
        title: "Refined chanterelle trail",
        summary: "Refined summary for the saved chanterelle route.",
        notes: "Start near the wetter spruce edge and keep the old moss hollow in view.",
      }),
    );
  });

  it("refines a saved artifact through the server-rendered workbench", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T12:00:00.000Z"));

    const context = createAppContext(exampleRoutes);
    const saveFormData = new FormData();
    saveFormData.set(
      "candidate",
      JSON.stringify({
        id: "trail-north-ridge-wet-spruce-loop",
        kind: "trail",
        title: "Saved chanterelle trail",
        summary: "A saved trail connecting damp spruce pockets and recent chanterelle signals.",
        statusLabel: "Trail fragment",
        evidence: [
          {
            label: "Intent fit",
            detail: "Ranked for explain-suggestion.",
          },
        ],
        spatialContext: {
          species: ["chanterelle"],
          habitat: ["spruce", "wet"],
          region: ["helsinki"],
          season: ["autumn"],
        },
      }),
    );
    saveFormData.set("sourceIntent", "explain-suggestion");
    saveFormData.set(
      "intentSubmission",
      JSON.stringify({
        input: "Explain this trail",
        classification: {
          intent: "explain-suggestion",
          confidence: 0.82,
          needsClarification: false,
          cues: {
            species: ["chanterelle"],
            habitat: ["spruce", "wet"],
            region: ["helsinki"],
            season: ["autumn"],
          },
          missing: [],
        },
        confidenceBand: "high",
        provenance: {
          source: "deterministic-fallback",
          provider: null,
          reason: "no-model-provider",
        },
        workflow: {
          name: "intent-classification",
          state: "completed",
        },
      }),
    );

    await handleArtifactSaveActionRequest(
      new Request("http://example.com/actions/artifact/save", {
        method: "POST",
        body: saveFormData,
      }),
      context,
    );

    const artifacts = await context.savedArtifactRepository.listArtifacts(1);
    const refineFormData = new FormData();
    refineFormData.set("artifactId", artifacts[0].artifactId);
    refineFormData.set("title", "Refined chanterelle trail");
    refineFormData.set("summary", "Refined summary for the saved chanterelle route.");
    refineFormData.set("notes", "Start near the wetter spruce edge and keep the old moss hollow in view.");

    vi.setSystemTime(new Date("2026-04-19T13:15:00.000Z"));

    const response = await handleArtifactRefineActionRequest(
      new Request("http://example.com/actions/artifact/refine", {
        method: "POST",
        body: refineFormData,
      }),
      context,
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Artifact updated");
    expect(body).toContain("Refined chanterelle trail");
    expect(body).toContain("Refined summary for the saved chanterelle route.");
    expect(body).toContain("Start near the wetter spruce edge and keep the old moss hollow in view.");

    const refinedArtifact = await context.savedArtifactRepository.getArtifact(artifacts[0].artifactId);
    expect(refinedArtifact).toEqual(
      expect.objectContaining({
        title: "Refined chanterelle trail",
        summary: "Refined summary for the saved chanterelle route.",
        notes: "Start near the wetter spruce edge and keep the old moss hollow in view.",
        updatedAt: "2026-04-19T13:15:00.000Z",
        revisions: [
          expect.objectContaining({
            kind: "saved",
            title: "Saved chanterelle trail",
          }),
          expect.objectContaining({
            kind: "refined",
            title: "Refined chanterelle trail",
            summary: "Refined summary for the saved chanterelle route.",
            notes: "Start near the wetter spruce edge and keep the old moss hollow in view.",
            recordedAt: "2026-04-19T13:15:00.000Z",
          }),
        ],
      }),
    );
    expect(body).toContain("Updated 2026-04-19 13:15");
    expect(body).toContain("Revision history");
    expect(body).toContain("refined / Recorded 2026-04-19 13:15");
  });

  it("restores a saved artifact revision through the server-rendered workbench", async () => {
    const context = createAppContext(exampleRoutes);
    vi.setSystemTime(new Date("2026-04-19T12:00:00.000Z"));
    const saveFormData = new FormData();
    saveFormData.set(
      "candidate",
      JSON.stringify({
        id: "trail-north-ridge-wet-spruce-loop",
        kind: "trail",
        title: "Saved chanterelle trail",
        summary: "A saved trail connecting damp spruce pockets and recent chanterelle signals.",
        statusLabel: "Trail fragment",
        evidence: [
          {
            label: "Intent fit",
            detail: "Ranked for explain-suggestion.",
          },
        ],
        spatialContext: {
          species: ["chanterelle"],
          habitat: ["spruce", "wet"],
          region: ["helsinki"],
          season: ["autumn"],
        },
      }),
    );
    saveFormData.set("sourceIntent", "explain-suggestion");
    saveFormData.set(
      "intentSubmission",
      JSON.stringify({
        input: "Explain this chanterelle trail",
        classification: {
          intent: "explain-suggestion",
          confidence: 0.92,
          needsClarification: false,
          cues: {
            species: ["chanterelle"],
            habitat: ["spruce", "wet"],
            region: ["helsinki"],
            season: ["autumn"],
          },
          missing: [],
        },
        confidenceBand: "high",
        provenance: {
          source: "deterministic-fallback",
          provider: null,
          reason: "no-model-provider",
        },
        workflow: {
          name: "intent-classification",
          state: "completed",
        },
      }),
    );

    await handleArtifactSaveActionRequest(
      new Request("http://example.com/actions/artifact/save", {
        method: "POST",
        body: saveFormData,
      }),
      context,
    );

    const artifacts = await context.savedArtifactRepository.listArtifacts(1);
    const refineFormData = new FormData();
    refineFormData.set("artifactId", artifacts[0].artifactId);
    refineFormData.set("title", "Refined chanterelle trail");
    refineFormData.set("summary", "Refined summary for the saved chanterelle route.");
    refineFormData.set("notes", "Start near the wetter spruce edge and keep the old moss hollow in view.");

    vi.setSystemTime(new Date("2026-04-19T13:15:00.000Z"));

    await handleArtifactRefineActionRequest(
      new Request("http://example.com/actions/artifact/refine", {
        method: "POST",
        body: refineFormData,
      }),
      context,
    );

    const restoreFormData = new FormData();
    restoreFormData.set("artifactId", artifacts[0].artifactId);
    restoreFormData.set("recordedAt", "2026-04-19T12:00:00.000Z");

    vi.setSystemTime(new Date("2026-04-19T13:30:00.000Z"));

    const response = await handleArtifactRestoreActionRequest(
      new Request("http://example.com/actions/artifact/restore", {
        method: "POST",
        body: restoreFormData,
      }),
      context,
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Artifact restored");
    expect(body).toContain("Saved chanterelle trail");
    expect(body).toContain("A saved trail connecting damp spruce pockets and recent chanterelle signals.");
    expect(body).toContain("restored / Recorded 2026-04-19 13:30");

    const restoredArtifact = await context.savedArtifactRepository.getArtifact(artifacts[0].artifactId);
    expect(restoredArtifact).toEqual(
      expect.objectContaining({
        title: "Saved chanterelle trail",
        summary: "A saved trail connecting damp spruce pockets and recent chanterelle signals.",
        notes: "",
        updatedAt: "2026-04-19T13:30:00.000Z",
        revisions: expect.arrayContaining([
          expect.objectContaining({
            kind: "restored",
            title: "Saved chanterelle trail",
            summary: "A saved trail connecting damp spruce pockets and recent chanterelle signals.",
            notes: "",
            recordedAt: "2026-04-19T13:30:00.000Z",
          }),
        ]),
      }),
    );
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
