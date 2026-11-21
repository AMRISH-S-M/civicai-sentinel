// Core domain logic for CivicAI Sentinel (prototype heuristics, documented in the blueprint).

export type DamageClass = "D00" | "D10" | "D20" | "D40" | "DR1" | "DR2" | "WP1" | "WP2" | "EL1" | "EL2" | "EL3";
export const CLASS_LABELS: Record<DamageClass, string> = {
  D00: "Longitudinal crack",
  D10: "Transverse crack",
  D20: "Alligator crack",
  D40: "Pothole",
  DR1: "Drain overflow",
  DR2: "Broken / open drain cover",
  WP1: "Water pipe leak",
  WP2: "Waterlogging",
  EL1: "Leaning / damaged pole",
  EL2: "Sagging / tangled wires",
  EL3: "Exposed / fallen wire",
};

export type Category = "road" | "drainage" | "water" | "electrical";
export const CATEGORIES: Category[] = ["road", "drainage", "water", "electrical"];
export const CATEGORY_LABELS: Record<Category, string> = { road: "Roads", drainage: "Drainage", water: "Water supply", electrical: "Electrical" };
export const DEPARTMENTS: Record<Category, string> = {
  road: "Roads dept.", drainage: "Storm Water Drain dept.", water: "Metro Water", electrical: "Electricity board",
};
export const CLASS_CATEGORY: Record<DamageClass, Category> = {
  D00: "road", D10: "road", D20: "road", D40: "road", DR1: "drainage", DR2: "drainage", WP1: "water", WP2: "water", EL1: "electrical", EL2: "electrical", EL3: "electrical",
};
export const classesOf = (c: Category) => (Object.keys(CLASS_CATEGORY) as DamageClass[]).filter((k) => CLASS_CATEGORY[k] === c);

/** Normalized box: x, y, w, h in 0..1 of image size. */
export interface Detection {
  cls: DamageClass;
  confidence: number;
  box: { x: number; y: number; w: number; h: number };
}

export interface ModelOutput {
  detections: Detection[];
  model: string; // e.g. "demo-prediction v0"
  isDemo: boolean;
}

export type Exposure = "unknown" | "residential" | "main_road" | "school_zone" | "hospital_zone";
export const EXPOSURE_LABELS: Record<Exposure, string> = {
  unknown: "Not set",
  residential: "Residential street",
  main_road: "Main road",
  school_zone: "School zone",
  hospital_zone: "Hospital access",
};
export const EXPOSURE_SCORES: Record<Exposure, number | null> = {
  unknown: null,
  residential: 30,
  main_road: 65,
  school_zone: 90,
  hospital_zone: 100,
};

export type Status =
  | "SUBMITTED"
  | "TRIAGED"
  | "INSPECTION_SCHEDULED"
  | "REPAIR_IN_PROGRESS"
  | "VERIFICATION_PENDING"
  | "CLOSED"
  | "REOPENED";
export const STATUS_LABELS: Record<Status, string> = {
  SUBMITTED: "Submitted",
  TRIAGED: "Triaged",
  INSPECTION_SCHEDULED: "Inspection scheduled",
  REPAIR_IN_PROGRESS: "Repair in progress",
  VERIFICATION_PENDING: "Verification pending",
  CLOSED: "Closed",
  REOPENED: "Reopened",
};
export const STATUS_ORDER: Status[] = [
  "SUBMITTED",
  "TRIAGED",
  "INSPECTION_SCHEDULED",
  "REPAIR_IN_PROGRESS",
  "VERIFICATION_PENDING",
  "REOPENED",
  "CLOSED",
];

export type VerificationResult = "APPEARS_IMPROVED" | "DAMAGE_STILL_VISIBLE" | "INCONCLUSIVE";
export const VERIFICATION_COPY: Record<VerificationResult, { label: string; ui: string }> = {
  APPEARS_IMPROVED: {
    label: "Appears improved",
    ui: "AI suggests visible improvement; confirmation required.",
  },
  DAMAGE_STILL_VISIBLE: {
    label: "Damage still visible",
    ui: "Damage remains visible. Recommend reinspection.",
  },
  INCONCLUSIVE: {
    label: "Inconclusive",
    ui: "Cannot verify from these images. Capture another photo or review manually.",
  },
};

export interface HistoryEvent {
  at: string;
  actor: "citizen" | "admin" | "inspector" | "system";
  text: string;
}

