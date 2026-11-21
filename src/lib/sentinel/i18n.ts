import { useSyncExternalStore } from "react";
import type { Category, DamageClass, Severity, Status, VerificationResult } from "./model";

export type Lang = "en" | "ta";
const KEY = "civicai-lang";
let lang: Lang | null = null;
const ls = new Set<() => void>();
const get = (): Lang => {
  if (lang) return lang;
  try { lang = localStorage.getItem(KEY) === "ta" ? "ta" : "en"; } catch { lang = "en"; }
  return lang;
};
export function setLang(l: Lang) { lang = l; try { localStorage.setItem(KEY, l); } catch { /* ignore */ } ls.forEach((f) => f()); }
export function useLang(): Lang {
  return useSyncExternalStore((f) => { ls.add(f); return () => ls.delete(f); }, get, () => "en");
}

const D = {
  nav_command: ["Command Center", "கட்டுப்பாட்டு மையம்"],
  nav_analytics: ["Analytics & SLA", "பகுப்பாய்வு & SLA"],
  nav_lab: ["Verification Lab", "சரிபார்ப்பு ஆய்வகம்"],
  nav_report: ["Citizen Report", "குடிமக்கள் புகார்"],
  nav_track: ["Track Ticket", "புகார் நிலை"],
  nav_field: ["Field Crew", "களப் பணியாளர்"],
  track_title: ["Track your complaint", "உங்கள் புகாரின் நிலையை அறியவும்"],
  track_sub: ["Enter your ticket number to see progress, the assigned department and repair evidence.", "முன்னேற்றம், பொறுப்பான துறை மற்றும் பழுது சான்றைக் காண புகார் எண்ணை உள்ளிடவும்."],
  ticket_no: ["Ticket number", "புகார் எண்"],
  find: ["Find", "தேடு"],
  not_found: ["No ticket found with that number.", "அந்த எண்ணில் புகார் இல்லை."],
  my_tickets: ["Your tickets on this device", "இந்தச் சாதனத்தில் உங்கள் புகார்கள்"],
  submitted_ok: ["Report submitted. Save your ticket number:", "புகார் சமர்ப்பிக்கப்பட்டது. உங்கள் புகார் எண்ணைச் சேமிக்கவும்:"],
  assigned_to: ["Assigned to", "ஒதுக்கப்பட்டது"],
  crew: ["Crew", "பணிக்குழு"],
  due: ["Target date", "இலக்கு தேதி"],
  progress: ["Progress", "முன்னேற்றம்"],
  updates: ["Updates", "புதுப்பிப்புகள்"],
  repair_evidence: ["Repair evidence", "பழுது சான்று"],
  your_check: ["Is it actually fixed? Your confirmation closes the ticket.", "உண்மையில் சரிசெய்யப்பட்டதா? உங்கள் உறுதிப்படுத்தல் புகாரை மூடும்."],
  yes_fixed: ["Yes, it's fixed", "ஆம், சரிசெய்யப்பட்டது"],
  not_fixed: ["No, still a problem", "இல்லை, இன்னும் பிரச்சினை"],
  reopen: ["Reopen ticket", "மீண்டும் திற"],
  thanks: ["Thank you — your response was recorded.", "நன்றி — உங்கள் பதில் பதிவு செய்யப்பட்டது."],
  demo_mode: ["Demo mode · seeded data", "டெமோ · மாதிரி தரவு"],
  report_title: ["Report a civic problem", "குடிமைப் பிரச்சினையைப் புகாரளிக்கவும்"],
  step_category: ["Problem type", "பிரச்சினை வகை"],
  category: ["Category", "வகை"],
  report_sub: ["Your photo becomes civic evidence. Municipal staff review every report.", "உங்கள் புகைப்படம் குடிமைச் சான்றாகும். ஒவ்வொரு புகாரையும் நகராட்சி ஊழியர்கள் பார்வையிடுவர்."],
  step_photo: ["Photo evidence", "புகைப்படச் சான்று"],
  upload_hint: ["Upload a photo, or use a demo sample:", "புகைப்படத்தைப் பதிவேற்றவும் அல்லது மாதிரியைப் பயன்படுத்தவும்:"],
  step_location: ["Location", "இருப்பிடம்"],
  use_location: ["Use my location", "என் இருப்பிடம்"],
  geo_denied: ["Location permission denied — enter it manually or pick a preset.", "இருப்பிட அனுமதி மறுக்கப்பட்டது — கைமுறையாக உள்ளிடவும்."],
  latitude: ["Latitude", "அட்சரேகை"],
  longitude: ["Longitude", "தீர்க்கரேகை"],
  landmark: ["Street / landmark", "தெரு / அடையாளம்"],
  step_desc: ["Description & consent", "விவரம் & ஒப்புதல்"],
  desc_ph: ["What do you see? Any safety risk?", "நீங்கள் என்ன பார்க்கிறீர்கள்? ஏதேனும் பாதுகாப்பு அபாயம்?"],
  consent: ["I consent to this photo and location being stored and reviewed by municipal staff for this grievance. Avoid faces and number plates.", "இந்தப் புகைப்படமும் இருப்பிடமும் இந்தப் புகாருக்காகச் சேமிக்கப்பட்டு நகராட்சி ஊழியர்களால் பார்வையிடப்பட ஒப்புகிறேன். முகங்கள், வாகன எண்களைத் தவிர்க்கவும்."],
  submit: ["Submit report", "புகாரைச் சமர்ப்பி"],
  need_photo: ["Add a photo first.", "முதலில் புகைப்படம் சேர்க்கவும்."],
  need_loc: ["Add a valid location.", "சரியான இருப்பிடத்தைச் சேர்க்கவும்."],
  need_consent: ["Consent is required to submit evidence.", "சமர்ப்பிக்க ஒப்புதல் தேவை."],
  invalid_image: ["Choose a non-empty JPEG, PNG or WebP photo.", "JPEG, PNG அல்லது WebP புகைப்படத்தைத் தேர்ந்தெடுக்கவும்."],
  large_image: ["Photo must be 10 MB or smaller.", "புகைப்படம் 10 MB அல்லது அதற்குக் குறைவாக இருக்க வேண்டும்."],
  unreadable_image: ["Could not read that photo. Try another JPEG, PNG or WebP.", "புகைப்படத்தைப் படிக்க முடியவில்லை. வேறு புகைப்படத்தை முயற்சிக்கவும்."],
  geo_unavailable: ["Location unavailable — enter coordinates or pick a preset.", "இருப்பிடம் கிடைக்கவில்லை — கைமுறையாக உள்ளிடவும் அல்லது மாதிரி இடத்தைத் தேர்ந்தெடுக்கவும்."],
  no_detections: ["No demo detections. This is not proof that the location is safe; human review is required.", "டெமோ கண்டறிதல்கள் இல்லை. இது பாதுகாப்பிற்கான சான்றல்ல; மனித ஆய்வு தேவை."],
  preview: ["Detection preview", "கண்டறிதல் முன்னோட்டம்"],
  preview_empty: ["Add a photo to see detected issues", "சிக்கல்களைக் காண புகைப்படம் சேர்க்கவும்"],
  conf_note: ["Detection confidence is not severity or urgency. Uploaded photos receive a deterministic demo prediction because no trained model is connected.", "கண்டறிதல் நம்பகத்தன்மை தீவிரம் அல்ல. பயிற்சி பெற்ற மாதிரி இணைக்கப்படாததால் பதிவேற்றங்களுக்கு டெமோ கணிப்பு வழங்கப்படும்."],
  demo_pred: ["Demo prediction — not live inference", "டெமோ கணிப்பு — நேரடி AI அல்ல"],
  detections: ["detection(s)", "கண்டறிதல்(கள்)"],
  risk: ["Risk", "அபாயம்"],
  status: ["Status", "நிலை"],
  defects: ["Issues", "சிக்கல்கள்"],
  area: ["Area", "பகுதி"],
  age: ["Age", "வயது"],
  ward: ["Ward", "வார்டு"],
  priority_queue: ["Priority queue", "முன்னுரிமை வரிசை"],
  risk_map: ["Demo risk map", "டெமோ அபாய வரைபடம்"],
  open: ["Open", "திறந்தவை"],
  all: ["All", "அனைத்தும்"],
  new_report: ["New citizen report", "புதிய புகார்"],
  reset: ["Reset demo", "டெமோ மீட்டமை"],
  open_record: ["Open full record", "முழு பதிவைத் திற"],
  link_sugg: ["link suggestion", "இணைப்பு பரிந்துரை"],
  needs_conf: ["needs confirmation", "உறுதிப்படுத்தல் தேவை"],
  severity: ["Explainable severity", "விளக்கக்கூடிய தீவிரம்"],
  sla: ["SLA", "சேவை காலக்கெடு"],
  breached: ["Breached", "மீறப்பட்டது"],
  at_risk: ["At risk", "அபாயத்தில்"],
  on_track: ["On track", "சரியான பாதையில்"],
} as const;
export type Key = keyof typeof D;

