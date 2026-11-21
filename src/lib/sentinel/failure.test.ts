import { describe, expect, it } from "vitest";
import { band, computeSeverity, linkCandidates, verifyRepair, type Detection, type Report } from "./model";
import { demoPredictFromBytes, MAX_UPLOAD_BYTES, validateImageFile } from "./images";
import { seedReports } from "./store";

const defect: Detection = { cls: "D40", confidence: 0.82, box: { x: 0.1, y: 0.2, w: 0.5, h: 0.5 } };
const base = { before: [defect], after: [] as Detection[], beforeAt: "2026-11-01T00:00:00Z", afterAt: "2026-11-02T00:00:00Z", beforeLat: 13, beforeLng: 80, afterLat: 13, afterLng: 80, afterMeanLuminance: 120 };

describe("Phase 9 photo validation", () => {
  it("rejects non-images", () => expect(() => validateImageFile({ type: "text/plain", size: 12 })).toThrow("invalid_image"));
  it("rejects empty images", () => expect(() => validateImageFile({ type: "image/jpeg", size: 0 })).toThrow("invalid_image"));
  it("rejects SVG uploads", () => expect(() => validateImageFile({ type: "image/svg+xml", size: 12 })).toThrow("invalid_image"));
  it("rejects photos over the 10 MB cap", () => expect(() => validateImageFile({ type: "image/jpeg", size: 10 * 1024 * 1024 + 1 })).toThrow("large_image"));
  it.each(["image/jpeg", "image/png", "image/webp"])("accepts %s at the cap", (type) => expect(() => validateImageFile({ type, size: MAX_UPLOAD_BYTES })).not.toThrow());
  it("works without a trained detector and stays marked demo", () => {
    const a = demoPredictFromBytes("same-photo", "water");
    expect(a).toEqual(demoPredictFromBytes("same-photo", "water"));
    expect(a.isDemo).toBe(true);
    expect(a.detections.every((d) => d.cls === "WP1" || d.cls === "WP2")).toBe(true);
  });
});

describe("Phase 9 conservative verification", () => {
  it("rejects a reviewer-marked alignment mismatch", () => expect(verifyRepair({ ...base, comparable: false }).result).toBe("INCONCLUSIVE"));
  it("rejects unreadable brightness", () => expect(verifyRepair({ ...base, afterMeanLuminance: NaN }).result).toBe("INCONCLUSIVE"));
  it("rejects an overexposed image", () => expect(verifyRepair({ ...base, afterMeanLuminance: 250 }).result).toBe("INCONCLUSIVE"));
  it("rejects dark photos below luminance 45", () => expect(verifyRepair({ ...base, afterMeanLuminance: 44 }).result).toBe("INCONCLUSIVE"));
  it("rejects an invalid timestamp", () => expect(verifyRepair({ ...base, afterAt: "invalid" }).result).toBe("INCONCLUSIVE"));
  it("rejects a follow-up captured before the original", () => expect(verifyRepair({ ...base, afterAt: base.beforeAt }).result).toBe("INCONCLUSIVE"));
  it("requests human review without original detections", () => expect(verifyRepair({ ...base, before: [] }).result).toBe("INCONCLUSIVE"));
  it("rejects low confidence below 0.45", () => expect(verifyRepair({ ...base, after: [{ ...defect, confidence: 0.44 }] }).result).toBe("INCONCLUSIVE"));
  it("gives inconclusive for partial reduction", () => expect(verifyRepair({ ...base, after: [{ ...defect, box: { ...defect.box, w: 0.25 } }] }).result).toBe("INCONCLUSIVE"));
  it("flags missing GPS rather than treating it as proof", () => {
    const { afterLat: _lat, afterLng: _lng, ...noGps } = base;
    expect(verifyRepair(noGps).reasons).toContain("Follow-up location missing — metadata is a signal, not proof");
  });
  it("no detections has zero damage contribution, not proof of safety", () => {
    const s = computeSeverity({ detections: [], exposure: "unknown", linkedReportsIn30Days: 1 });
    expect(s.factors.find((f) => f.key === "damage")?.value).toBe(0);
    expect(s.score).toBeNull();
  });
  it.each([[29, "Low"], [30, "Moderate"], [54, "Moderate"], [55, "High"], [74, "High"], [75, "Critical"]] as const)("band boundary %i", (score, expected) => expect(band(score)).toBe(expected));
});

describe("Phase 9 nearby distinct incidents", () => {
  const original = seedReports(1795219200000)[0];
  if (!original) throw new Error("Missing seeded report");
  const r: Report = { ...original, incidentId: null, output: { ...original.output, detections: [defect] } };
  it("does not suggest a different service at exactly the same position and time", () => {
    const other: Report = { ...r, id: "OTHER", output: { ...r.output, detections: [{ ...defect, cls: "WP1" }] } };
    expect(linkCandidates(r, [r, other])).toEqual([]);
  });
  it("respects an admin rejection", () => expect(linkCandidates({ ...r, rejectedLinks: ["OTHER"] }, [r, { ...r, id: "OTHER" }])).toEqual([]));
  it("does not alter or merge original citizen records", () => {
    const all = [r, { ...r, id: "OTHER" }]; const saved = JSON.stringify(all);
    expect(linkCandidates(r, all)).toHaveLength(1);
    expect(JSON.stringify(all)).toBe(saved);
  });
});