export interface Verification {
  result: VerificationResult;
  reasons: string[];
  afterImage: string;
  afterOutput: ModelOutput;
  afterLat?: number;
  afterLng?: number;
  capturedAt: string;
  human?: { decision: "confirmed" | "disputed"; at: string; note?: string };
}

export interface Report {
  id: string;
  createdAt: string;
  lat: number;
  lng: number;
  area: string;
  description: string;
  consent: boolean;
  image: string;
  output: ModelOutput;
  exposure: Exposure;
  status: Status;
  incidentId: string | null; // admin-confirmed link group; reports stay separate records
  rejectedLinks: string[];
  category?: Category; // missing on old records → derived from detections
  priorVisibleArea?: number; // from prior comparable inspection, 0..1
  history: HistoryEvent[];
  workOrder?: { team: string; due: string };
  verification?: Verification;
}

// ---------- Severity ----------
export const WEIGHTS = {
  damage: 0.35,
  size: 0.2,
  exposure: 0.2,
  recurrence: 0.15,
  deterioration: 0.1,
} as const;

export const CLASS_DAMAGE_SCORE: Record<DamageClass, number> = {
  D00: 40,
  D10: 50,
  D20: 70,
  D40: 90,
  DR1: 70,
  DR2: 75,
  WP1: 60,
  WP2: 55,
  EL1: 80,
  EL2: 70,
  EL3: 98,
};

export interface Factor {
  key: keyof typeof WEIGHTS;
  label: string;
  value: number | null;
  weight: number;
  contribution: number;
  reason: string;
}

export interface Severity {
  score: number | null;
  band: "Low" | "Moderate" | "High" | "Critical" | "Incomplete";
  factors: Factor[];
  missing: string[];
}

export function visibleArea(dets: Detection[]): number {
  return Math.min(
    1,
    dets.reduce((s, d) => s + d.box.w * d.box.h, 0),
  );
}

export function band(score: number): Severity["band"] {
  if (score >= 75) return "Critical";
  if (score >= 55) return "High";
  if (score >= 30) return "Moderate";
  return "Low";
}

export interface SeverityInput {
  detections: Detection[];
  exposure: Exposure;
  linkedReportsIn30Days: number; // including this one
  priorVisibleArea?: number | undefined;
}

export function computeSeverity(input: SeverityInput): Severity {
  const missing: string[] = [];
  const f: Factor[] = [];
  const push = (key: Factor["key"], label: string, value: number | null, reason: string) =>
    f.push({
      key,
      label,
      value,
      weight: WEIGHTS[key],
      contribution: value == null ? 0 : Math.round(value * WEIGHTS[key] * 10) / 10,
      reason,
    });

  // Damage evidence — class rule only; confidence is shown but not used as severity.
  if (input.detections.length === 0) {
    push("damage", "Damage evidence", 0, "No supported damage class detected");
  } else {
    const top = input.detections.reduce((a, b) =>
      CLASS_DAMAGE_SCORE[b.cls] > CLASS_DAMAGE_SCORE[a.cls] ? b : a,
    );
    push(
      "damage",
      "Damage evidence",
      CLASS_DAMAGE_SCORE[top.cls],
      `${CLASS_LABELS[top.cls]} detected; confidence ${top.confidence.toFixed(2)}`,
    );
  }

  const area = visibleArea(input.detections);
  const sizeVal = Math.round(Math.min(100, area * 200)); // 50% of frame → 100
  push(
    "size",
    "Visible size proxy",
    sizeVal,
    `Estimated visible region occupies ${(area * 100).toFixed(1)}% of image (not real dimensions)`,
  );

  const exp = EXPOSURE_SCORES[input.exposure];
  if (exp == null) missing.push("Public exposure context");
  push(
    "exposure",
    "Public exposure",
    exp,
    exp == null
      ? "Exposure context not set by admin"
      : `Admin-marked context: ${EXPOSURE_LABELS[input.exposure]}`,
  );

  const n = Math.max(1, input.linkedReportsIn30Days);
  const rec = Math.min(100, (n - 1) * 35);
  push(
    "recurrence",
    "Recurrence",
    rec,
    n === 1 ? "Single report in 30 days" : `${n} linked reports in 30 days`,
  );

  if (input.priorVisibleArea == null) {
    push("deterioration", "Deterioration", 0, "No prior comparable inspection — neutralized to 0");
  } else {
    const delta = area - input.priorVisibleArea;
    const v = Math.round(Math.max(0, Math.min(100, 50 + delta * 500)));
    push(
      "deterioration",
      "Deterioration",
      v,
      `Prior visible region ${(input.priorVisibleArea * 100).toFixed(1)}% → now ${(area * 100).toFixed(1)}%`,
    );
  }

  if (missing.length) return { score: null, band: "Incomplete", factors: f, missing };
  const score = Math.round(f.reduce((s, x) => s + (x.value ?? 0) * x.weight, 0));
  return { score, band: band(score), factors: f, missing };
}

