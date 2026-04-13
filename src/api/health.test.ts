import { describe, expect, it } from "vitest";
import { createHealthPayload, createHealthResponse } from "./health";

describe("createHealthPayload", () => {
  it("builds the stable payload shape for health checks", () => {
    expect(createHealthPayload("vibe-template-worker", ["/", "/api/health"])).toEqual({
      ok: true,
      name: "vibe-template-worker",
      routes: ["/", "/api/health"],
    });
  });
});

describe("createHealthResponse", () => {
  it("returns the stable JSON payload for health checks", async () => {
    const response = createHealthResponse(["/", "/api/health"]);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      name: "vibe-template-worker",
      routes: ["/", "/api/health"],
    });
  });
});
