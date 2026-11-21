import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { CLASS_LABELS, STATUS_LABELS, type ModelOutput, type Severity, type Status } from "@/lib/sentinel/model";
import { Button } from "@/components/ui/button";
import { setLang, useT } from "@/lib/sentinel/i18n";
import { useSyncStatus } from "@/lib/sentinel/store";
import { signOut, useAuth } from "@/hooks/use-auth";

export function LangToggle() {
  const { lang } = useT();
  return (
    <div className="flex rounded-full border border-border bg-secondary/60 p-0.5 text-xs font-semibold" role="group" aria-label="Language">
      {(["en", "ta"] as const).map((l) => (
        <Button variant="ghost" size="sm" key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
          className={cn("h-7 rounded-full px-3 py-1 text-xs transition", lang === l ? "bg-primary text-primary-foreground glow" : "text-muted-foreground hover:text-foreground")}>
          {l === "en" ? "English" : "தமிழ்"}
        </Button>
      ))}
    </div>
  );
}

function SyncChip() {
  const s = useSyncStatus();
  if (s === "local") return null;
  const label = s === "live" ? "Shared database · live" : "Offline · this device only";
  return <span role="status" className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:inline-flex">
    <span className={cn("h-1.5 w-1.5 rounded-full", s === "live" ? "bg-primary" : "bg-destructive")} />{label}</span>;
}

function AccountButton() {
  const { ready, user } = useAuth();
  if (!ready) return null;
  if (!user) return <Link to="/auth" className="rounded-md border border-border px-3 py-1 text-sm hover:border-primary">Staff sign in</Link>;
  return <span className="flex items-center gap-2"><span className="hidden max-w-[160px] truncate text-xs text-muted-foreground lg:inline">{user.email}</span>
    <Button size="sm" variant="outline" onClick={() => void signOut().then(() => { window.location.replace("/auth"); })}>Sign out</Button></span>;
}

export function AppHeader() {
  const { t } = useT();
  const { isStaff, isAdmin } = useAuth();
  const staffNav = [
    { to: "/" as const, label: t("nav_command"), exact: true },
    { to: "/analytics" as const, label: t("nav_analytics") },
    { to: "/verification" as const, label: t("nav_lab") },
    { to: "/field" as const, label: t("nav_field") },
  ];
  const nav = [
    ...(isStaff ? staffNav : []),
    { to: "/report" as const, label: t("nav_report") },
    { to: "/track" as const, label: t("nav_track") },
    ...(isAdmin ? [{ to: "/team" as const, label: "Team" }] : []),
  ];
  return (
    <header className="sticky top-0 z-[1000] border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="relative grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary glow">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3Z" /><path d="m9 12 2 2 4-4" /></svg>
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-bold tracking-tight">CivicAI Sentinel</span>
            <span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Greater Chennai · Civic services</span>
          </span>
        </Link>
        <nav aria-label="Main navigation" className="order-3 flex w-full gap-1 overflow-x-auto text-sm font-medium xl:order-none xl:w-auto">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: "exact" in n && !!n.exact }}
              className="shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground shadow-[inset_0_-2px_0_var(--primary)]" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <SyncChip />
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden items-center gap-2 rounded-full border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground md:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-sev-moderate text-sev-moderate pulse-dot" />{t("demo_mode")}
          </span>
          <LangToggle />
          <AccountButton />
        </div>
      </div>
    </header>
  );
}

const bandCls: Record<Severity["band"], string> = {
  Low: "text-sev-low border-sev-low/40 bg-sev-low/10",
  Moderate: "text-sev-moderate border-sev-moderate/40 bg-sev-moderate/10",
  High: "text-sev-high border-sev-high/40 bg-sev-high/10",
  Critical: "text-sev-critical border-sev-critical/50 bg-sev-critical/15",
  Incomplete: "text-muted-foreground border-dashed border-muted-foreground/50 bg-transparent",
};
export function SeverityBadge({ s, className }: { s: Severity; className?: string }) {
  const { band } = useT();
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold", bandCls[s.band], className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full bg-current", s.band === "Critical" && "pulse-dot")} />
      <span className="font-mono">{s.score ?? "—"}</span>{band(s.band)}
    </span>
  );
}
export const bandVar: Record<Severity["band"], string> = {
  Low: "var(--sev-low)", Moderate: "var(--sev-moderate)", High: "var(--sev-high)", Critical: "var(--sev-critical)", Incomplete: "var(--muted-foreground)",
};

