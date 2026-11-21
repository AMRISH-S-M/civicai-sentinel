import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppHeader, Panel, SeverityBadge, StatusBadge, bandVar } from "@/components/sentinel/ui";
import { IncidentMap } from "@/components/sentinel/IncidentMap";
import { Button } from "@/components/ui/button";
import { CLASS_LABELS, STATUS_LABELS, STATUS_ORDER, linkCandidates, type Status } from "@/lib/sentinel/model";
import { severityFor, store, useReports } from "@/lib/sentinel/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Triage Dashboard — CivicAI Sentinel" },
      { name: "description", content: "Municipal triage of citizen road-defect reports with explainable risk scores, map and repair verification." },
      { property: "og:title", content: "Triage Dashboard — CivicAI Sentinel" },
      { property: "og:description", content: "Detect, prioritize and verify road repairs from citizen evidence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const DEMO_STEPS = [
  { t: "0:30", text: "Submit a road photo with location — see detections", to: "/report" as const },
  { t: "1:15", text: "Severity breakdown; change exposure context", id: "RPT-1001" },
  { t: "2:00", text: "Incident link suggestion — accept/reject, records kept", id: "RPT-1003" },
  { t: "2:45", text: "Work order & upload post-repair photo", id: "RPT-1004" },
  { t: "3:45", text: "Before/after result — human confirmation", id: "RPT-1005" },
  { t: "4:30", text: "Map & repeated/worsening ranking (this page)" },
];

function Dashboard() {
  const reports = useReports();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Status | "ALL" | "OPEN">("OPEN");

  const rows = useMemo(() => {
    if (!reports) return [];
    return reports.map((r) => ({ r, s: severityFor(r, reports), links: linkCandidates(r, reports).length }))
      .sort((a, b) => (b.s.score ?? -1) - (a.s.score ?? -1));
  }, [reports]);

  if (!reports) return <><AppHeader /><p className="p-8 text-muted-foreground">Loading demo data…</p></>;

  const shown = rows.filter(({ r }) => filter === "ALL" || (filter === "OPEN" ? r.status !== "CLOSED" : r.status === filter));
  const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, reports.filter((r) => r.status === s).length]));
  const incidents = new Set(reports.map((r) => r.incidentId).filter(Boolean)).size;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Municipal triage</h1>
            <p className="text-sm text-muted-foreground">Chennai pilot area · {reports.length} citizen reports · {incidents} linked incident group(s). Routing and work orders are simulated.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { if (confirm("Reset all demo data to the seeded scenarios?")) store.reset(); }}>Reset demo data</Button>
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/report">New citizen report</Link></Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {STATUS_ORDER.map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-sm border p-2 text-left ${filter === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
              <div className="font-mono text-2xl font-bold">{counts[s]}</div>
              <div className="text-[11px] font-semibold uppercase">{STATUS_LABELS[s]}</div>
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <Panel title="Risk map" right={<span className="text-xs text-muted-foreground">Ringed = link suggestion pending</span>}>
            <IncidentMap className="h-[420px] w-full rounded-sm" onSelect={(id) => navigate({ to: "/incidents/$id", params: { id } })}
              points={rows.map(({ r, s, links }) => ({ id: r.id, lat: r.lat, lng: r.lng, color: bandVar[s.band], ring: links > 0, label: `${r.id} · ${s.score ?? "—"} ${s.band} · ${STATUS_LABELS[r.status]}` }))} />
          </Panel>
          <Panel title="5-minute demo flow">
            <ol className="space-y-2">
              {DEMO_STEPS.map((st) => (
                <li key={st.t} className="flex gap-2 text-sm">
                  <span className="font-mono text-xs font-bold text-muted-foreground">{st.t}</span>
                  {st.to ? <Link to={st.to} className="font-semibold underline decoration-accent decoration-2 underline-offset-2">{st.text}</Link>
                    : st.id ? <Link to="/incidents/$id" params={{ id: st.id }} className="font-semibold underline decoration-accent decoration-2 underline-offset-2">{st.text} ({st.id})</Link>
                    : <span className="font-semibold">{st.text}</span>}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">All AI outputs are demo predictions from seeded samples; no live model is connected.</p>
          </Panel>
        </div>

        <Panel title="Priority queue" right={
          <div className="flex gap-1 text-xs">
            {(["OPEN", "ALL"] as const).map((f) => <button key={f} onClick={() => setFilter(f)} className={`rounded-sm px-2 py-0.5 font-semibold ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{f === "OPEN" ? "Open" : "All"}</button>)}
          </div>}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase text-muted-foreground"><tr><th className="py-1">Report</th><th>Risk</th><th>Defects</th><th>Area</th><th>Status</th><th>Age</th><th>Flags</th></tr></thead>
              <tbody>
                {shown.map(({ r, s, links }) => (
                  <tr key={r.id} className="cursor-pointer border-t border-border hover:bg-muted" onClick={() => navigate({ to: "/incidents/$id", params: { id: r.id } })}>
                    <td className="py-2 font-mono font-semibold">{r.id}</td>
                    <td><SeverityBadge s={s} /></td>
                    <td>{[...new Set(r.output.detections.map((d) => CLASS_LABELS[d.cls]))].join(", ") || "None"}</td>
                    <td>{r.area}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="font-mono text-xs">{Math.floor((Date.now() - Date.parse(r.createdAt)) / 86400000)}d</td>
                    <td className="space-x-1 text-xs">
                      {r.incidentId && <span className="rounded-sm bg-secondary px-1">{r.incidentId}</span>}
                      {links > 0 && <span className="rounded-sm bg-accent px-1 font-semibold">{links} link suggestion</span>}
                      {r.status === "VERIFICATION_PENDING" && <span className="rounded-sm bg-ai/15 px-1 text-ai">needs confirmation</span>}
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No reports in this queue.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
      </main>
    </div>
  );
}
