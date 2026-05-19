import { describe, expect, it } from "vitest";

describe("web smoke", () => {
  it("has a test harness", () => {
    expect("offline").toBe("offline");
  });
});

