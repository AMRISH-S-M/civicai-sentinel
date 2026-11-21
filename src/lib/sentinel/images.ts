// Generated sample photos and a clearly-labelled deterministic demo predictor.
// No live model is connected in this prototype; outputs are marked isDemo.
import { classesOf, type Category, type DamageClass, type Detection, type ModelOutput } from "./model";

export const DEMO_MODEL = "demo-prediction v0 (no live inference)";

import potholeA from "@/assets/roads/pothole.jpg.asset.json";
import potholeCrackA from "@/assets/roads/pothole_crack.jpg.asset.json";
import longCrackA from "@/assets/roads/long_crack.jpg.asset.json";
import transCrackA from "@/assets/roads/trans_crack.jpg.asset.json";
import repairedA from "@/assets/roads/repaired.jpg.asset.json";
import potholeCloseA from "@/assets/roads/pothole_close.jpg.asset.json";
import stillA from "@/assets/roads/still_damaged.jpg.asset.json";
import nightA from "@/assets/roads/night.jpg.asset.json";
import drainA from "@/assets/roads/drain.jpg.asset.json";
import pipeA from "@/assets/roads/pipe.jpg.asset.json";
import poleA from "@/assets/roads/pole.jpg.asset.json";
import wireA from "@/assets/roads/wire.jpg.asset.json";

type Box = [DamageClass, number, number, number, number, number]; // cls, conf, x, y, w, h
export function demoOutput(boxes: Box[]): ModelOutput {
  return { model: DEMO_MODEL, isDemo: true, detections: boxes.map(([cls, confidence, x, y, w, h]) => ({ cls, confidence, box: { x, y, w, h } })) };
}

export interface Sample { id: string; label: string; labelTa: string; image: string; output: ModelOutput; category: Category }
const S = (id: string, label: string, labelTa: string, image: string, boxes: Box[], category: Category = "road"): Sample => ({ id, label, labelTa, image, output: demoOutput(boxes), category });

// Photo-realistic sample images; boxes were placed by hand to match each photo (demo annotations).
export const SAMPLES = {
  pothole: S("pothole", "Large pothole", "பெரிய குழி", potholeA.url, [["D40", 0.86, 0.18, 0.16, 0.65, 0.67]]),
  potholeCrack: S("potholeCrack", "Pothole + alligator cracking", "குழி + வலை விரிசல்", potholeCrackA.url, [["D40", 0.81, 0.1, 0.28, 0.29, 0.4], ["D20", 0.64, 0.55, 0.05, 0.45, 0.9]]),
  longCrack: S("longCrack", "Longitudinal crack", "நீளவாக்கு விரிசல்", longCrackA.url, [["D00", 0.72, 0.45, 0.0, 0.08, 1.0]]),
  transCrack: S("transCrack", "Transverse crack", "குறுக்கு விரிசல்", transCrackA.url, [["D10", 0.69, 0.0, 0.4, 1.0, 0.12]]),
  potholeClose: S("potholeClose", "Pothole close-up", "குழி அருகில்", potholeCloseA.url, [["D40", 0.77, 0.22, 0.17, 0.64, 0.66]]),
  drain: S("drain", "Overflowing drain", "நிரம்பி வழியும் வடிகால்", drainA.url, [["DR1", 0.79, 0.25, 0.37, 0.6, 0.6], ["DR2", 0.66, 0.4, 0.26, 0.33, 0.21]], "drainage"),
  pipe: S("pipe", "Water pipe leak", "குழாய் கசிவு", pipeA.url, [["WP1", 0.84, 0.36, 0.35, 0.4, 0.38], ["WP2", 0.58, 0.25, 0.65, 0.75, 0.35]], "water"),
  pole: S("pole", "Leaning electric pole", "சாய்ந்த மின்கம்பம்", poleA.url, [["EL1", 0.88, 0.17, 0.03, 0.5, 0.87], ["EL2", 0.61, 0.46, 0.08, 0.4, 0.3]], "electrical"),
  wire: S("wire", "Fallen live wire", "அறுந்த மின்கம்பி", wireA.url, [["EL3", 0.81, 0.3, 0.0, 0.4, 0.92]], "electrical"),
} satisfies Record<string, Sample>;

