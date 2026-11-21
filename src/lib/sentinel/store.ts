// Local seeded demo store (localStorage). The blueprint requires a demo mode
// that never depends on live APIs.
import { useSyncExternalStore } from "react";
import type { HistoryEvent, Report } from "./model";
import { VERIFICATION_COPY, computeSeverity, haversineM, verifyRepair, type ModelOutput } from "./model";
import { AFTER_SAMPLES, SAMPLES, meanLuminance } from "./images";

const KEY = "civicai-sentinel-v3";
const day = 86400000;
const ago = (d: number, base = Date.now()) => new Date(base - d * day).toISOString();
const ev = (at: string, actor: HistoryEvent["actor"], text: string): HistoryEvent => ({ at, actor, text });

export function seedReports(now = Date.now()): Report[] {
  const base = { consent: true, rejectedLinks: [] as string[] };
  const r = (p: Partial<Report> & Pick<Report, "id" | "createdAt" | "lat" | "lng" | "area" | "description" | "image" | "output" | "exposure" | "status">): Report => ({
    ...base, incidentId: null, history: [ev(p.createdAt, "citizen", "Report submitted with photo evidence")], ...p,
  });
  return [
    r({ id: "RPT-1001", createdAt: ago(12, now), lat: 13.08502, lng: 80.21012, area: "Anna Nagar 2nd Ave", description: "Deep pothole near the school gate, kids walk around it into traffic.", image: SAMPLES.pothole.image, output: SAMPLES.pothole.output, exposure: "school_zone", status: "TRIAGED", incidentId: "INC-01", priorVisibleArea: 0.3,
      history: [ev(ago(12, now), "citizen", "Report submitted with photo evidence"), ev(ago(11, now), "admin", "Triaged → Roads dept. (simulated routing)")] }),
    r({ id: "RPT-1002", createdAt: ago(5, now), lat: 13.08518, lng: 80.21025, area: "Anna Nagar 2nd Ave", description: "Same pothole is getting bigger after rain.", image: SAMPLES.pothole.image, output: { ...SAMPLES.pothole.output, detections: SAMPLES.pothole.output.detections.map((d) => ({ ...d, confidence: 0.84 })) }, exposure: "school_zone", status: "TRIAGED", incidentId: "INC-01",
      history: [ev(ago(5, now), "citizen", "Report submitted with photo evidence"), ev(ago(4, now), "admin", "Linked to INC-01 (records preserved separately)")] }),
    r({ id: "RPT-1003", createdAt: ago(1, now), lat: 13.08528, lng: 80.20998, area: "Anna Nagar 2nd Ave", description: "Pothole outside school, scooter nearly fell.", image: SAMPLES.potholeCrack.image, output: SAMPLES.potholeCrack.output, exposure: "school_zone", status: "SUBMITTED" }),
    r({ id: "RPT-1004", createdAt: ago(9, now), lat: 13.06402, lng: 80.24931, area: "Greams Rd (hospital access)", description: "Broken road surface at ambulance entry.", image: SAMPLES.potholeCrack.image, output: SAMPLES.potholeCrack.output, exposure: "hospital_zone", status: "REPAIR_IN_PROGRESS", workOrder: { team: "Zone 9 Patch Crew", due: ago(-2, now) },
      history: [ev(ago(9, now), "citizen", "Report submitted with photo evidence"), ev(ago(8, now), "admin", "Triaged → Roads dept."), ev(ago(6, now), "inspector", "Inspection: condition high, ambulance lane affected"), ev(ago(3, now), "admin", "Work order issued to Zone 9 Patch Crew (simulated)")] }),
    r({ id: "RPT-1005", createdAt: ago(20, now), lat: 13.04121, lng: 80.23395, area: "T. Nagar, Usman Rd", description: "Pothole in the left lane.", image: SAMPLES.pothole.image, output: SAMPLES.pothole.output, exposure: "main_road", status: "VERIFICATION_PENDING", workOrder: { team: "Zone 10 Patch Crew", due: ago(4, now) },
      verification: { result: "APPEARS_IMPROVED", reasons: ["Detections: 1 before → 0 after; visible region 43.6% → 0.0%", "Detected damage reduced or not found in later image"], afterImage: AFTER_SAMPLES.repaired.image, afterOutput: AFTER_SAMPLES.repaired.output, afterLat: 13.04125, afterLng: 80.23398, capturedAt: ago(1, now) },
      history: [ev(ago(20, now), "citizen", "Report submitted"), ev(ago(18, now), "admin", "Triaged"), ev(ago(10, now), "admin", "Work order issued"), ev(ago(1, now), "inspector", "Completion photo uploaded — AI comparison: Appears improved")] }),
    r({ id: "RPT-1006", createdAt: ago(3, now), lat: 13.0732, lng: 80.2205, area: "Kilpauk, Poonamallee High Rd", description: "Long crack along the lane.", image: SAMPLES.longCrack.image, output: SAMPLES.longCrack.output, exposure: "unknown", status: "SUBMITTED" }),
    r({ id: "RPT-1007", createdAt: ago(30, now), lat: 13.0505, lng: 80.2121, area: "Vadapalani, 100 Ft Rd", description: "Crack across the road.", image: SAMPLES.transCrack.image, output: SAMPLES.transCrack.output, exposure: "residential", status: "CLOSED",
      verification: { result: "APPEARS_IMPROVED", reasons: ["Detected damage not found in later image"], afterImage: AFTER_SAMPLES.repaired.image, afterOutput: AFTER_SAMPLES.repaired.output, afterLat: 13.0505, afterLng: 80.2121, capturedAt: ago(2, now), human: { decision: "confirmed", at: ago(2, now), note: "Citizen confirmed" } } }),
    r({ id: "RPT-1008", createdAt: ago(2, now), lat: 13.0868, lng: 80.2125, area: "Anna Nagar 3rd Main Rd", description: "Drain overflowing onto the road, slab broken near the gate.", image: SAMPLES.drain.image, output: SAMPLES.drain.output, exposure: "residential", status: "SUBMITTED", category: "drainage" }),
    r({ id: "RPT-1009", createdAt: ago(4, now), lat: 13.0612, lng: 80.2468, area: "Nungambakkam High Rd", description: "Drinking water pipe leaking for days, water wasted.", image: SAMPLES.pipe.image, output: SAMPLES.pipe.output, exposure: "main_road", status: "TRIAGED", category: "water",
      history: [ev(ago(4, now), "citizen", "Report submitted with photo evidence"), ev(ago(3, now), "admin", "Triaged → Metro Water (simulated routing)")] }),
    r({ id: "RPT-1010", createdAt: ago(1, now), lat: 13.06395, lng: 80.2489, area: "Greams Rd (hospital access)", description: "Wire fallen on the footpath outside the hospital, people walking past.", image: SAMPLES.wire.image, output: SAMPLES.wire.output, exposure: "hospital_zone", status: "SUBMITTED", category: "electrical" }),
    r({ id: "RPT-1011", createdAt: ago(6, now), lat: 13.0425, lng: 80.2351, area: "T. Nagar, Usman Rd", description: "Electric pole leaning badly with tangled wires.", image: SAMPLES.pole.image, output: SAMPLES.pole.output, exposure: "main_road", status: "INSPECTION_SCHEDULED", category: "electrical",
      history: [ev(ago(6, now), "citizen", "Report submitted with photo evidence"), ev(ago(5, now), "admin", "Triaged → Electricity board (simulated routing)"), ev(ago(4, now), "admin", "Inspection scheduled")] }),
  ];
}

