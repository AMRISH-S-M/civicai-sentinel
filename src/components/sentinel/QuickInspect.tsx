import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { AiTag, DetectionOverlay, SeverityBadge, SeverityPanel, StatusBadge } from "./ui";
import { CATEGORY_LABELS, CLASS_LABELS, DEPARTMENTS, EXPOSURE_LABELS, categoryOf, linkCandidates, slaState, wardOf, type Exposure, type Report } from "@/lib/sentinel/model";
import { logEvent, severityFor, store } from "@/lib/sentinel/store";
import { useT } from "@/lib/sentinel/i18n";
import { cn } from "@/lib/utils";

export function SlaChip({ band, ageDays }: { band: Parameters<typeof slaState>[0]; ageDays: number }) {
  const { t } = useT();
  const s = slaState(band, ageDays);
  const tone = s.state === "breached" ? "text-sev-critical border-sev-critical/40 bg-sev-critical/10" : s.state === "at_risk" ? "text-sev-moderate border-sev-moderate/40 bg-sev-moderate/10" : "text-sev-low border-sev-low/40 bg-sev-low/10";
  return <span className={cn("rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold", tone)}>{t(s.state)} · {s.remaining >= 0 ? `${s.remaining}d left` : `${-s.remaining}d over`}</span>;
}

export const ageDays = (r: Report) => Math.floor((Date.now() - Date.parse(r.createdAt)) / 86400000);

export function QuickInspect({ r, all }: { r: Report; all: Report[] }) {
  const { t, cls, cat } = useT();
  const s = severityFor(r, all);
  const links = linkCandidates(r, all);
  const next = r.status === "SUBMITTED" || r.status === "REOPENED"
    ? { label: `Route to ${DEPARTMENTS[categoryOf(r)]}`, text: `Triaged → ${DEPARTMENTS[categoryOf(r)]} (simulated routing)`, status: "TRIAGED" as const }
    : r.status === "TRIAGED" ? { label: "Schedule inspection", text: "Inspection scheduled", status: "INSPECTION_SCHEDULED" as const } : null;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge s={s} /><StatusBadge status={r.status} />
        {r.status !== "CLOSED" && <SlaChip band={s.band} ageDays={ageDays(r)} />}
        {r.incidentId && <span className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px]">{r.incidentId}</span>}
      </div>
      <p className="text-sm text-muted-foreground"><b className="text-primary">{cat(categoryOf(r), CATEGORY_LABELS[categoryOf(r)])}</b> · {wardOf(r.lat, r.lng).name} ({wardOf(r.lat, r.lng).id}) · {r.area} · {ageDays(r)}d</p>
      <DetectionOverlay image={r.image} output={r.output} />
      <p className="text-sm">“{r.description || "—"}”</p>
      <div className="flex flex-wrap gap-1">
        {[...new Set(r.output.detections.map((d) => d.cls))].map((c) => <span key={c} className="rounded-md bg-secondary px-2 py-0.5 text-xs">{c} · {cls(c, CLASS_LABELS[c])}</span>)}
      </div>
      {links.length > 0 && (
        <div className="rounded-lg border border-primary/40 bg-primary/10 p-2.5 text-sm">
          <div className="flex items-center justify-between"><b>{links.length} {t("link_sugg")}</b><AiTag text="Suggestion" /></div>
          <p className="text-xs text-muted-foreground">{links.map((l) => `${l.other.id} (${Math.round(l.score * 100)}%, ${Math.round(l.distanceM)} m)`).join(" · ")}</p>
        </div>
      )}
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Public exposure (admin)</label>
        <select className="mt-1 w-full rounded-md border border-input bg-secondary p-2 text-sm" value={r.exposure}
          onChange={(e) => store.update(r.id, (x) => logEvent({ ...x, exposure: e.target.value as Exposure }, "admin", `Exposure set to ${EXPOSURE_LABELS[e.target.value as Exposure]}`))}>
          {Object.entries(EXPOSURE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <details className="rounded-lg border border-border p-3"><summary className="cursor-pointer text-sm font-medium">{t("severity")}</summary><div className="mt-3"><SeverityPanel s={s} /></div></details>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Latest activity</p>
        <ul className="mt-1 space-y-1 text-xs">{[...r.history].reverse().slice(0, 3).map((h, i) => <li key={i}><span className="font-mono text-muted-foreground">{new Date(h.at).toLocaleDateString()} · {h.actor}</span> — {h.text}</li>)}</ul>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        {next && <Button size="sm" onClick={() => store.update(r.id, (x) => logEvent({ ...x, status: next.status }, "admin", next.text))}>{next.label}</Button>}
        <Button size="sm" variant="secondary" asChild><Link to="/incidents/$id" params={{ id: r.id }}>{t("open_record")} →</Link></Button>
        {r.verification && <Button size="sm" variant="outline" asChild><Link to="/verification" search={{ id: r.id }}>{t("nav_lab")}</Link></Button>}
      </div>
    </div>
  );
}