export const AFTER_SAMPLES = {
  repaired: S("repaired", "Patched surface", "சரிசெய்யப்பட்ட மேற்பரப்பு", repairedA.url, []),
  stillDamaged: S("stillDamaged", "Pothole still visible", "குழி இன்னும் உள்ளது", stillA.url, [["D40", 0.83, 0.17, 0.15, 0.66, 0.68]]),
  dark: S("dark", "Night photo (too dark)", "இரவு புகைப்படம் (இருள்)", nightA.url, [["D40", 0.31, 0.2, 0.2, 0.6, 0.6]]),
};

/** Deterministic demo prediction for a user upload — NOT real inference. */
export function demoPredictFromBytes(dataUrl: string, category: Category = "road"): ModelOutput {
  let h = 2166136261;
  for (let i = 0; i < dataUrl.length; i += 97) h = Math.imul(h ^ dataUrl.charCodeAt(i), 16777619) >>> 0;
  const rnd = () => ((h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0) / 4294967296);
  const classes: DamageClass[] = classesOf(category);
  const n = 1 + Math.floor(rnd() * 2);
  const detections: Detection[] = [];
  for (let i = 0; i < n; i++) {
    const w = 0.1 + rnd() * 0.2, hh = 0.08 + rnd() * 0.15;
    detections.push({
      cls: classes[Math.floor(rnd() * classes.length)] ?? classes[0] ?? "D40",
      confidence: Math.round((0.5 + rnd() * 0.4) * 100) / 100,
      box: { x: 0.1 + rnd() * (0.8 - w), y: 0.25 + rnd() * (0.7 - hh), w, h: hh },
    });
  }
  return { model: DEMO_MODEL, isDemo: true, detections };
}

export function meanLuminance(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 64; c.height = 40;
      const ctx = c.getContext("2d");
      if (!ctx) return reject(new Error("Image analysis unavailable."));
      try {
      ctx.drawImage(img, 0, 0, 64, 40);
      const d = ctx.getImageData(0, 0, 64, 40).data;
      let s = 0;
      for (let i = 0; i < d.length; i += 4) s += 0.299 * (d[i] ?? 0) + 0.587 * (d[i + 1] ?? 0) + 0.114 * (d[i + 2] ?? 0);
      resolve(s / (d.length / 4));
      } catch { reject(new Error("Could not analyze that image. Try another photo.")); }
    };
    img.onerror = () => reject(new Error("Could not load that image. Try another photo."));
    img.src = src;
  });
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export type UploadErrorCode = "invalid_image" | "large_image" | "unreadable_image";
export class UploadError extends Error {
  constructor(public code: UploadErrorCode) { super(code); }
}
export function validateImageFile(file: Pick<File, "type" | "size">): void {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size === 0) throw new UploadError("invalid_image");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("large_image");
}
export function fileToDataUrl(file: File, max = 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    try { validateImageFile(file); } catch (e) { reject(e); return; }
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = img.width * k; c.height = img.height * k;
        const ctx = c.getContext("2d");
        if (!ctx || !img.width || !img.height) return reject(new UploadError("unreadable_image"));
        try { ctx.drawImage(img, 0, 0, c.width, c.height); resolve(c.toDataURL("image/jpeg", 0.8)); }
        catch { reject(new UploadError("unreadable_image")); }
      };
      img.onerror = () => reject(new UploadError("unreadable_image"));
      img.src = String(r.result);
    };
    r.onerror = () => reject(new UploadError("unreadable_image"));
    r.readAsDataURL(file);
  });
}
