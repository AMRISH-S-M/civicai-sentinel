import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader, DetectionOverlay, Panel, StatusBadge } from "@/components/sentinel/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORY_LABELS, DEPARTMENTS, TRACK_STEPS, VERIFICATION_COPY, categoryOf, trackStep } from "@/lib/sentinel/model";
import { citizenSignOff, fetchTicket, myTickets } from "@/lib/sentinel/store";
import type { Report } from "@/lib/sentinel/model";
import { useT } from "@/lib/sentinel/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/track")({
  validateSearch: (s: Record<string, unknown>): { id?: string; new?: boolean } => ({
    ...(typeof s["id"] === "string" && { id: s["id"] }),
    ...(s["new"] === true && { new: true }),
  }),
  head: () => ({
    meta: [
      { title: "Track Your Complaint — CivicAI Sentinel" },
      { name: "description", content: "Check the status of your civic complaint, see the assigned department and confirm the repair." },
      { property: "og:title", content: "Track Your Complaint — CivicAI Sentinel" },
      { property: "og:description", content: "Citizen ticket tracker for road, drainage, water and electrical repairs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Track,
});

const STEPS_TA = ["பெறப்பட்டது", "ஒதுக்கப்பட்டது", "ஆய்வு", "பழுதுபார்ப்பு", "சரிபார்ப்பு", "தீர்க்கப்பட்டது"];

function Track() {
  const { id, new: isNew } = Route.useSearch();
  const navigate = useNavigate({ from: "/track" });
  const { t, lang, cat, ver } = useT();
  const [q, setQ] = useState(id ?? "");
  const [mine, setMine] = useState<string[]>([]);
  const [note, setNote] = useState("");
  useEffect(() => setMine(myTickets()), []);
  useEffect(() => setQ(id ?? ""), [id]);
  // undefined = loading, null = not found
  const [r, setR] = useState<Report | null | undefined>(undefined);
  const [actErr, setActErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!id) { setR(undefined); return; }
    let live = true;
    setR(undefined);
    fetchTicket(id).then((x) => { if (live) setR(x); }).catch(() => { if (live) setR(null); });
    return () => { live = false; };
  }, [id]);
  async function act(decision: "confirmed" | "disputed" | "reopen") {
    if (!r) return;
    setBusy(true); setActErr(null);
    try { await citizenSignOff(r.id, decision, note); setR(await fetchTicket(r.id)); }
    catch { setActErr("That didn't go through — refresh the ticket and try again."); }
    finally { setBusy(false); }
  }
  const step = r ? trackStep(r.status) : 0;
  const steps = lang === "ta" ? STEPS_TA : TRACK_STEPS;
  // Citizens see public updates only, not internal admin notes about exposure/linking.
  const updates = r ? r.history.filter((h) => !/^Exposure set|^Rejected link|^Unlinked/.test(h.text)) : [];

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-4xl space-y-4 px-5 py-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Citizen · {t("nav_track")}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{t("track_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("track_sub")}</p>
        </div>

        {isNew && r && (
          <div className="glass glow rounded-xl border-primary/50 p-4">
            <p className="text-sm">{t("submitted_ok")}</p>
            <p className="mt-1 font-mono text-3xl font-semibold text-primary">{r.id}</p>
          </div>
        )}

        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = q.trim().toUpperCase(); if (v) void navigate({ search: { id: v } }); }}>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`${t("ticket_no")} — e.g. RPT-1005`} maxLength={20} className="h-11 font-mono" aria-label={t("ticket_no")} />
          <Button type="submit" className="h-11 shrink-0 px-6 glow">{t("find")}</Button>
        </form>
        {mine.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{t("my_tickets")}:
            {mine.map((m) => <Link key={m} to="/track" search={{ id: m }} className="rounded-md border border-border px-2 py-0.5 font-mono text-foreground hover:border-primary">{m}</Link>)}
          </div>
        )}
        {!id && <p className="text-xs text-muted-foreground">Demo tickets: {["RPT-1004", "RPT-1005", "RPT-1010", "RPT-1007"].map((d) => <Link key={d} to="/track" search={{ id: d }} className="mr-2 font-mono text-primary hover:underline">{d}</Link>)}</p>}

        {id && r === null && <p className="rounded-lg border border-sev-critical/40 bg-sev-critical/10 p-3 text-sm text-sev-critical">{t("not_found")}</p>}

        {r && (
          <>
            <Panel title={<span className="font-mono normal-case text-foreground">{r.id}</span>} right={<StatusBadge status={r.status} />}>
              <div className="grid gap-4 sm:grid-cols-3">
                <Info k={t("category")} v={cat(categoryOf(r), CATEGORY_LABELS[categoryOf(r)])} />
                <Info k={t("assigned_to")} v={step >= 1 ? DEPARTMENTS[categoryOf(r)] : "—"} />
                <Info k={t("crew")} v={r.workOrder ? `${r.workOrder.team} · ${t("due")} ${new Date(r.workOrder.due).toLocaleDateString()}` : "—"} />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{r.area} · {new Date(r.createdAt).toLocaleDateString()}</p>
              <ol className="mt-5 grid grid-cols-3 gap-x-2 gap-y-3 sm:grid-cols-6 sm:gap-1" aria-label={t("progress")}>
                {steps.map((s, i) => (
                  <li key={s} className="min-w-0 break-words text-center">
                    <div className={cn("h-1.5 rounded-full", i <= step ? "bg-primary" : "bg-muted", i === step && r.status !== "CLOSED" && "glow")} />
                    <span className={cn("mt-1.5 block text-[11px]", i <= step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
                  </li>
                ))}
              </ol>
              {r.status === "REOPENED" && <p className="mt-3 text-sm text-sev-high">Reopened — the department has been asked to look again.</p>}
            </Panel>

            <div className="grid gap-4 md:grid-cols-2">
              <Panel title={t("updates")}>
                <ol className="space-y-2.5 border-l-2 border-primary/40 pl-3">
                  {[...updates].reverse().map((h, i) => <li key={i} className="text-sm"><span className="font-mono text-[11px] text-muted-foreground">{new Date(h.at).toLocaleString()}</span><br />{h.text}</li>)}
                </ol>
              </Panel>
              <Panel title={t("repair_evidence")}>
                {r.verification ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <DetectionOverlay compact image={r.image} output={r.output} />
                      <DetectionOverlay compact image={r.verification.afterImage} output={r.verification.afterOutput} />
                    </div>
                    <p className="text-sm"><b>{ver(r.verification.result, VERIFICATION_COPY[r.verification.result].label)}</b> <span className="text-xs text-muted-foreground">(AI suggestion — needs a person to confirm)</span></p>
                    {r.status === "VERIFICATION_PENDING" && !r.verification.human ? (
                      <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
                        <p className="text-sm font-medium">{t("your_check")}</p>
                        <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Optional comment" />
                        <div className="flex flex-wrap gap-2">
                          <Button className="bg-sev-low text-primary-foreground hover:bg-sev-low/85" disabled={busy} onClick={() => void act("confirmed")}>{t("yes_fixed")}</Button>
                          <Button variant="destructive" disabled={busy} onClick={() => void act("disputed")}>{t("not_fixed")}</Button>
                        </div>
                      </div>
                    ) : r.verification.human ? <p className="text-sm text-sev-low">{t("thanks")}</p> : null}
                  </div>
                ) : <div className="space-y-2"><DetectionOverlay compact image={r.image} output={r.output} /><p className="text-xs text-muted-foreground">The repair photo will appear here once the crew uploads it.</p></div>}
                {actErr && <p role="alert" className="mt-2 text-sm text-destructive">{actErr}</p>}
                {r.status === "CLOSED" && <Button variant="outline" size="sm" className="mt-3" disabled={busy} onClick={() => void act("reopen")}>{t("reopen")}</Button>}
              </Panel>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const Info = ({ k, v }: { k: string; v: string }) => (
  <div><div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{k}</div><div className="mt-0.5 text-sm font-medium">{v}</div></div>
);