let state: Report[] | null = null;
const listeners = new Set<() => void>();
function load(): Report[] {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? (JSON.parse(raw) as Report[]) : seedReports();
  } catch {
    state = seedReports();
  }
  return state;
}
function save(next: Report[]) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota: keep in memory */ }
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

export function useReports(): Report[] | null {
  return useSyncExternalStore(subscribe, load, () => null);
}

export const store = {
  add(r: Report) { save([r, ...load()]); },
  update(id: string, fn: (r: Report) => Report) { save(load().map((r) => (r.id === id ? fn(r) : r))); },
  updateMany(fn: (r: Report) => Report) { save(load().map(fn)); },
  reset() { save(seedReports()); },
};

export function logEvent(r: Report, actor: HistoryEvent["actor"], text: string): Report {
  return { ...r, history: [...r.history, ev(new Date().toISOString(), actor, text)] };
}

export function severityFor(r: Report, all: Report[]) {
  const now = Date.parse(r.createdAt);
  const linked = r.incidentId
    ? all.filter((o) => o.incidentId === r.incidentId && Math.abs(Date.parse(o.createdAt) - now) <= 30 * day).length
    : 1;
  return computeSeverity({ detections: r.output.detections, exposure: r.exposure, linkedReportsIn30Days: linked, priorVisibleArea: r.priorVisibleArea });
}

export const nearby = (r: Report, all: Report[], m = 200) =>
  all.filter((o) => o.id !== r.id && haversineM(r.lat, r.lng, o.lat, o.lng) <= m);

// ---------- shared verification actions ----------

export async function submitAfterPhoto(r: Report, afterImage: string, afterOutput: ModelOutput, sameLocation: boolean) {
  const lum = await meanLuminance(afterImage);
  const capturedAt = new Date().toISOString();
  const afterLat = sameLocation ? r.lat + 0.00003 : undefined;
  const afterLng = sameLocation ? r.lng + 0.00002 : undefined;
  const v = verifyRepair({ before: r.output.detections, after: afterOutput.detections, beforeAt: r.createdAt, afterAt: capturedAt, beforeLat: r.lat, beforeLng: r.lng, afterLat, afterLng, afterMeanLuminance: lum });
  store.update(r.id, (x) => logEvent({
    ...x, status: "VERIFICATION_PENDING",
    verification: { ...v, afterImage, afterOutput, capturedAt, ...(afterLat != null && { afterLat }), ...(afterLng != null && { afterLng }) },
  }, "inspector", `Completion photo uploaded — AI comparison: ${VERIFICATION_COPY[v.result].label}`));
}

export function signOff(id: string, decision: "confirmed" | "disputed", actor: "citizen" | "inspector", note: string) {
  store.update(id, (x) => logEvent({
    ...x, status: decision === "confirmed" ? "CLOSED" : "REOPENED",
    ...(x.verification && { verification: { ...x.verification, human: { decision, at: new Date().toISOString(), ...(note && { note }) } } }),
  }, actor, decision === "confirmed" ? `Repair confirmed by ${actor}${note ? `: ${note}` : ""}` : `Repair disputed by ${actor} — reopened${note ? `: ${note}` : ""}`));
}
