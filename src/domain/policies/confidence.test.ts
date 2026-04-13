import { describe, expect, it } from "vitest";
import { describeConfidence } from "./confidence";

describe("describeConfidence", () => {
  it("maps high confidence scores to the high band", () => {
    expect(describeConfidence(0.8)).toBe("high");
  });

  it("maps medium confidence scores to the medium band", () => {
    expect(describeConfidence(0.5)).toBe("medium");
  });

  it("maps low confidence scores to the low band", () => {
    expect(describeConfidence(0.31)).toBe("low");
  });
});
