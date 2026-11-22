import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader, AiTag, DetectionOverlay, Panel, StatusBadge } from "@/components/sentinel/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { UploadError, AFTER_SAMPLES, demoPredictFromBytes, predictImage, fileToDataUrl, meanLuminance } from "@/lib/sentinel/images";
import { CLASS_LABELS, categoryOf, VERIFICATION_COPY, diffDetections, haversineM, visibleArea, type Report } from "@/lib/sentinel/model";
import { signOff, submitAfterPhoto, useReports } from "@/lib/sentinel/store";
import { useT } from "@/lib/sentinel/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/verification")({
  validateSearch: (s: Record<string, unknown>): { id?: string } => (typeof s["id"] === "string" ? { id: s["id"] } : {}),
  head: () => ({
    meta: [
      { title: "Verification Lab — CivicAI Sentinel" },
      { name: "description", content: "Before/after repair comparison with defect diffing, image quality checks and human sign-off." },
      { property: "og:title", content: "Verification Lab — CivicAI Sentinel" },
      { property: "og:description", content: "Compare repair evidence and confirm outcomes with a human in the loop." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Lab,
});

const inLab = (r: Report) => !!r.verification || r.status === "REPAIR_IN_PROGRESS";

function Lab() {
  const reports = useReports();
  const { id } = Route.useSearch();
  const navigate = useNavigate({ from: "/verification" });
  const { t, ver } = useT();
  if (!reports) return <><AppHeader /><p className="p-8 text-muted-foreground">Loading…</p></>;
  const cases = reports.filter(inLab).sort((a, b) => Number(b.status === "VERIFICATION_PENDING") - Number(a.status === "VERIFICATION_PENDING"));
  const r = cases.find((c) => c.id === id) ?? cases[0];

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto grid max-w-[1400px] gap-4 px-5 py-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Signature feature</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{t("nav_lab")}</h1>
          </div>
          <Panel title="Cases" bodyClassName="p-2">
            <ul className="space-y-1">
              {cases.map((c) => (
                <li key={c.id}>
                  <button onClick={() => void navigate({ search: { id: c.id } })} className={cn("w-full rounded-lg border p-2 text-left transition", c.id === r?.id ? "border-primary/60 bg-primary/10" : "border-transparent hover:bg-secondary")}>
                    <div className="flex items-center justify-between"><span className="font-mono text-sm font-semibold">{c.id}</span>
                      {c.verification && <span className={cn("text-[10px] font-semibold", resTone(c.verification.result))}>{ver(c.verification.result, VERIFICATION_COPY[c.verification.result].label)}</span>}</div>
                    <div className="truncate text-xs text-muted-foreground">{c.area}</div>
                    <div className="mt-1"><StatusBadge status={c.status} /></div>
                  </button>
                </li>
              ))}
              {cases.length === 0 && <li className="p-2 text-sm text-muted-foreground">No repairs awaiting verification.</li>}
            </ul>
          </Panel>
        </div>
        {r ? <Inspector key={r.id + (r.verification?.capturedAt ?? "")} r={r} /> : <div />}
      </main>
    </div>
  );
}

const resTone = (v: string) => v === "APPEARS_IMPROVED" ? "text-sev-low" : v === "DAMAGE_STILL_VISIBLE" ? "text-sev-critical" : "text-sev-moderate";

function Inspector({ r }: { r: Report }) {
  const { t, ver, cls } = useT();
  const [err, setErr] = useState<string | null>(null);
  const [comparable, setComparable] = useState(true);
  const [mode, setMode] = useState<"side" | "wipe">("side");
  const [wipe, setWipe] = useState([50]);
  const [lum, setLum] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [actor, setActor] = useState<"inspector" | "citizen">("inspector");
  const [busy, setBusy] = useState(false);
  const v = r.verification;
  useEffect(() => { if (v) void meanLuminance(v.afterImage).then(setLum).catch(() => setLum(null)); }, [v]);

  const upload = async (img: string, out: Parameters<typeof submitAfterPhoto>[2], sameLoc = true) => { setBusy(true); setErr(null); try { await submitAfterPhoto(r, img, out, sameLoc, comparable); } catch { setErr(t("unreadable_image")); } finally { setBusy(false); } };
  const canResubmit = !v || !v.human;

  const diff = v ? diffDetections(r.output.detections, v.afterOutput.detections) : null;
  const dist = v && v.afterLat != null && v.afterLng != null ? haversineM(r.lat, r.lng, v.afterLat, v.afterLng) : null;
  const checks = v ? [
    { label: "Exposure / brightness", ok: lum == null ? null : lum >= 45 && lum <= 235, detail: lum == null ? "measuring…" : `mean luminance ${Math.round(lum)} (45–235 required)` },
    { label: "Capture order", ok: Date.parse(v.capturedAt) > Date.parse(r.createdAt), detail: `after photo ${new Date(v.capturedAt).toLocaleDateString()} vs report ${new Date(r.createdAt).toLocaleDateString()}` },
    { label: "Location proximity", ok: dist == null ? null : dist <= 50, detail: dist == null ? "no location metadata — signal only, not proof" : `${Math.round(dist)} m from original (≤ 50 m)` },
    { label: "Same detector on both", ok: v.afterOutput.model === r.output.model, detail: v.afterOutput.model },
  ] : [];

  return (
    <div className="space-y-4">
      <Panel title={<>Comparison inspector · <Link to="/incidents/$id" params={{ id: r.id }} className="font-mono normal-case text-foreground hover:text-primary">{r.id}</Link></>}
        right={v && <div className="flex rounded-md border border-border p-0.5 text-xs">{(["side", "wipe"] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={cn("rounded px-2 py-0.5", mode === m && "bg-secondary")}>{m === "side" ? "Side by side" : "Wipe"}</button>)}</div>}>
        {!v ? <p className="text-sm text-muted-foreground">Repair in progress — upload the completion photo below to run the comparison.</p>
          : mode === "side" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div><Lbl>Before · {new Date(r.createdAt).toLocaleDateString()}</Lbl><DetectionOverlay image={r.image} output={r.output} dim={(i) => diff?.beforeState[i] === "resolved" ? "gone" : undefined} /></div>
              <div><Lbl>After · {new Date(v.capturedAt).toLocaleDateString()}</Lbl><DetectionOverlay image={v.afterImage} output={v.afterOutput} dim={(i) => diff?.afterState[i] === "new" ? "new" : undefined} /></div>
            </div>
          ) : (
            <div>
              <div className="relative overflow-hidden rounded-xl border border-border">
                <img src={v.afterImage} alt="After" className="block w-full" />
                <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - (wipe[0] ?? 50)}% 0 0)` }}><img src={r.image} alt="Before" className="h-full w-full object-cover" /></div>
                <div className="absolute inset-y-0 w-0.5 bg-primary glow" style={{ left: `${wipe[0]}%` }} />
                <span className="absolute left-2 top-2 rounded bg-background/80 px-2 py-0.5 text-xs">Before</span><span className="absolute right-2 top-2 rounded bg-background/80 px-2 py-0.5 text-xs">After</span>
              </div>
              <Slider aria-label="Before after wipe" value={wipe} onValueChange={setWipe} max={100} step={1} className="mt-3" />
              <p className="mt-1 text-[11px] text-muted-foreground">Visual wipe only — images are not pixel-registered in this prototype, so no pixel-difference claim is made.</p>
            </div>
          )}
      </Panel>

      {v && diff && (
        <div className="grid gap-4 md:grid-cols-2">
          <Panel title="Defect diff" right={<AiTag />}>
            <ul className="space-y-1.5 text-sm">
              {r.output.detections.map((d, i) => (
                <li key={`b${i}`} className="flex items-center justify-between rounded-md bg-secondary/60 px-2 py-1.5">
                  <span>{d.cls} {cls(d.cls, CLASS_LABELS[d.cls])}</span>
                  <span className={cn("font-mono text-xs font-semibold", diff.beforeState[i] === "resolved" ? "text-sev-low" : "text-sev-critical")}>{diff.beforeState[i] === "resolved" ? "✓ not detected after" : "● still detected"}</span>
                </li>
              ))}
              {v.afterOutput.detections.map((d, i) => diff.afterState[i] === "new" && (
                <li key={`a${i}`} className="flex items-center justify-between rounded-md bg-sev-critical/10 px-2 py-1.5"><span>{d.cls} {cls(d.cls, CLASS_LABELS[d.cls])}</span><span className="font-mono text-xs font-semibold text-sev-critical">+ new in after</span></li>
              ))}
            </ul>
            <p className="mt-3 font-mono text-xs text-muted-foreground">Visible region {(visibleArea(r.output.detections) * 100).toFixed(1)}% → {(visibleArea(v.afterOutput.detections) * 100).toFixed(1)}%</p>
          </Panel>
          <Panel title="Quality checks">
            <ul className="space-y-2 text-sm">
              {checks.map((c) => (
                <li key={c.label} className="flex gap-2">
                  <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold", c.ok == null ? "bg-sev-moderate/20 text-sev-moderate" : c.ok ? "bg-sev-low/20 text-sev-low" : "bg-sev-critical/20 text-sev-critical")}>{c.ok == null ? "?" : c.ok ? "✓" : "✕"}</span>
                  <div><div className="font-medium">{c.label}</div><div className="text-xs text-muted-foreground">{c.detail}</div></div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      {v && (
        <Panel title="Assessment & human sign-off">
          <div className={cn("rounded-xl border-2 p-4", v.result === "APPEARS_IMPROVED" ? "border-sev-low/60 bg-sev-low/5" : v.result === "DAMAGE_STILL_VISIBLE" ? "border-sev-critical/60 bg-sev-critical/5" : "border-sev-moderate/60 bg-sev-moderate/5")}>
            <div className="flex items-center justify-between"><p className={cn("text-xl font-bold", resTone(v.result))}>{ver(v.result, VERIFICATION_COPY[v.result].label)}</p><AiTag /></div>
            <p className="mt-1 text-sm">{VERIFICATION_COPY[v.result].ui}</p>
            <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">{v.reasons.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
          {v.human ? (
            <p className="mt-3 text-sm">Signed off: <b className={v.human.decision === "confirmed" ? "text-sev-low" : "text-sev-critical"}>{v.human.decision === "confirmed" ? "Repair confirmed — closed" : "Disputed — reopened"}</b>{v.human.note ? ` · “${v.human.note}”` : ""} · {new Date(v.human.at).toLocaleString()}</p>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select value={actor} onChange={(e) => setActor(e.target.value as "inspector" | "citizen")} className="h-9 rounded-md border border-input bg-secondary px-2 text-sm">
                <option value="inspector">Reviewer: Inspector</option><option value="citizen">Reviewer: Citizen</option>
              </select>
              <Input placeholder="Sign-off note (optional)" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} className="h-9 max-w-xs" />
              <Button className="bg-sev-low text-primary-foreground hover:bg-sev-low/85" onClick={() => signOff(r.id, "confirmed", actor, note)}>Confirm repair & close</Button>
              <Button variant="destructive" onClick={() => signOff(r.id, "disputed", actor, note)}>Dispute & reopen</Button>
            </div>
          )}
        </Panel>
      )}

      {canResubmit && (
        <Panel title={v ? "Replace follow-up photo" : "Upload completion photo"}>
          <label className="mb-3 flex items-center gap-2 text-sm"><Checkbox checked={comparable} onCheckedChange={(v) => setComparable(v === true)} />Comparable viewpoint and subject (reviewer assessment)</label>
          {err && <p role="alert" className="mb-2 text-sm text-destructive">{err}</p>}
          <Input type="file" accept="image/*" disabled={busy} onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const url = await fileToDataUrl(f); await upload(url, await predictImage(url, categoryOf(r))); } catch (e) { setErr(t(e instanceof UploadError ? e.code : "unreadable_image")); } }} />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Object.values(AFTER_SAMPLES).filter(() => categoryOf(r) === "road").map((s) => (
              <button key={s.id} disabled={busy} onClick={() => void upload(s.image, s.output)} className="group overflow-hidden rounded-lg border border-border text-left transition hover:border-primary/60">
                <img src={s.image} alt="" className="h-20 w-full object-cover" /><span className="block px-2 py-1 text-xs">{s.label}</span>
              </button>
            ))}
            {categoryOf(r) === "road" && <button disabled={busy} onClick={() => void upload(AFTER_SAMPLES.repaired.image, AFTER_SAMPLES.repaired.output, false)} className="overflow-hidden rounded-lg border border-border text-left hover:border-primary/60">
              <img src={AFTER_SAMPLES.repaired.image} alt="" className="h-20 w-full object-cover" /><span className="block px-2 py-1 text-xs">Patched · no location data</span>
            </button>}
          </div>
        </Panel>
      )}
    </div>
  );
}

const Lbl = ({ children }: { children: React.ReactNode }) => <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>;
