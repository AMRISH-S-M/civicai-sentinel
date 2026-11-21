import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader, DetectionOverlay, Panel } from "@/components/sentinel/ui";
import { IncidentMap } from "@/components/sentinel/IncidentMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SAMPLES, demoPredictFromBytes, fileToDataUrl } from "@/lib/sentinel/images";
import type { ModelOutput } from "@/lib/sentinel/model";
import { store } from "@/lib/sentinel/store";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report a Road Defect — CivicAI Sentinel" },
      { name: "description", content: "Submit photo evidence of a pothole or crack with location and consent." },
      { property: "og:title", content: "Report a Road Defect — CivicAI Sentinel" },
      { property: "og:description", content: "Citizen evidence intake for road damage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportPage,
});

const PRESETS = [
  { label: "Anna Nagar 2nd Ave (school)", lat: 13.08522, lng: 80.21005 },
  { label: "Greams Rd (hospital)", lat: 13.06405, lng: 80.24935 },
  { label: "T. Nagar, Usman Rd", lat: 13.04121, lng: 80.23395 },
];

function ReportPage() {
  const navigate = useNavigate();
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
    if (!f.type.startsWith("image/")) return setErr("Please choose an image file.");
    try {
      const url = await fileToDataUrl(f);
      setImage(url); setOutput(demoPredictFromBytes(url)); setErr(null);
    } catch { setErr("Could not read that image."); }
  }

  function submit() {
    if (!image || !output) return setErr("Add a photo first.");
    if (!locOk) return setErr("Add a valid location.");
    if (!consent) return setErr("Consent is required to submit evidence.");
    const id = `RPT-${Math.floor(2000 + Math.random() * 7999)}`;
    const now = new Date().toISOString();
    store.add({ id, createdAt: now, lat: latN, lng: lngN, area: area.trim() || "Unnamed location", description: desc.trim().slice(0, 1000), consent, image, output,
      exposure: "unknown", status: "SUBMITTED", incidentId: null, rejectedLinks: [],
      history: [{ at: now, actor: "citizen", text: "Report submitted with photo evidence and consent" }, { at: now, actor: "system", text: `Demo detector returned ${output.detections.length} detection(s)` }] });
    void navigate({ to: "/incidents/$id", params: { id } });
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-5 lg:grid-cols-2">
        <div className="space-y-4">
          <h1 className="text-3xl font-black tracking-tight">Report a road defect</h1>
          <Panel title="1 · Photo evidence">
            <Input type="file" accept="image/*" onChange={(e) => void onFile(e.target.files?.[0])} />
            <p className="mt-2 text-xs text-muted-foreground">Or use a demo sample image:</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {Object.values(SAMPLES).map((s) => (
                <button key={s.id} onClick={() => { setImage(s.image); setOutput(s.output); }} className="rounded-sm border border-border bg-secondary px-2 py-1 text-xs font-semibold hover:bg-accent">{s.label}</button>
              ))}
            </div>
          </Panel>
          <Panel title="2 · Location">
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant="outline" onClick={() => {
                if (!navigator.geolocation) return setGeoMsg("Location not available in this browser.");
                navigator.geolocation.getCurrentPosition((p) => { setLat(p.coords.latitude.toFixed(5)); setLng(p.coords.longitude.toFixed(5)); setGeoMsg(null); }, () => setGeoMsg("Location permission denied — enter it manually or pick a preset."));
              }}>Use my location</Button>
              {PRESETS.map((p) => <Button key={p.label} size="sm" variant="secondary" onClick={() => { setLat(String(p.lat)); setLng(String(p.lng)); setArea(p.label.replace(/ \(.*\)/, "")); }}>{p.label}</Button>)}
            </div>
            {geoMsg && <p className="mt-1 text-xs text-destructive">{geoMsg}</p>}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div><Label>Latitude</Label><Input value={lat} onChange={(e) => setLat(e.target.value)} /></div>
              <div><Label>Longitude</Label><Input value={lng} onChange={(e) => setLng(e.target.value)} /></div>
            </div>
            <div className="mt-2"><Label>Street / landmark</Label><Input value={area} maxLength={120} onChange={(e) => setArea(e.target.value)} /></div>
            {locOk && <IncidentMap key={`${lat},${lng}`} center={[latN, lngN]} className="mt-2 h-48 w-full rounded-sm" points={[{ id: "new", lat: latN, lng: lngN, color: "var(--accent)", label: "Your report" }]} />}
          </Panel>
          <Panel title="3 · Description & consent">
            <Textarea value={desc} maxLength={1000} placeholder="What do you see? Any safety risk?" onChange={(e) => setDesc(e.target.value)} />
            <label className="mt-3 flex items-start gap-2 text-sm">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
              I consent to this photo and location being stored and reviewed by municipal staff for this grievance. Avoid faces and number plates.
            </label>
          </Panel>
          {err && <p className="text-sm font-semibold text-destructive">{err}</p>}
          <Button size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={!consent || !image || !locOk} onClick={submit}>Submit report</Button>
        </div>
        <div className="space-y-2 lg:pt-12">
          <h2 className="text-xs font-black uppercase tracking-wider">Detection preview</h2>
          {image && output ? <DetectionOverlay image={image} output={output} /> :
            <div className="grid h-64 place-items-center rounded-sm border border-dashed border-border text-sm text-muted-foreground">Add a photo to see detected defects</div>}
          <p className="text-xs text-muted-foreground">Detection confidence is not severity or urgency. Uploaded photos receive a deterministic demo prediction because no trained model is connected in this prototype.</p>
        </div>
      </main>
    </div>
  );
}