const statusTone: Partial<Record<Status, string>> = {
  SUBMITTED: "text-ai", TRIAGED: "text-primary", REPAIR_IN_PROGRESS: "text-sev-moderate", VERIFICATION_PENDING: "text-sev-high", CLOSED: "text-sev-low", REOPENED: "text-sev-critical",
};
export function StatusBadge({ status }: { status: Status }) {
  const { status: st } = useT();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-2 py-0.5 text-xs font-medium">
      <span className={cn("h-1.5 w-1.5 rounded-full bg-current", statusTone[status] ?? "text-muted-foreground", status === "VERIFICATION_PENDING" && "pulse-dot")} />
      {st(status, STATUS_LABELS[status])}
    </span>
  );
}

export function AiTag({ text = "Model-generated · advisory" }: { text?: string }) {
  return <span className="inline-flex items-center gap-1 rounded-md border border-ai/30 bg-ai/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ai">◆ {text}</span>;
}

export function DetectionOverlay({ image, output, className, compact, dim }: { image: string; output: ModelOutput; className?: string; compact?: boolean; dim?: (i: number) => "ok" | "gone" | "new" | undefined }) {
  const { t, cls } = useT();
  return (
    <figure className={cn("overflow-hidden rounded-xl border border-border bg-surface", className)}>
      <div className="relative">
        <img src={image} alt="Citizen photo evidence" className="block w-full" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
        {output.detections.map((d, i) => {
          const tone = dim?.(i);
          return (
            <div key={i} className={cn("absolute rounded-sm border-2", tone === "gone" ? "border-sev-low" : tone === "new" ? "border-sev-critical" : "border-primary")}
              style={{ left: `${d.box.x * 100}%`, top: `${d.box.y * 100}%`, width: `${d.box.w * 100}%`, height: `${d.box.h * 100}%`, boxShadow: "0 0 18px -2px currentColor, inset 0 0 24px -8px currentColor", color: tone === "gone" ? "var(--sev-low)" : tone === "new" ? "var(--sev-critical)" : "var(--primary)" }}>
              <span style={{ maxWidth: `${(1 - d.box.x) / Math.max(d.box.w, 0.01) * 100}%` }} className={cn("absolute left-0 top-0 -translate-y-full break-words rounded-t-sm bg-primary px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary-foreground", d.box.y < 0.06 && "translate-y-0 rounded-b-sm rounded-t-none")}>
                {d.cls} {cls(d.cls, CLASS_LABELS[d.cls])} · {d.confidence.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
      {!compact && (
        <figcaption className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
          <AiTag text={output.isDemo ? t("demo_pred") : "Model output"} />
          <span className="font-mono">{output.model}</span>
          <span className="ml-auto">{output.detections.length} {t("detections")}</span>
          {output.detections.length === 0 && <span className="basis-full">{t("no_detections")}</span>}
        </figcaption>
      )}
    </figure>
  );
}

export function SeverityPanel({ s }: { s: Severity }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SeverityBadge s={s} className="px-3 py-1 text-base" />
        <AiTag text="Prototype risk score" />
      </div>
      <p className="text-xs text-muted-foreground">Prototype Risk Score — not an official engineering assessment. Risk = 0.35·Damage + 0.20·Size + 0.20·Exposure + 0.15·Recurrence + 0.10·Deterioration.</p>
      {s.missing.length > 0 && <p className="rounded-md border border-dashed border-sev-critical/60 bg-sev-critical/10 p-2 text-xs text-sev-critical">Missing: {s.missing.join(", ")}. No score is fabricated.</p>}
      <ul className="space-y-2.5">
        {s.factors.map((f) => (
          <li key={f.key} className="text-sm">
            <div className="flex justify-between font-medium">
              <span>{f.label} <span className="font-mono text-xs text-muted-foreground">×{f.weight.toFixed(2)}</span></span>
              <span className="font-mono text-xs"><span className="text-muted-foreground">{f.value ?? "—"} →</span> <span className="text-primary">+{f.contribution}</span></span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary" style={{ width: `${f.value ?? 0}%` }} /></div>
            <p className="mt-0.5 text-xs text-muted-foreground">{f.reason}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Panel({ title, children, right, className, bodyClassName }: { title: React.ReactNode; children: React.ReactNode; right?: React.ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("glass min-w-0 rounded-xl", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h2>{right}
      </div>
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, tone, sub, onClick, active }: { label: string; value: React.ReactNode; tone?: string; sub?: string; onClick?: () => void; active?: boolean }) {
  const content = <>
    <div className={cn("font-mono text-2xl font-semibold", tone)}>{value}</div>
    <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
    {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
  </>;
  return onClick ? <Button variant="ghost" onClick={onClick} className={cn("glass h-auto flex-col items-start rounded-xl p-3 text-left", active && "border-primary/70 glow")}>{content}</Button> : <div className="glass rounded-xl p-3">{content}</div>;
}
