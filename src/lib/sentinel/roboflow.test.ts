import { describe, expect, it } from "vitest";
import { mapRoboflow, rfClass } from "./roboflow";

const resp = (predictions: unknown[]) => ({ outputs: [{ predictions: { image: { width: 200, height: 100 }, predictions } }] });

describe("Roboflow mapping", () => {
  it("converts centre-pixel boxes to normalised top-left boxes", () => {
    const o = mapRoboflow(resp([{ x: 100, y: 50, width: 40, height: 20, confidence: 0.876, class: "pothole: hole" }]));
    expect(o.isDemo).toBe(false);
    expect(o.detections[0]).toEqual({ cls: "D40", confidence: 0.88, box: { x: 0.4, y: 0.4, w: 0.2, h: 0.2 } });
  });
  it("maps non-pothole damage to D20", () => expect(rfClass("separate road damage: cracked")).toBe("D20"));
  it("returns zero detections for an empty result", () => expect(mapRoboflow(resp([])).detections).toEqual([]));
  it("rejects malformed responses", () => expect(() => mapRoboflow({})).toThrow());
});