// ---------- Incident linking ----------
export const LINK_RADIUS_M = 75;
export const LINK_THRESHOLD = 0.6;

export function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(bLat - aLat);
  const dLng = toR(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toR(aLat)) * Math.cos(toR(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const CRACKS: DamageClass[] = ["D00", "D10", "D20"];
export function categoryMatch(a: Detection[], b: Detection[]): number {
  const ca = new Set(a.map((d) => d.cls));
  const cb = new Set(b.map((d) => d.cls));
  if ([...ca].some((c) => cb.has(c))) return 1;
  const crackA = [...ca].some((c) => CRACKS.includes(c));
  const crackB = [...cb].some((c) => CRACKS.includes(c));
  if (crackA && crackB) return 0.6; // compatible crack families
  const catA = new Set([...ca].map((c) => CLASS_CATEGORY[c]));
  if ([...cb].some((c) => catA.has(CLASS_CATEGORY[c])) && !crackA) return 0.6; // same service category
  if ((ca.has("D20") && cb.has("D40")) || (ca.has("D40") && cb.has("D20"))) return 0.5;
  return 0;
}

export interface LinkSuggestion {
  other: Report;
  score: number;
  distanceM: number;
  reasons: string[];
}

export function linkCandidates(r: Report, all: Report[]): LinkSuggestion[] {
  const out: LinkSuggestion[] = [];
  for (const o of all) {
    if (o.id === r.id) continue;
    if (r.incidentId && o.incidentId === r.incidentId) continue;
    if (r.rejectedLinks.includes(o.id) || o.rejectedLinks.includes(r.id)) continue;
    const d = haversineM(r.lat, r.lng, o.lat, o.lng);
    if (d > LINK_RADIUS_M) continue;
    const loc = 1 - d / LINK_RADIUS_M;
    const cat = categoryMatch(r.output.detections, o.output.detections);
    const days = Math.abs(Date.parse(r.createdAt) - Date.parse(o.createdAt)) / 86400000;
    const time = Math.exp(-days / 30);
    const score = 0.45 * loc + 0.25 * cat + 0.2 * time;
    if (score < LINK_THRESHOLD) continue;
    out.push({
      other: o,
      score,
      distanceM: d,
      reasons: [
        `${Math.round(d)} m apart (radius ${LINK_RADIUS_M} m)`,
        cat === 1 ? "Same damage class" : cat > 0 ? "Compatible damage class" : "Different damage class",
        `${days.toFixed(0)} days apart`,
        "Image similarity not used in prototype",
      ],
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

// ---------- Before/after verification ----------
export interface VerifyInput {
  before: Detection[];
  after: Detection[];
  beforeAt: string;
  afterAt: string;
  beforeLat: number;
  beforeLng: number;
  afterLat?: number | undefined;
  afterLng?: number | undefined;
  afterMeanLuminance: number; // 0..255
}

export function verifyRepair(i: VerifyInput): { result: VerificationResult; reasons: string[] } {
  const reasons: string[] = [];
  if (i.afterMeanLuminance < 45) reasons.push("Follow-up image too dark for reliable comparison");
  if (i.afterMeanLuminance > 235) reasons.push("Follow-up image overexposed");
  if (Date.parse(i.afterAt) <= Date.parse(i.beforeAt))
    reasons.push("Follow-up capture time is not after the original report");
  if (i.afterLat != null && i.afterLng != null) {
    const d = haversineM(i.beforeLat, i.beforeLng, i.afterLat, i.afterLng);
    if (d > 50) reasons.push(`Follow-up location ${Math.round(d)} m from original (> 50 m)`);
  } else {
    reasons.push("Follow-up location missing — metadata is a signal, not proof");
  }
  const hardFail = reasons.some((r) => !r.startsWith("Follow-up location missing"));
  if (hardFail) return { result: "INCONCLUSIVE", reasons };

  const bA = visibleArea(i.before);
  const aA = visibleArea(i.after);
  reasons.push(
    `Detections: ${i.before.length} before → ${i.after.length} after; visible region ${(bA * 100).toFixed(1)}% → ${(aA * 100).toFixed(1)}%`,
  );
  if (i.after.length === 0 || aA < bA * 0.25) {
    reasons.push("Detected damage reduced or not found in later image");
    return { result: "APPEARS_IMPROVED", reasons };
  }
  if (aA >= bA * 0.6) {
    reasons.push("Similar defect detected in later image");
    return { result: "DAMAGE_STILL_VISIBLE", reasons };
  }
  reasons.push("Partial change — detection unstable between images");
  return { result: "INCONCLUSIVE", reasons };
}

// ---------- Phase 8: preventive analytics & SLA (prototype heuristics) ----------
export const WARDS = [
  { id: "W-102", name: "Anna Nagar", lat: 13.085, lng: 80.21 },
  { id: "W-109", name: "Nungambakkam", lat: 13.062, lng: 80.245 },
  { id: "W-133", name: "T. Nagar", lat: 13.041, lng: 80.234 },
  { id: "W-098", name: "Kilpauk", lat: 13.073, lng: 80.22 },
  { id: "W-128", name: "Vadapalani", lat: 13.05, lng: 80.212 },
] as const;

export function wardOf(lat: number, lng: number): (typeof WARDS)[number] {
  let best: (typeof WARDS)[number] = WARDS[0];
  let bd = Infinity;
  for (const w of WARDS) {
    const d = haversineM(lat, lng, w.lat, w.lng);
    if (d < bd) { bd = d; best = w; }
  }
  return best;
}

/** Demo SLA targets in days per band — not municipal standards. */
export const SLA_DAYS: Record<Severity["band"], number> = { Critical: 2, High: 7, Moderate: 14, Low: 30, Incomplete: 7 };

export function slaState(band: Severity["band"], ageDays: number) {
  const target = SLA_DAYS[band];
  const remaining = target - ageDays;
  return { target, remaining, state: remaining < 0 ? "breached" : remaining <= Math.max(1, target * 0.25) ? "at_risk" : "on_track" } as const;
}

/** Preventive stretch priority: emphasizes deterioration and public exposure. */
export function stretchPriority(f: { maxScore: number; deterioration: number; exposure: number; reports: number }): number {
  return Math.round(0.4 * f.maxScore + 0.3 * f.deterioration + 0.2 * f.exposure + 0.1 * Math.min(100, (f.reports - 1) * 35));
}

// ---------- Defect diffing (before vs after detections) ----------
export function iou(a: Detection["box"], b: Detection["box"]): number {
  const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const u = a.w * a.h + b.w * b.h - inter;
  return u > 0 ? inter / u : 0;
}
export function diffDetections(before: Detection[], after: Detection[]) {
  const usedAfter = new Set<number>();
  const beforeState = before.map((d) => {
    const j = after.findIndex((a, k) => !usedAfter.has(k) && iou(a.box, d.box) >= 0.2);
    if (j >= 0) { usedAfter.add(j); return "remaining" as const; }
    return "resolved" as const;
  });
  const afterState = after.map((_, k) => (usedAfter.has(k) ? ("remaining" as const) : ("new" as const)));
  return { beforeState, afterState };
}

export function categoryOf(r: { category?: Category | undefined; output: { detections: Detection[] } }): Category {
  return r.category ?? (r.output.detections[0] ? CLASS_CATEGORY[r.output.detections[0].cls] : "road");
}

// ---------- Field dispatch ----------
export const CREWS: Record<Category, string[]> = {
  road: ["Zone 9 Patch Crew", "Zone 10 Patch Crew"],
  drainage: ["SWD Desilting Crew A", "SWD Masonry Crew"],
  water: ["Metro Water Leak Team 3", "Metro Water Leak Team 7"],
  electrical: ["EB Line Gang North", "EB Line Gang South"],
};
/** Citizen-facing progress steps (index into this list). */
export const TRACK_STEPS = ["Received", "Assigned", "Inspection", "Repair", "Verification", "Resolved"] as const;
export function trackStep(s: Status): number {
  return { SUBMITTED: 0, REOPENED: 1, TRIAGED: 1, INSPECTION_SCHEDULED: 2, REPAIR_IN_PROGRESS: 3, VERIFICATION_PENDING: 4, CLOSED: 5 }[s];
}
