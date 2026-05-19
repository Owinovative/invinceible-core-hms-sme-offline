import { describe, expect, it } from "vitest";
import { suggestTriagePriority } from "@invinceible/sme-shared";

describe("offline HMS backend safety helpers", () => {
  it("flags critical vitals before manual triage override", () => {
    expect(suggestTriagePriority({ oxygenSaturation: 85, painScore: 9 })).toBe("CRITICAL");
  });
});

