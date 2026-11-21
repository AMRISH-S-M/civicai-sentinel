import { describe, expect, it } from "vitest";
import { computeSeverity, linkCandidates, verifyRepair, type Detection } from "./model";
import { seedReports } from "./store";

const pothole: Detection = { cls: "D40", confidence: 0.82, box: { x: 0.4, y: 0.5, w: 0.2, h: 0.2 } }; // 4% area

describe("severity", () => {
  it("applies 0.35/0.20/0.20/0.15/0.10 weights", () => {
    // damage 90, size 8, exposure 90 (school), recurrence 70 (3 reports), deterioration 0
    const s = computeSeverity({ detections: [pothole], exposure: "school_zone", linkedReportsIn30Days: 3 });
    expect(s.score).toBe(Math.round(0.35 * 90 + 0.2 * 8 + 0.2 * 90 + 0.15 * 70 + 0.1 * 0));
    expect(s.band).toBe("High");
  });
  it("reports incomplete instead of fabricating missing exposure", () => {
    const s = computeSeverity({ detections: [pothole], exposure: "unknown", linkedReportsIn30Days: 1 });
    expect(s.score).toBeNull();
    expect(s.band).toBe("Incomplete");
  });
});

describe("verification", () => {
  const base = { before: [pothole], beforeAt: "2026-01-01T00:00:00Z", afterAt: "2026-01-05T00:00:00Z", beforeLat: 13, beforeLng: 80, afterLat: 13, afterLng: 80, afterMeanLuminance: 120 };
  it("appears improved when damage gone", () => expect(verifyRepair({ ...base, after: [] }).result).toBe("APPEARS_IMPROVED"));
  it("still visible when similar damage", () => expect(verifyRepair({ ...base, after: [pothole] }).result).toBe("DAMAGE_STILL_VISIBLE"));
  it("inconclusive when too dark", () => expect(verifyRepair({ ...base, after: [], afterMeanLuminance: 20 }).result).toBe("INCONCLUSIVE"));
  it("inconclusive when far away", () => expect(verifyRepair({ ...base, after: [], afterLat: 13.01 }).result).toBe("INCONCLUSIVE"));
});

describe("linking", () => {
  it("suggests nearby unlinked report but not distant ones", () => {
    const all = seedReports(Date.parse("2026-11-21T00:00:00Z"));
    const r3 = all.find((r) => r.id === "RPT-1003")!;
    const ids = linkCandidates(r3, all).map((s) => s.other.id);
    expect(ids).toContain("RPT-1001");
    expect(ids).not.toContain("RPT-1004");
  });
});

import { slaState, stretchPriority } from "./model";
describe("SLA", () => {
  it("critical breaches after 2 days", () => expect(slaState("Critical", 3).state).toBe("breached"));
  it("high on track at day 1", () => expect(slaState("High", 1).state).toBe("on_track"));
});
describe("stretch priority", () => {
  it("weights deterioration and exposure", () => expect(stretchPriority({ maxScore: 60, deterioration: 100, exposure: 90, reports: 3 })).toBe(Math.round(24 + 30 + 18 + 7)));
});

import { diffDetections } from "./model";
describe("defect diff", () => {
  it("marks removed damage as resolved and overlapping as remaining", () => {
    const moved: Detection = { ...pothole, box: { ...pothole.box, x: 0.42 } };
    expect(diffDetections([pothole], []).beforeState).toEqual(["resolved"]);
    expect(diffDetections([pothole], [moved]).beforeState).toEqual(["remaining"]);
  });
});