const STATUS_TA: Record<Status, string> = {
  SUBMITTED: "சமர்ப்பிக்கப்பட்டது", TRIAGED: "வகைப்படுத்தப்பட்டது", INSPECTION_SCHEDULED: "ஆய்வு திட்டமிடப்பட்டது",
  REPAIR_IN_PROGRESS: "பழுதுபார்ப்பு நடைபெறுகிறது", VERIFICATION_PENDING: "சரிபார்ப்பு நிலுவையில்", CLOSED: "மூடப்பட்டது", REOPENED: "மீண்டும் திறக்கப்பட்டது",
};
const BAND_TA: Record<Severity["band"], string> = { Low: "குறைவு", Moderate: "மிதமானது", High: "அதிகம்", Critical: "மிக முக்கியம்", Incomplete: "முழுமையற்ற மதிப்பீடு" };
const CLASS_TA: Record<DamageClass, string> = { D00: "நீளவாக்கு விரிசல்", D10: "குறுக்கு விரிசல்", D20: "வலை விரிசல்", D40: "குழி", DR1: "வடிகால் நிரம்பி வழிதல்", DR2: "உடைந்த வடிகால் மூடி", WP1: "குடிநீர் குழாய் கசிவு", WP2: "நீர் தேக்கம்", EL1: "சாய்ந்த மின்கம்பம்", EL2: "தொங்கும் மின்கம்பிகள்", EL3: "வெளிப்பட்ட / அறுந்த மின்கம்பி" };
const CAT_TA: Record<Category, string> = { road: "சாலைகள்", drainage: "வடிகால்", water: "குடிநீர் விநியோகம்", electrical: "மின்சாரம்" };
const VER_TA: Record<VerificationResult, string> = { APPEARS_IMPROVED: "மேம்பட்டதாகத் தெரிகிறது", DAMAGE_STILL_VISIBLE: "சேதம் இன்னும் தெரிகிறது", INCONCLUSIVE: "முடிவில்லை" };

export function useT() {
  const l = useLang();
  const i = l === "ta" ? 1 : 0;
  return {
    lang: l,
    t: (k: Key) => D[k][i],
    status: (s: Status, en: string) => (l === "ta" ? STATUS_TA[s] : en),
    band: (b: Severity["band"]) => (l === "ta" ? BAND_TA[b] : b === "Incomplete" ? "Incomplete assessment" : b),
    cls: (c: DamageClass, en: string) => (l === "ta" ? CLASS_TA[c] : en),
    cat: (c: Category, en: string) => (l === "ta" ? CAT_TA[c] : en),
    ver: (v: VerificationResult, en: string) => (l === "ta" ? VER_TA[v] : en),
  };
}
