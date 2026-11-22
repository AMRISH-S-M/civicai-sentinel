import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppHeader, Panel, SeverityBadge, StatusBadge, Stat, bandVar } from "@/components/sentinel/ui";
import { IncidentMap } from "@/components/sentinel/IncidentMap";
import { QuickInspect, SlaChip, ageDays } from "@/components/sentinel/QuickInspect";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { CATEGORIES, CATEGORY_LABELS, categoryOf, type Category, CLASS_LABELS, STATUS_LABELS, STATUS_ORDER, linkCandidates, slaState, wardOf, type Status } from "@/lib/sentinel/model";
import { severityFor, store, useReports } from "@/lib/sentinel/store";
import { useT } from "@/lib/sentinel/i18n";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Command Center — CivicAI Sentinel" },
      { name: "description", content: "Municipal command center for citizen reports on roads, drains, water and electrical issues: live risk map, priority queue, SLA and repair verification." },
      { property: "og:title", content: "Command Center — CivicAI Sentinel" },
      { property: "og:description", content: "Detect, prioritize and verify civic repairs from citizen evidence." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});


function Dashboard() {
  const reports = useReports();
  const { t, cls, cat, status: st } = useT();
  const [filter, setFilter] = useState<Status | "ALL" | "OPEN">("OPEN");
  const [sel, setSel] = useState<string | null>(null);
  const [catF, setCatF] = useState<Category | "ALL">("ALL");

  const rows = useMemo(() => {
    if (!reports) return [];
    return reports.map((r) => ({ r, s: severityFor(r, reports), links: linkCandidates(r, reports).length }))
      .sort((a, b) => (b.s.score ?? -1) - (a.s.score ?? -1));
  }, [reports]);

  if (!reports) return <><AppHeader /><p className="p-8 text-muted-foreground">Loading demo data…</p></>;

  const shown = rows.filter(({ r }) => (catF === "ALL" || categoryOf(r) === catF) && (filter === "ALL" || (filter === "OPEN" ? r.status !== "CLOSED" : r.status === filter)));
  const open = rows.filter(({ r }) => r.status !== "CLOSED");
  const critical = open.filter(({ s }) => s.band === "Critical" || s.band === "High").length;
  const breached = open.filter(({ r, s }) => slaState(s.band, ageDays(r)).state === "breached").length;
  const pendingLinks = rows.filter((x) => x.links > 0).length;
  const selected = reports.find((r) => r.id === sel) ?? null;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-[1400px] space-y-4 px-5 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Operations · {new Date().toLocaleDateString()}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">{t("nav_command")}</h1>
            <p className="text-sm text-muted-foreground">{reports.length} citizen reports · routing and work orders are simulated.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { if (confirm("Reset all demo data to the seeded scenarios?")) store.reset(); }}>{t("reset")}</Button>
            <Button asChild className="glow"><Link to="/report">+ {t("new_report")}</Link></Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Open reports" value={open.length} onClick={() => setFilter("OPEN")} active={filter === "OPEN"} />
          <Stat label="High / critical" value={critical} tone="text-sev-high" />
          <Stat label="SLA breached" value={breached} tone={breached ? "text-sev-critical" : "text-sev-low"} />
          <Stat label="Link suggestions" value={pendingLinks} tone="text-primary" />
        </div>

        <div className="flex flex-wrap gap-2">
          {(["ALL", ...CATEGORIES] as const).map((c) => {
            const n = reports.filter((r) => r.status !== "CLOSED" && (c === "ALL" || categoryOf(r) === c)).length;
            return (
              <button key={c} onClick={() => setCatF(c)} className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${catF === c ? "border-primary bg-primary/15 text-primary glow" : "border-border text-muted-foreground hover:text-foreground"}`}>
                {c === "ALL" ? t("all") : cat(c, CATEGORY_LABELS[c])} <span className="ml-1 font-mono text-xs">{n}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STATUS_ORDER.map((s) => {
            const n = reports.filter((r) => r.status === s).length;
            return (
              <button key={s} onClick={() => setFilter(s)} className={`rounded-full border px-3 py-1 text-xs font-medium transition ${filter === s ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                {st(s, STATUS_LABELS[s])} <span className="ml-1 font-mono">{n}</span>
              </button>
            );
          })}
          <button onClick={() => setFilter("ALL")} className={`rounded-full border px-3 py-1 text-xs font-medium ${filter === "ALL" ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>{t("all")}</button>
        </div>

        <div className="grid gap-4">
          <Panel title={t("risk_map")} bodyClassName="p-0" right={<span className="text-[11px] text-muted-foreground">Click a marker to inspect · dashed ring = link suggestion</span>}>
            <IncidentMap className="h-[460px] w-full rounded-b-xl" selectedId={sel} onSelect={setSel}
              points={shown.map(({ r, s, links }) => ({ id: r.id, lat: r.lat, lng: r.lng, color: bandVar[s.band], ring: links > 0, label: `${r.id} · ${s.score ?? "—"} ${s.band} · ${STATUS_LABELS[r.status]}` }))} />
          </Panel>
        </div>

        <Panel title={t("priority_queue")} bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">{["Report", t("risk"), t("category"), t("defects"), t("ward"), t("status"), t("sla"), "Flags"].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {shown.map(({ r, s, links }) => (
                  <tr key={r.id} onClick={() => setSel(r.id)} className={`cursor-pointer border-b border-border/60 transition hover:bg-secondary/50 ${sel === r.id ? "bg-primary/10" : ""}`}>
                    <td className="px-4 py-2.5 font-mono font-semibold">{r.id}</td>
                    <td className="px-4"><SeverityBadge s={s} /></td>
                    <td className="px-4 font-medium">{cat(categoryOf(r), CATEGORY_LABELS[categoryOf(r)])}</td>
                    <td className="px-4 text-muted-foreground">{[...new Set(r.output.detections.map((d) => cls(d.cls, CLASS_LABELS[d.cls])))].join(", ") || "—"}</td>
                    <td className="px-4">{wardOf(r.lat, r.lng).name}</td>
                    <td className="px-4"><StatusBadge status={r.status} /></td>
                    <td className="px-4">{r.status === "CLOSED" ? <span className="text-xs text-muted-foreground">—</span> : <SlaChip band={s.band} ageDays={ageDays(r)} />}</td>
                    <td className="space-x-1 px-4 text-xs">
                      {r.incidentId && <span className="rounded border border-border px-1 font-mono">{r.incidentId}</span>}
                      {links > 0 && <span className="rounded bg-primary/15 px-1 text-primary">{links} {t("link_sugg")}</span>}
                      {r.status === "VERIFICATION_PENDING" && <span className="rounded bg-ai/15 px-1 text-ai">{t("needs_conf")}</span>}
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No reports in this queue.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
      </main>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent className="z-[1100] w-full overflow-y-auto border-border bg-card sm:max-w-md">
          {selected && (
            <>
              <SheetHeader><SheetTitle className="font-mono">{selected.id}</SheetTitle><SheetDescription>Quick inspection</SheetDescription></SheetHeader>
              <div className="px-4 pb-6"><QuickInspect r={selected} all={reports} /></div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
