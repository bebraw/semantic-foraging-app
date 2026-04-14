import { describe, expect, it } from "vitest";
import { createAppErrorResult } from "../domain/contracts/result";
import { createErrorResponse } from "./error-response";

describe("createErrorResponse", () => {
  it("serializes typed app errors into the stable API payload", async () => {
    const response = createErrorResponse(createAppErrorResult("validation_error", 'Request body must be JSON with screen: "home".', 400));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      category: "validation_error",
      error: 'Request body must be JSON with screen: "home".',
    });
  });
});
