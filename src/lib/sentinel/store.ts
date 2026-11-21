// Seeded demo store. Reports are shared through the connected Supabase
// database (with live updates); localStorage is an offline cache so the demo
// still opens if the backend is unreachable.
import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
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
const remoteEnabled = () => typeof window !== "undefined" && import.meta.env.MODE !== "test";

type Row = {
  id: string; created_at: string; lat: number; lng: number; area: string; description: string; category: string | null;
  exposure: string; status: string; incident_id: string | null; consent: boolean; image: string; output: unknown;
  history: unknown; verification: unknown; work_order: unknown; prior_visible_area: number | null; rejected_links: unknown;
};
export function toRow(r: Report): Row {
  return { id: r.id, created_at: r.createdAt, lat: r.lat, lng: r.lng, area: r.area, description: r.description, category: r.category ?? null,
    exposure: r.exposure, status: r.status, incident_id: r.incidentId, consent: r.consent, image: r.image, output: r.output,
    history: r.history, verification: r.verification ?? null, work_order: r.workOrder ?? null, prior_visible_area: r.priorVisibleArea ?? null,
    rejected_links: r.rejectedLinks };
}
export function fromRow(x: Row): Report {
  return { id: x.id, createdAt: new Date(x.created_at).toISOString(), lat: x.lat, lng: x.lng, area: x.area, description: x.description,
    consent: x.consent, image: x.image, output: x.output as Report["output"], exposure: x.exposure as Report["exposure"], status: x.status as Report["status"],
    incidentId: x.incident_id, rejectedLinks: Array.isArray(x.rejected_links) ? (x.rejected_links as string[]) : [],
    history: Array.isArray(x.history) ? (x.history as HistoryEvent[]) : [],
    ...(x.category && { category: x.category as NonNullable<Report["category"]> }),
    ...(x.prior_visible_area != null && { priorVisibleArea: x.prior_visible_area }),
    ...(x.work_order != null && { workOrder: x.work_order as NonNullable<Report["workOrder"]> }),
    ...(x.verification != null && { verification: x.verification as NonNullable<Report["verification"]> }) };
}

// Supabase status shown to presenters: "local" until the first successful load.
export type SyncStatus = "local" | "live" | "offline";
let sync: SyncStatus = "local";
const syncListeners = new Set<() => void>();
const setSync = (s: SyncStatus) => { sync = s; syncListeners.forEach((l) => l()); };
export const useSyncStatus = () => useSyncExternalStore((l) => { syncListeners.add(l); return () => syncListeners.delete(l); }, () => sync, () => "local" as SyncStatus);

// Only staff can list reports (RLS); residents keep the local cache and use
// ticket lookup instead, so an empty staff-less result never wipes the cache.
async function pull() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) { setSync("local"); return; }
  const { data: staff } = await supabase.rpc("is_staff", { _user_id: u.user.id });
  if (!staff) { setSync("local"); return; }
  const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
  if (error || !data) { setSync("offline"); return; }
  setSync("live");
  apply(data.map((d) => fromRow(d as Row)));
}
let started = false;
function startRemote() {
  if (started || !remoteEnabled()) return;
  started = true;
  void pull();
  supabase.channel(`reports-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => void pull())
    .subscribe();
  supabase.auth.onAuthStateChange((event) => { if (event === "SIGNED_IN" || event === "SIGNED_OUT") void pull(); });
}
async function push(prev: Report[], next: Report[]) {
  if (!remoteEnabled()) return;
  const before = new Map(prev.map((r) => [r.id, r]));
  const added = next.filter((r) => !before.has(r.id)).map(toRow);
  const changed = next.filter((r) => before.has(r.id) && before.get(r.id) !== r).map(toRow);
  const ids = new Set(next.map((r) => r.id));
  const removed = prev.filter((r) => !ids.has(r.id)).map((r) => r.id);
  const results = await Promise.all([
    added.length ? supabase.from("reports").insert(added as never) : null,
    changed.length ? supabase.from("reports").upsert(changed as never) : null,
    removed.length ? supabase.from("reports").delete().in("id", removed) : null,
  ]);
  if (results.some((x) => x?.error)) setSync("offline");
}

function load(): Report[] {
  if (!state) {
    try {
      const raw = localStorage.getItem(KEY);
      state = raw ? (JSON.parse(raw) as Report[]) : seedReports();
    } catch {
      state = seedReports();
    }
  }
  startRemote();
  return state;
}
function apply(next: Report[]) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota: keep in memory */ }
  listeners.forEach((l) => l());
}
function save(next: Report[]) {
  const prev = state ?? [];
  apply(next);
  void push(prev, next);
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

export async function submitAfterPhoto(r: Report, afterImage: string, afterOutput: ModelOutput, sameLocation: boolean, comparable = true) {
  const lum = await meanLuminance(afterImage);
  const capturedAt = new Date().toISOString();
  const afterLat = sameLocation ? r.lat + 0.00003 : undefined;
  const afterLng = sameLocation ? r.lng + 0.00002 : undefined;
  const v = verifyRepair({ before: r.output.detections, after: afterOutput.detections, beforeAt: r.createdAt, afterAt: capturedAt, beforeLat: r.lat, beforeLng: r.lng, afterLat, afterLng, afterMeanLuminance: lum, comparable });
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

// Resident-side ticket access (works signed out): one ticket by number, and
// confirm / dispute / reopen through database functions that check the status.
export async function fetchTicket(id: string): Promise<Report | null> {
  const { data, error } = await supabase.rpc("get_ticket", { _id: id });
  if (error) throw error;
  const row = (data as unknown as Row[] | null)?.[0];
  return row ? fromRow(row) : null;
}
export async function citizenSignOff(id: string, decision: "confirmed" | "disputed" | "reopen", note = "") {
  const { error } = await supabase.rpc("citizen_sign_off", { _id: id, _decision: decision, _note: note });
  if (error) throw error;
}

// Tickets this browser submitted (citizen "my tickets").
const TKEY = "civicai-my-tickets";
export function rememberTicket(id: string) {
  try { const l = myTickets(); localStorage.setItem(TKEY, JSON.stringify([id, ...l.filter((x) => x !== id)].slice(0, 20))); } catch { /* ignore */ }
}
export function myTickets(): string[] {
  try { const v = JSON.parse(localStorage.getItem(TKEY) ?? "[]") as unknown; return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []; } catch { return []; }
}
