import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppHeader, AiTag, Panel, Stat, bandVar } from "@/components/sentinel/ui";
import { SlaChip, ageDays } from "@/components/sentinel/QuickInspect";
import { CATEGORIES, CATEGORY_LABELS, categoryOf, EXPOSURE_LABELS, EXPOSURE_SCORES, SLA_DAYS, WARDS, slaState, stretchPriority, wardOf, type Severity } from "@/lib/sentinel/model";
import { severityFor, useReports } from "@/lib/sentinel/store";
import { useT } from "@/lib/sentinel/i18n";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Preventive Analytics & SLA — CivicAI Sentinel" },
      { name: "description", content: "Ward-wise civic issue distribution, severity bands, repeat-damage aging and preventive risk ranking." },
      { property: "og:title", content: "Preventive Analytics & SLA — CivicAI Sentinel" },
      { property: "og:description", content: "Which locations are worsening fastest near schools and hospitals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Analytics,
});

const BANDS: Severity["band"][] = ["Critical", "High", "Moderate", "Low", "Incomplete"];
const tip = { contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)", fontSize: 12 }, cursor: { fill: "var(--secondary)" } };

function Analytics() {
  const reports = useReports();
  const { t, band, cat } = useT();
  const data = useMemo(() => {
    if (!reports) return null;
    const rows = reports.map((r) => ({ r, s: severityFor(r, reports), ward: wardOf(r.lat, r.lng) }));
    const open = rows.filter((x) => x.r.status !== "CLOSED");
    const wards = WARDS.map((w) => {
      const o: Record<string, number | string> = { ward: w.name };
      for (const b of BANDS) o[b] = open.filter((x) => x.ward.id === w.id && x.s.band === b).length;
      return o;
    });
    const cats = CATEGORIES.map((c) => ({ name: c, open: open.filter((x) => categoryOf(x.r) === c).length, critical: open.filter((x) => categoryOf(x.r) === c && (x.s.band === "Critical" || x.s.band === "High")).length }));
    const bands = BANDS.map((b) => ({ name: b, value: open.filter((x) => x.s.band === b).length })).filter((x) => x.value > 0);
    // Stretches: admin-linked incident groups, else single report.
    const groups = new Map<string, typeof rows>();
    for (const x of open) { const k = x.r.incidentId ?? x.r.id; groups.set(k, [...(groups.get(k) ?? []), x]); }
    const stretches = [...groups.entries()].map(([k, g]) => {
      const maxScore = Math.max(...g.map((x) => x.s.score ?? 0));
      const det = Math.max(...g.map((x) => x.s.factors.find((f) => f.key === "deterioration")?.value ?? 0));
      const expo = Math.max(...g.map((x) => EXPOSURE_SCORES[x.r.exposure] ?? 0));
      const top = g.reduce((a, b) => ((EXPOSURE_SCORES[b.r.exposure] ?? 0) > (EXPOSURE_SCORES[a.r.exposure] ?? 0) ? b : a));
      const oldest = Math.max(...g.map((x) => ageDays(x.r)));
      const worst = g.reduce((a, b) => ((b.s.score ?? 0) > (a.s.score ?? 0) ? b : a));
      const reasons = [CATEGORY_LABELS[categoryOf(top.r)], `Max risk ${maxScore}`, det > 0 ? `Deterioration ${det}/100` : "No prior inspection", `${EXPOSURE_LABELS[top.r.exposure]}`, `${g.length} report(s)`];
      return { key: k, area: top.r.area, ward: top.ward.name, reports: g as typeof rows, priority: stretchPriority({ maxScore, deterioration: det, exposure: expo, reports: g.length }), reasons, oldest, worst };
    }).sort((a, b) => b.priority - a.priority);
    const breached = open.filter((x) => slaState(x.s.band, ageDays(x.r)).state === "breached").length;
    const closed = rows.filter((x) => x.r.status === "CLOSED");
    return { rows, open, wards, cats, bands, stretches, breached, closed };
  }, [reports]);

  if (!reports || !data) return <><AppHeader /><p className="p-8 text-muted-foreground">Loading…</p></>;

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-[1400px] space-y-4 px-5 py-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Phase 8 · Preventive</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{t("nav_analytics")}</h1>
          <p className="text-sm text-muted-foreground">Computed live from the {reports.length} reports in this demo — no invented metrics. SLA targets are demo thresholds, not municipal standards.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Open reports" value={data.open.length} />
          <Stat label="SLA breached" value={data.breached} tone={data.breached ? "text-sev-critical" : "text-sev-low"} />
          <Stat label="Repeat-damage stretches" value={data.stretches.filter((s) => s.reports.length > 1).length} tone="text-primary" />
          <Stat label="Closed & human-confirmed" value={data.closed.filter((x) => x.r.verification?.human?.decision === "confirmed").length} tone="text-sev-low" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Panel title="Ward-wise open defects by severity band">
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={data.wards}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="ward" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                  <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} width={24} />
                  <Tooltip {...tip} />
                  {BANDS.map((b) => <Bar key={b} dataKey={b} name={band(b)} stackId="a" fill={bandVar[b]} radius={b === "Incomplete" ? [4, 4, 0, 0] : 0} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel title="Severity band breakdown (open)">
            <div className="flex flex-wrap items-center gap-4">
              <div className="h-52 w-52 shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={data.bands} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={3} stroke="none">
                      {data.bands.map((b) => <Cell key={b.name} fill={bandVar[b.name as Severity["band"]]} />)}
                    </Pie>
                    <Tooltip {...tip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1.5 text-sm">
                {data.bands.map((b) => <li key={b.name} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: bandVar[b.name as Severity["band"]] }} />{band(b.name as Severity["band"])} <span className="font-mono text-muted-foreground">{b.value}</span></li>)}
              </ul>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Bands: 0–29 Low · 30–54 Moderate · 55–74 High · 75–100 Critical.</p>
          </Panel>
        </div>

        <Panel title="Open issues by service category">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {data.cats.map((c) => (
              <div key={c.name} className="rounded-lg border border-border bg-secondary/40 p-3">
                <div className="text-sm font-medium">{cat(c.name, CATEGORY_LABELS[c.name])}</div>
                <div className="mt-1 font-mono text-2xl font-semibold">{c.open}</div>
                <div className="text-xs text-sev-high">{c.critical} high / critical</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Preventive risk ranking — locations" right={<AiTag text="Prototype heuristic" />} bodyClassName="p-0">
          <p className="px-4 pt-3 text-xs text-muted-foreground">Priority = 0.40·max risk + 0.30·deterioration + 0.20·public exposure + 0.10·repeat reports. Stretch = admin-linked incident group, or a single report.</p>
          <ol className="divide-y divide-border">
            {data.stretches.map((s, i) => (
              <li key={s.key} className="flex flex-wrap items-center gap-4 px-4 py-3">
                <span className="w-6 font-mono text-lg text-muted-foreground">{i + 1}</span>
                <div className="w-16 text-center"><div className="font-mono text-2xl font-semibold text-primary">{s.priority}</div><div className="text-[10px] uppercase text-muted-foreground">priority</div></div>
                <div className="min-w-0 flex-1">
                  <Link to="/incidents/$id" params={{ id: s.worst.r.id }} className="font-semibold hover:text-primary">{s.area}</Link>
                  <span className="ml-2 font-mono text-xs text-muted-foreground">{s.key} · {s.ward}</span>
                  <div className="mt-1 flex flex-wrap gap-1">{s.reasons.map((r) => <span key={r} className="rounded bg-secondary px-1.5 py-0.5 text-[11px]">{r}</span>)}</div>
                </div>
                <div className="h-2 w-40 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-primary/50 to-primary" style={{ width: `${s.priority}%` }} /></div>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="Repeat-damage aging & SLA tracker" bodyClassName="p-0">
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground"><tr className="border-b border-border">{["Stretch", "Reports", "Oldest open", "Worst band", "SLA target", "SLA"].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {[...data.stretches].sort((a, b) => b.oldest - a.oldest).map((s) => (
                <tr key={s.key} className="border-b border-border/60">
                  <td className="px-4 py-2.5">{s.area} <span className="font-mono text-xs text-muted-foreground">{s.key}</span></td>
                  <td className="px-4">{s.reports.length > 1 ? <span className="font-semibold text-sev-high">{s.reports.length} · repeat</span> : 1}</td>
                  <td className="px-4 font-mono">{s.oldest}d <AgeBar d={s.oldest} /></td>
                  <td className="px-4" style={{ color: bandVar[s.worst.s.band] }}>{band(s.worst.s.band)}</td>
                  <td className="px-4 font-mono text-xs">{SLA_DAYS[s.worst.s.band]}d</td>
                  <td className="px-4"><SlaChip band={s.worst.s.band} ageDays={s.oldest} /></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </Panel>
      </main>
    </div>
  );
}

function AgeBar({ d }: { d: number }) {
  return <span className="ml-2 inline-block h-1.5 w-20 overflow-hidden rounded-full bg-muted align-middle"><span className="block h-full bg-sev-high" style={{ width: `${Math.min(100, (d / 30) * 100)}%` }} /></span>;
}
