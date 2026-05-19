import { describe, expect, it } from "vitest";
import { compareDoctorQueue, suggestTriagePriority } from "./index";

describe("triage helpers", () => {
  it("suggests critical priority for dangerous oxygen saturation", () => {
    expect(suggestTriagePriority({ oxygenSaturation: 82 })).toBe("CRITICAL");
  });

  it("sorts doctor queue by priority before waiting time", () => {
    const rows = [
      { triagePriority: "NORMAL" as const, readyAt: "2026-01-01T08:00:00.000Z" },
      { triagePriority: "CRITICAL" as const, readyAt: "2026-01-01T08:20:00.000Z" },
      { triagePriority: "URGENT" as const, readyAt: "2026-01-01T07:00:00.000Z" },
    ].sort(compareDoctorQueue);

    expect(rows.map((row) => row.triagePriority)).toEqual(["CRITICAL", "URGENT", "NORMAL"]);
  });
});

