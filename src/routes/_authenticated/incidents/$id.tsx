import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader, AiTag, DetectionOverlay, Panel, SeverityBadge, SeverityPanel, StatusBadge } from "@/components/sentinel/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/sentinel/i18n";
import { UploadError, AFTER_SAMPLES, demoPredictFromBytes, fileToDataUrl } from "@/lib/sentinel/images";
import { DEPARTMENTS, categoryOf, EXPOSURE_LABELS, VERIFICATION_COPY, linkCandidates, type Exposure, type ModelOutput, type Report } from "@/lib/sentinel/model";
import { logEvent, severityFor, signOff, store, submitAfterPhoto, useReports } from "@/lib/sentinel/store";

export const Route = createFileRoute("/_authenticated/incidents/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} — CivicAI Sentinel` },
      { name: "description", content: "Civic issue evidence, explainable risk score, linked reports and repair verification." },
      { property: "og:title", content: `${params.id} — CivicAI Sentinel` },
      { property: "og:description", content: "Evidence, risk breakdown and repair verification for a citizen report." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IncidentPage,
});

const upd = (id: string, actor: "admin" | "inspector" | "citizen", text: string, fn: (r: Report) => Report = (r) => r) =>
  store.update(id, (r) => logEvent(fn(r), actor, text));

