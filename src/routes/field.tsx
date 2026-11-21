import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader, AiTag, Panel, SeverityBadge, StatusBadge } from "@/components/sentinel/ui";
import { SlaChip, ageDays } from "@/components/sentinel/QuickInspect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES, CATEGORY_LABELS, CLASS_LABELS, CREWS, DEPARTMENTS, SLA_DAYS, categoryOf, type Category, type Report } from "@/lib/sentinel/model";
import { UploadError, AFTER_SAMPLES, demoPredictFromBytes, fileToDataUrl } from "@/lib/sentinel/images";
import { logEvent, severityFor, store, submitAfterPhoto, useReports } from "@/lib/sentinel/store";
import { useT } from "@/lib/sentinel/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/field")({
  head: () => ({
    meta: [
      { title: "Field Crew Dispatch — CivicAI Sentinel" },
      { name: "description", content: "Field crews pick up work orders, record inspections, log site progress and upload completion photos." },
      { property: "og:title", content: "Field Crew Dispatch — CivicAI Sentinel" },
      { property: "og:description", content: "Work orders for road, drainage, water and electrical repair crews." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Field,
});

const ACTIVE = new Set(["TRIAGED", "INSPECTION_SCHEDULED", "REPAIR_IN_PROGRESS", "REOPENED"]);

function Field() {
  const reports = useReports();
  const { cat, cls } = useT();
  const [dept, setDept] = useState<Category>("road");
  const [selId, setSelId] = useState<string | null>(null);
  if (!reports) return <div className="min-h-screen"><AppHeader /></div>;

  const orders = reports.filter((r) => categoryOf(r) === dept && (ACTIVE.has(r.status) || r.status === "VERIFICATION_PENDING"))
    .map((r) => ({ r, s: severityFor(r, reports) }))
    .sort((a, b) => (b.s.score ?? 0) - (a.s.score ?? 0));
  const sel = orders.find((o) => o.r.id === selId) ?? orders[0];

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-[1400px] space-y-4 px-5 py-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Field dispatch</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Field Crew Work Orders</h1>
          <p className="text-sm text-muted-foreground">Pick your department, take a job, record the inspection and upload the completion photo. Dispatch is simulated in this demo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const n = reports.filter((r) => categoryOf(r) === c && ACTIVE.has(r.status)).length;
            return <button key={c} onClick={() => { setDept(c); setSelId(null); }} className={cn("rounded-lg border px-3 py-1.5 text-sm font-medium", dept === c ? "border-primary bg-primary/15 text-primary glow" : "border-border text-muted-foreground hover:text-foreground")}>{DEPARTMENTS[c]} <span className="ml-1 font-mono text-xs">{n}</span></button>;
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          <Panel title={`Job queue · ${cat(dept, CATEGORY_LABELS[dept])}`} bodyClassName="p-0">
            {orders.length === 0 && <p className="p-4 text-sm text-muted-foreground">No open jobs for this department.</p>}
            <ul>
              {orders.map(({ r, s }) => (
                <li key={r.id}>
                  <button onClick={() => setSelId(r.id)} className={cn("w-full border-b border-border px-4 py-3 text-left hover:bg-secondary/40", sel?.r.id === r.id && "bg-primary/10")}>
                    <div className="flex items-center justify-between gap-2"><span className="font-mono text-sm font-semibold">{r.id}</span><SeverityBadge s={s} /></div>
                    <div className="mt-1 truncate text-sm">{r.area}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5"><StatusBadge status={r.status} />{r.workOrder && <span className="text-xs text-muted-foreground">{r.workOrder.team}</span>}</div>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
          {sel && <JobCard key={sel.r.id} r={sel.r} band={sel.s.band} score={sel.s.score} cls={cls} />}
        </div>
      </main>
    </div>
  );
}

function JobCard({ r, band, score, cls }: { r: Report; band: ReturnType<typeof severityFor>["band"]; score: number | null | undefined; cls: ReturnType<typeof useT>["cls"] }) {
  const { t } = useT();
  const c = categoryOf(r);
  const [team, setTeam] = useState(r.workOrder?.team ?? CREWS[c][0] ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const act = (text: string, f: (x: Report) => Report = (x) => x) => store.update(r.id, (x) => logEvent(f(x), "inspector", text));
  const dueFor = () => new Date(Date.now() + SLA_DAYS[band] * 864e5).toISOString();
  const upload = async (img: string, sameLoc: boolean, out = demoPredictFromBytes(img, c)) => { setBusy(true); setErr(null); try { await submitAfterPhoto(r, img, out, sameLoc); } catch { setErr(t("unreadable_image")); } finally { setBusy(false); } };

  return (
    <Panel title={<span className="font-mono normal-case text-foreground">{r.id} · {r.area}</span>} right={<StatusBadge status={r.status} />}>
      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <div className="space-y-2">
          <img src={r.image} alt="Citizen photo" className="w-full rounded-lg border border-border" />
          <SlaChip band={band} ageDays={ageDays(r)} />
          <p className="text-xs text-muted-foreground">Risk {score ?? "—"} · {[...new Set(r.output.detections.map((d) => cls(d.cls, CLASS_LABELS[d.cls])))].join(", ")} <AiTag text="AI suggestion" /></p>
          <a className="text-xs text-primary hover:underline" href={`https://www.google.com/maps?q=${r.lat},${r.lng}`} target="_blank" rel="noreferrer">Open location in maps ↗</a>
          <p className="text-sm">“{r.description || "No description"}”</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">1 · Crew assignment</h3>
            <div className="flex flex-wrap gap-2">
              {CREWS[c].map((t) => <button key={t} onClick={() => setTeam(t)} className={cn("rounded-md border px-2.5 py-1 text-sm", team === t ? "border-primary text-primary" : "border-border")}>{t}</button>)}
            </div>
            {(r.status === "TRIAGED" || r.status === "REOPENED") && (
              <Button size="sm" onClick={() => act(`Work order issued to ${team} — inspection scheduled`, (x) => ({ ...x, status: "INSPECTION_SCHEDULED", workOrder: { team, due: dueFor() } }))}>Accept job for {team}</Button>
            )}
            {r.workOrder && <p className="text-xs text-muted-foreground">Assigned: {r.workOrder.team} · target {new Date(r.workOrder.due).toLocaleDateString()}</p>}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">2 · Site updates</h3>
            <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Note for the record (materials, safety barricade, etc.)" />
            <div className="flex flex-wrap gap-2">
              {r.status === "INSPECTION_SCHEDULED" && <>
                <Button size="sm" onClick={() => { act(`Inspection done — defect confirmed on site${note ? `: ${note}` : ""}`, (x) => ({ ...x, status: "REPAIR_IN_PROGRESS", workOrder: x.workOrder ?? { team, due: dueFor() } })); setNote(""); }}>Confirm defect · start repair</Button>
                <Button size="sm" variant="outline" onClick={() => { act(`Inspection: no defect found on site${note ? `: ${note}` : ""}`, (x) => ({ ...x, status: "CLOSED" })); setNote(""); }}>No defect found · close</Button>
              </>}
              <Button size="sm" variant="outline" onClick={() => { act("Crew arrived on site"); }}>Arrived on site</Button>
              <Button size="sm" variant="outline" disabled={!note.trim()} onClick={() => { act(`Crew note: ${note.trim()}`); setNote(""); }}>Add note</Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">3 · Completion photo</h3>
            {r.status === "REPAIR_IN_PROGRESS" ? (
              <>
                <p className="text-xs text-muted-foreground">Take the photo from the same spot as the citizen. The AI comparison is a suggestion; the resident or an inspector confirms.</p>
                <label className="inline-flex cursor-pointer items-center rounded-md border border-primary/60 px-3 py-1.5 text-sm text-primary hover:bg-primary/10">
                  Upload photo
                  <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    
                    try { await upload(await fileToDataUrl(f), true); } catch (e) { setErr(t(e instanceof UploadError ? e.code : "unreadable_image")); }
                  }} />
                </label>
                {c === "road" && (
                  <div className="flex flex-wrap gap-2">{Object.values(AFTER_SAMPLES).map((s) => (
                    <button key={s.id} disabled={busy} onClick={() => void upload(s.image, true, s.output)} className="w-28 overflow-hidden rounded-md border border-border text-left hover:border-primary">
                      <img src={s.image} alt="" className="h-16 w-full object-cover" /><span className="block px-1.5 py-0.5 text-[11px]">{s.label}</span>
                    </button>))}</div>
                )}
                {err && <p className="text-sm text-sev-critical">{err}</p>}
              </>
            ) : r.status === "VERIFICATION_PENDING" ? (
              <p className="text-sm">Photo submitted — awaiting resident / inspector sign-off. <Link to="/verification" search={{ id: r.id }} className="text-primary hover:underline">Open Verification Lab</Link></p>
            ) : <p className="text-xs text-muted-foreground">Available once the repair has started.</p>}
          </div>

          <div>
            <h3 className="mb-1 text-sm font-semibold">Job log</h3>
            <ol className="max-h-40 space-y-1 overflow-auto text-xs text-muted-foreground">{[...r.history].reverse().map((h, i) => <li key={i}><span className="font-mono">{new Date(h.at).toLocaleString()}</span> · {h.text}</li>)}</ol>
          </div>
        </div>
      </div>
    </Panel>
  );
}
