import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { CLASS_LABELS, STATUS_LABELS, type ModelOutput, type Severity, type Status } from "@/lib/sentinel/model";

export function AppHeader() {
  return (
    <header className="border-b-4 border-accent bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-sm bg-accent font-mono text-sm font-bold text-accent-foreground">CS</span>
          <span className="text-lg font-black uppercase tracking-tight">CivicAI Sentinel</span>
        </Link>
        <nav className="flex gap-4 text-sm font-semibold">
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "text-accent" }}>Triage dashboard</Link>
          <Link to="/report" activeProps={{ className: "text-accent" }}>Citizen report</Link>
        </nav>
        <span className="ml-auto rounded-sm border border-accent/60 px-2 py-0.5 font-mono text-[11px] uppercase text-accent">Local demo mode · seeded data</span>
      </div>
    </header>
  );
}

const bandCls: Record<Severity["band"], string> = {
  Low: "bg-sev-low text-primary",
  Moderate: "bg-sev-moderate text-primary",
  High: "bg-sev-high text-primary",
  Critical: "bg-sev-critical text-primary-foreground",
  Incomplete: "bg-muted text-muted-foreground border border-dashed border-muted-foreground",
};
export function SeverityBadge({ s, className }: { s: Severity; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-sm px-2 py-0.5 font-mono text-xs font-bold", bandCls[s.band], className)}>
      {s.score ?? "—"} <span className="font-sans font-semibold">{s.band === "Incomplete" ? "Incomplete assessment" : s.band}</span>
    </span>
  );
}
export const bandVar: Record<Severity["band"], string> = {
  Low: "var(--sev-low)", Moderate: "var(--sev-moderate)", High: "var(--sev-high)", Critical: "var(--sev-critical)", Incomplete: "var(--muted-foreground)",
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className="rounded-sm border border-border bg-secondary px-2 py-0.5 text-xs font-semibold">{STATUS_LABELS[status]}</span>;
}

export function AiTag({ text = "Model-generated · advisory" }: { text?: string }) {
  return <span className="rounded-sm bg-ai/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-ai">{text}</span>;
}

export function DetectionOverlay({ image, output, className }: { image: string; output: ModelOutput; className?: string }) {
  return (
    <figure className={cn("overflow-hidden rounded-sm border border-border bg-card", className)}>
      <div className="relative">
        <img src={image} alt="Road evidence" className="block w-full" />
        {output.detections.map((d, i) => (
          <div key={i} className="absolute border-2 border-accent" style={{ left: `${d.box.x * 100}%`, top: `${d.box.y * 100}%`, width: `${d.box.w * 100}%`, height: `${d.box.h * 100}%` }}>
            <span className="absolute -top-5 left-0 whitespace-nowrap bg-accent px-1 font-mono text-[10px] font-bold text-accent-foreground">
              {d.cls} {CLASS_LABELS[d.cls]} · {d.confidence.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      <figcaption className="flex flex-wrap items-center gap-2 border-t border-border px-2 py-1.5 text-xs text-muted-foreground">
        <AiTag text={output.isDemo ? "Demo prediction — not live inference" : "Model output"} />
        <span className="font-mono">{output.model}</span>
        <span>{output.detections.length} detection(s)</span>
      </figcaption>
    </figure>
  );
}

export function SeverityPanel({ s }: { s: Severity }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SeverityBadge s={s} className="text-base" />
        <AiTag text="Prototype risk score" />
      </div>
      <p className="text-xs text-muted-foreground">Prototype Risk Score — not an official engineering assessment. Risk = 0.35·Damage + 0.20·Size + 0.20·Exposure + 0.15·Recurrence + 0.10·Deterioration.</p>
      {s.missing.length > 0 && <p className="rounded-sm border border-dashed border-destructive p-2 text-xs text-destructive">Missing: {s.missing.join(", ")}. No score is fabricated.</p>}
      <ul className="space-y-2">
        {s.factors.map((f) => (
          <li key={f.key} className="text-sm">
            <div className="flex justify-between font-semibold">
              <span>{f.label} <span className="font-mono text-xs text-muted-foreground">×{f.weight.toFixed(2)}</span></span>
              <span className="font-mono">{f.value ?? "—"} → +{f.contribution}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${f.value ?? 0}%` }} /></div>
            <p className="mt-0.5 text-xs text-muted-foreground">{f.reason}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Panel({ title, children, right, className }: { title: string; children: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-sm border border-border bg-card", className)}>
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 className="text-xs font-black uppercase tracking-wider">{title}</h2>{right}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}