function IncidentPage() {
  const { id } = Route.useParams();
  const reports = useReports();
  if (!reports) return <><AppHeader /><p className="p-8 text-muted-foreground">Loading…</p></>;
  const r = reports.find((x) => x.id === id);
  if (!r) return <><AppHeader /><div className="p-8"><p>Report {id} not found.</p><Link to="/" className="underline">Back to dashboard</Link></div></>;
  const s = severityFor(r, reports);
  const suggestions = linkCandidates(r, reports);
  const linked = r.incidentId ? reports.filter((o) => o.incidentId === r.incidentId && o.id !== r.id) : [];

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-[1400px] space-y-4 px-4 py-5">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/" className="text-sm text-muted-foreground underline">← Dashboard</Link>
          <h1 className="font-mono text-2xl font-black">{r.id}</h1>
          <SeverityBadge s={s} /><StatusBadge status={r.status} />
          {r.incidentId && <span className="rounded-md border border-border px-2 py-0.5 font-mono text-xs">Incident {r.incidentId}</span>}
          <span className="text-sm text-muted-foreground">{r.area} · {new Date(r.createdAt).toLocaleString()}</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
          <div className="space-y-4">
            <DetectionOverlay image={r.image} output={r.output} />
            <Panel title="Citizen description"><p className="text-sm">{r.description || "—"}</p><p className="mt-1 text-xs text-muted-foreground">Consent recorded: {r.consent ? "yes" : "no"} · {r.lat.toFixed(5)}, {r.lng.toFixed(5)}</p></Panel>
            <LinkPanel r={r} suggestions={suggestions} linked={linked} />
            <WorkflowPanel r={r} />
          </div>
          <div className="space-y-4">
            <Panel title="Explainable severity">
              <SeverityPanel s={s} />
              <div className="mt-4 border-t border-border pt-3">
                <label className="text-xs font-semibold uppercase">Public exposure context (admin)</label>
                <select className="mt-1 w-full rounded-sm border border-input bg-background p-2 text-sm" value={r.exposure}
                  onChange={(e) => upd(r.id, "admin", `Exposure set to ${EXPOSURE_LABELS[e.target.value as Exposure]}`, (x) => ({ ...x, exposure: e.target.value as Exposure }))}>
                  {Object.entries(EXPOSURE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </Panel>
            <Panel title="Timeline & audit">
              <ol className="space-y-2 border-l-2 border-accent pl-3">
                {[...r.history].reverse().map((h, i) => (
                  <li key={i} className="text-sm"><span className="font-mono text-[11px] text-muted-foreground">{new Date(h.at).toLocaleString()} · {h.actor}</span><br />{h.text}</li>
                ))}
              </ol>
            </Panel>
          </div>
        </div>
      </main>
    </div>
  );
}

function LinkPanel({ r, suggestions, linked }: { r: Report; suggestions: ReturnType<typeof linkCandidates>; linked: Report[] }) {
  return (
    <Panel title="Possible same incident" right={<AiTag text="Suggestion · admin decides" />}>
      {suggestions.length === 0 && <p className="text-sm text-muted-foreground">No unreviewed nearby reports above the match threshold.</p>}
      <ul className="space-y-2">
        {suggestions.map((sg) => (
          <li key={sg.other.id} className="flex flex-wrap items-center gap-3 rounded-sm border border-border p-2">
            <img src={sg.other.image} alt="" className="h-14 w-20 rounded-sm object-cover" />
            <div className="min-w-0 flex-1 text-sm">
              <Link to="/incidents/$id" params={{ id: sg.other.id }} className="font-mono font-bold underline">{sg.other.id}</Link>
              <span className="ml-2 font-mono text-xs">match {(sg.score * 100).toFixed(0)}%</span>
              <p className="text-xs text-muted-foreground">{sg.reasons.join(" · ")}</p>
            </div>
            <Button size="sm" onClick={() => {
              const inc = r.incidentId ?? sg.other.incidentId ?? `INC-${r.id.slice(4)}`;
              store.updateMany((x) => x.id === r.id || x.id === sg.other.id || (x.incidentId && (x.incidentId === r.incidentId || x.incidentId === sg.other.incidentId))
                ? logEvent({ ...x, incidentId: inc }, "admin", `Linked to ${inc} (original record preserved)`) : x);
            }}>Accept link</Button>
            <Button size="sm" variant="outline" onClick={() => upd(r.id, "admin", `Rejected link suggestion with ${sg.other.id}`, (x) => ({ ...x, rejectedLinks: [...x.rejectedLinks, sg.other.id] }))}>Reject</Button>
          </li>
        ))}
      </ul>
      {linked.length > 0 && (
        <div className="mt-3 border-t border-border pt-2">
          <p className="text-xs font-semibold uppercase">Linked records in {r.incidentId} (each kept separately)</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {linked.map((o) => <Link key={o.id} to="/incidents/$id" params={{ id: o.id }} className="rounded-sm bg-secondary px-2 py-0.5 font-mono text-xs underline">{o.id}</Link>)}
            <Button size="sm" variant="ghost" onClick={() => upd(r.id, "admin", `Unlinked from ${r.incidentId}`, (x) => ({ ...x, incidentId: null, rejectedLinks: [...x.rejectedLinks, ...linked.map((l) => l.id)] }))}>Unlink this report</Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

function WorkflowPanel({ r }: { r: Report }) {
  const { t } = useT();
  const [err, setErr] = useState<string | null>(null);
  const [team, setTeam] = useState("Zone Patch Crew");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function runVerification(afterImage: string, afterOutput: ModelOutput, sameLocation: boolean) {
    setBusy(true); setErr(null);
    try { await submitAfterPhoto(r, afterImage, afterOutput, sameLocation); }
    catch { setErr(t("unreadable_image")); }
    finally { setBusy(false); }
  }

  const v = r.verification;
  return (
    <Panel title="Inspection · repair · verification" right={<span className="text-xs text-muted-foreground">Routing simulated</span>}>
      <div className="flex flex-wrap gap-2">
        {(r.status === "SUBMITTED" || r.status === "REOPENED") && <Button size="sm" onClick={() => upd(r.id, "admin", `Triaged → ${DEPARTMENTS[categoryOf(r)]} (simulated routing)`, (x) => ({ ...x, status: "TRIAGED" }))}>Route to {DEPARTMENTS[categoryOf(r)]}</Button>}
        {r.status === "TRIAGED" && <Button size="sm" onClick={() => upd(r.id, "admin", "Inspection scheduled", (x) => ({ ...x, status: "INSPECTION_SCHEDULED" }))}>Schedule inspection</Button>}
        {r.status === "INSPECTION_SCHEDULED" && (
          <div className="flex flex-wrap gap-2"><Input value={team} onChange={(e) => setTeam(e.target.value)} className="h-8 w-48" />
            <Button size="sm" onClick={() => upd(r.id, "inspector", `Inspection done; work order issued to ${team}`, (x) => ({ ...x, status: "REPAIR_IN_PROGRESS", workOrder: { team, due: new Date(Date.now() + 5 * 86400000).toISOString() } }))}>Record inspection & issue work order</Button></div>
        )}
      </div>
      {r.workOrder && <p className="mt-2 text-sm">Work order: <b>{r.workOrder.team}</b> · due {new Date(r.workOrder.due).toLocaleDateString()}</p>}

      {(r.status === "REPAIR_IN_PROGRESS" || r.status === "REOPENED" || (r.status === "VERIFICATION_PENDING" && v?.human == null)) && (
        <div className="mt-3 rounded-sm border border-dashed border-border p-3">
          <p className="text-sm font-semibold">Upload post-repair photo</p>
          <Input type="file" accept="image/*" className="mt-1" disabled={busy} onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            try { const url = await fileToDataUrl(f); await runVerification(url, demoPredictFromBytes(url, categoryOf(r)), true); }
            catch (e) { setErr(t(e instanceof UploadError ? e.code : "unreadable_image")); }
          }} />
          <p className="mt-2 text-xs text-muted-foreground">Road-only demo follow-up samples:</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.values(AFTER_SAMPLES).filter(() => categoryOf(r) === "road").map((s) => <Button key={s.id} size="sm" variant="secondary" disabled={busy} onClick={() => void runVerification(s.image, s.output, true)}>{s.label}</Button>)}
            {categoryOf(r) === "road" && <Button size="sm" variant="secondary" disabled={busy} onClick={() => void runVerification(AFTER_SAMPLES.repaired.image, AFTER_SAMPLES.repaired.output, false)}>Patched, no location data</Button>}
          </div>
        </div>
      )}

      {err && <p role="alert" className="mt-2 text-sm text-destructive">{err}</p>}
      {v && (
        <div className="mt-4 space-y-3">
          <Link to="/verification" search={{ id: r.id }} className="text-sm text-primary hover:underline">Open in Verification Lab →</Link>
          <div className="grid gap-2 sm:grid-cols-2">
            <div><p className="mb-1 text-xs font-semibold uppercase">Before</p><DetectionOverlay image={r.image} output={r.output} /></div>
            <div><p className="mb-1 text-xs font-semibold uppercase">After · {new Date(v.capturedAt).toLocaleString()}</p><DetectionOverlay image={v.afterImage} output={v.afterOutput} /></div>
          </div>
          <div className={`rounded-xl border-2 p-3 ${v.result === "APPEARS_IMPROVED" ? "border-sev-low" : v.result === "DAMAGE_STILL_VISIBLE" ? "border-sev-critical" : "border-sev-moderate"}`}>
            <div className="flex items-center justify-between"><p className="text-lg font-black">{VERIFICATION_COPY[v.result].label}</p><AiTag /></div>
            <p className="text-sm">{VERIFICATION_COPY[v.result].ui}</p>
            <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">{v.reasons.map((x, i) => <li key={i}>{x}</li>)}</ul>
            <p className="mt-1 text-xs text-muted-foreground">Side-by-side comparison of detections; not a certification of repair quality.</p>
          </div>
          {v.human ? (
            <p className="text-sm">Human decision: <b>{v.human.decision === "confirmed" ? "Repair confirmed" : "Disputed — reopened"}</b>{v.human.note ? ` · “${v.human.note}”` : ""} ({new Date(v.human.at).toLocaleString()})</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Input placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} className="h-8 max-w-xs" />
              <Button size="sm" className="bg-sev-low text-primary-foreground hover:bg-sev-low/80" onClick={() => signOff(r.id, "confirmed", "citizen", note)}>Confirm repair & close</Button>
              <Button size="sm" variant="destructive" onClick={() => signOff(r.id, "disputed", "citizen", note)}>Dispute & reopen</Button>
            </div>
          )}
        </div>
      )}
      {r.status === "CLOSED" && <Button size="sm" variant="outline" className="mt-3" onClick={() => upd(r.id, "citizen", "Reopened by citizen", (x) => ({ ...x, status: "REOPENED" }))}>Reopen</Button>}
    </Panel>
  );
}
