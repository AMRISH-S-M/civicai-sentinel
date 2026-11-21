import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader, DetectionOverlay, Panel } from "@/components/sentinel/ui";
import { IncidentMap } from "@/components/sentinel/IncidentMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SAMPLES, UploadError, demoPredictFromBytes, fileToDataUrl } from "@/lib/sentinel/images";
import { CATEGORIES, CATEGORY_LABELS, type Category, type ModelOutput } from "@/lib/sentinel/model";
import { rememberTicket, store } from "@/lib/sentinel/store";
import { useT } from "@/lib/sentinel/i18n";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report a Civic Problem — CivicAI Sentinel" },
      { name: "description", content: "Report potholes, drain overflows, water pipe leaks or electric pole and wire hazards with a photo, location and consent." },
      { property: "og:title", content: "Report a Civic Problem — CivicAI Sentinel" },
      { property: "og:description", content: "Citizen evidence intake for roads, drainage, water and electrical issues." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportPage,
});

const CAT_ICON: Record<Category, string> = { road: "🛣️", drainage: "🌊", water: "🚰", electrical: "⚡" };

const PRESETS = [
  { label: "Anna Nagar 2nd Ave (school)", lat: 13.08522, lng: 80.21005 },
  { label: "Greams Rd (hospital)", lat: 13.06405, lng: 80.24935 },
  { label: "T. Nagar, Usman Rd", lat: 13.04121, lng: 80.23395 },
];

function ReportPage() {
  const navigate = useNavigate();
  const { t, lang, cat } = useT();
  const [category, setCategory] = useState<Category>("road");
  const [image, setImage] = useState<string | null>(null);
  const [output, setOutput] = useState<ModelOutput | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [area, setArea] = useState("");
  const [desc, setDesc] = useState("");
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  const latN = Number(lat), lngN = Number(lng);
  const locOk = lat !== "" && lng !== "" && Number.isFinite(latN) && Number.isFinite(lngN) && Math.abs(latN) <= 90 && Math.abs(lngN) <= 180;

  async function onFile(f: File | undefined) {
    if (!f) return;
    try {
      const url = await fileToDataUrl(f);
      setImage(url); setOutput(demoPredictFromBytes(url, category)); setErr(null);
    } catch (e) { setErr(t(e instanceof UploadError ? e.code : "unreadable_image")); }
  }

  function submit() {
    if (!image || !output) return setErr(t("need_photo"));
    if (!locOk) return setErr(t("need_loc"));
    if (!consent) return setErr(t("need_consent"));
    const id = `RPT-${Math.floor(2000 + Math.random() * 7999)}`;
    const now = new Date().toISOString();
    store.add({ id, createdAt: now, lat: latN, lng: lngN, area: area.trim() || "Unnamed location", description: desc.trim().slice(0, 1000), consent, image, output,
      exposure: "unknown", status: "SUBMITTED", category, incidentId: null, rejectedLinks: [],
      history: [{ at: now, actor: "citizen", text: "Report submitted with photo evidence and consent" }, { at: now, actor: "system", text: `Demo detector returned ${output.detections.length} detection(s)` }] });
    rememberTicket(id);
    void navigate({ to: "/track", search: { id, new: true } });
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Citizen intake · {lang === "ta" ? "குடிமக்கள்" : "Public"}</p><h1 className="mt-1 text-3xl font-bold tracking-tight">{t("report_title")}</h1><p className="text-sm text-muted-foreground">{t("report_sub")}</p></div>
          <Panel title={t("step_category")}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => { setCategory(c); setImage(null); setOutput(null); }} aria-pressed={category === c}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${category === c ? "border-primary bg-primary/15 text-primary glow" : "border-border hover:border-primary/50"}`}>
                  <span className="mr-1">{CAT_ICON[c]}</span>{cat(c, CATEGORY_LABELS[c])}
                </button>
              ))}
            </div>
          </Panel>
          <Panel title={`1 · ${t("step_photo")}`}>
            <Input aria-label={t("step_photo")} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => void onFile(e.target.files?.[0])} />
            <p className="mt-2 text-xs text-muted-foreground">{t("upload_hint")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.values(SAMPLES).filter((s) => s.category === category).map((s) => (
                <button key={s.id} onClick={() => { setImage(s.image); setOutput(s.output); }} className={`overflow-hidden rounded-lg border text-left transition hover:border-primary/60 ${image === s.image ? "border-primary glow" : "border-border"}`}><img src={s.image} alt="" className="h-16 w-24 object-cover" /><span className="block w-24 truncate px-1.5 py-1 text-[11px]">{lang === "ta" ? s.labelTa : s.label}</span></button>
              ))}
            </div>
          </Panel>
          <Panel title={`2 · ${t("step_location")}`}>
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="outline" onClick={() => {
                if (!navigator.geolocation) return setGeoMsg(t("geo_unavailable"));
                navigator.geolocation.getCurrentPosition((p) => { setLat(p.coords.latitude.toFixed(5)); setLng(p.coords.longitude.toFixed(5)); setGeoMsg(null); }, () => setGeoMsg(t("geo_denied")), { timeout: 10000 });
              }}>{t("use_location")}</Button>
              {PRESETS.map((p) => <Button key={p.label} size="sm" variant="secondary" onClick={() => { setLat(String(p.lat)); setLng(String(p.lng)); setArea(p.label.replace(/ \(.*\)/, "")); }}>{p.label}</Button>)}
            </div>
            {geoMsg && <p className="mt-1 text-xs text-destructive">{geoMsg}</p>}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div><Label htmlFor="latitude">{t("latitude")}</Label><Input id="latitude" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} /></div>
              <div><Label htmlFor="longitude">{t("longitude")}</Label><Input id="longitude" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} /></div>
            </div>
            <div className="mt-2"><Label>{t("landmark")}</Label><Input value={area} maxLength={120} onChange={(e) => setArea(e.target.value)} /></div>
            {locOk && <IncidentMap key={`${lat},${lng}`} center={[latN, lngN]} className="mt-2 h-48 w-full rounded-sm" points={[{ id: "new", lat: latN, lng: lngN, color: "var(--accent)", label: "Your report" }]} />}
          </Panel>
          <Panel title={`3 · ${t("step_desc")}`}>
            <Textarea value={desc} maxLength={1000} placeholder={t("desc_ph")} onChange={(e) => setDesc(e.target.value)} />
            <label className="mt-3 flex items-start gap-2 text-sm">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
              {t("consent")}
            </label>
          </Panel>
          {err && <p className="text-sm font-semibold text-destructive">{err}</p>}
          <Button size="lg" className="w-full glow" disabled={!consent || !image || !locOk} onClick={submit}>{t("submit")}</Button>
        </div>
        <div className="space-y-2 lg:sticky lg:top-24 lg:self-start lg:pt-16">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("preview")}</h2>
          {image && output ? <DetectionOverlay image={image} output={output} /> :
            <div className="grid h-64 place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">{t("preview_empty")}</div>}
          <p className="text-xs text-muted-foreground">{t("conf_note")}</p>
        </div>
      </main>
    </div>
  );
}
