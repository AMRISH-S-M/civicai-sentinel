// Synthetic demo road images (SVG) and a clearly-labelled demo predictor.
// No live model is connected in this prototype; outputs are marked isDemo.
import type { DamageClass, Detection, ModelOutput } from "./model";

export const DEMO_MODEL = "demo-prediction v0 (no live inference)";

import potholeA from "@/assets/roads/pothole.jpg.asset.json";
import potholeCrackA from "@/assets/roads/pothole_crack.jpg.asset.json";
import longCrackA from "@/assets/roads/long_crack.jpg.asset.json";
import transCrackA from "@/assets/roads/trans_crack.jpg.asset.json";
import repairedA from "@/assets/roads/repaired.jpg.asset.json";
import potholeCloseA from "@/assets/roads/pothole_close.jpg.asset.json";
import stillA from "@/assets/roads/still_damaged.jpg.asset.json";
import nightA from "@/assets/roads/night.jpg.asset.json";

type Box = [DamageClass, number, number, number, number, number]; // cls, conf, x, y, w, h
export function demoOutput(boxes: Box[]): ModelOutput {
  return { model: DEMO_MODEL, isDemo: true, detections: boxes.map(([cls, confidence, x, y, w, h]) => ({ cls, confidence, box: { x, y, w, h } })) };
}

export interface Sample { id: string; label: string; labelTa: string; image: string; output: ModelOutput }
const S = (id: string, label: string, labelTa: string, image: string, boxes: Box[]): Sample => ({ id, label, labelTa, image, output: demoOutput(boxes) });

// Photo-realistic sample images; boxes were placed by hand to match each photo (demo annotations).
export const SAMPLES = {
  pothole: S("pothole", "Large pothole", "பெரிய குழி", potholeA.url, [["D40", 0.86, 0.18, 0.16, 0.65, 0.67]]),
  potholeCrack: S("potholeCrack", "Pothole + alligator cracking", "குழி + வலை விரிசல்", potholeCrackA.url, [["D40", 0.81, 0.1, 0.28, 0.29, 0.4], ["D20", 0.64, 0.55, 0.05, 0.45, 0.9]]),
  longCrack: S("longCrack", "Longitudinal crack", "நீளவாக்கு விரிசல்", longCrackA.url, [["D00", 0.72, 0.45, 0.0, 0.08, 1.0]]),
  transCrack: S("transCrack", "Transverse crack", "குறுக்கு விரிசல்", transCrackA.url, [["D10", 0.69, 0.0, 0.4, 1.0, 0.12]]),
  potholeClose: S("potholeClose", "Pothole close-up", "குழி அருகில்", potholeCloseA.url, [["D40", 0.77, 0.22, 0.17, 0.64, 0.66]]),
} satisfies Record<string, Sample>;

export const AFTER_SAMPLES = {
  repaired: S("repaired", "Patched surface", "சரிசெய்யப்பட்ட மேற்பரப்பு", repairedA.url, []),
  stillDamaged: S("stillDamaged", "Pothole still visible", "குழி இன்னும் உள்ளது", stillA.url, [["D40", 0.83, 0.17, 0.15, 0.66, 0.68]]),
  dark: S("dark", "Night photo (too dark)", "இரவு புகைப்படம் (இருள்)", nightA.url, [["D40", 0.31, 0.2, 0.2, 0.6, 0.6]]),
};

/** Deterministic demo prediction for a user upload — NOT real inference. */
export function demoPredictFromBytes(dataUrl: string): ModelOutput {
  let h = 2166136261;
  for (let i = 0; i < dataUrl.length; i += 97) h = Math.imul(h ^ dataUrl.charCodeAt(i), 16777619) >>> 0;
  const rnd = () => ((h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0) / 4294967296);
  const classes: DamageClass[] = ["D40", "D20", "D00", "D10"];
  const n = 1 + Math.floor(rnd() * 2);
  const detections: Detection[] = [];
  for (let i = 0; i < n; i++) {
    const w = 0.1 + rnd() * 0.2, hh = 0.08 + rnd() * 0.15;
    detections.push({
      cls: classes[Math.floor(rnd() * 4)] ?? "D40",
      confidence: Math.round((0.5 + rnd() * 0.4) * 100) / 100,
      box: { x: 0.1 + rnd() * (0.8 - w), y: 0.25 + rnd() * (0.7 - hh), w, h: hh },
    });
  }
  return { model: DEMO_MODEL, isDemo: true, detections };
}

export function meanLuminance(src: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 64; c.height = 40;
      const ctx = c.getContext("2d");
      if (!ctx) return resolve(128);
      ctx.drawImage(img, 0, 0, 64, 40);
      const d = ctx.getImageData(0, 0, 64, 40).data;
      let s = 0;
      for (let i = 0; i < d.length; i += 4) s += 0.299 * (d[i] ?? 0) + 0.587 * (d[i + 1] ?? 0) + 0.114 * (d[i + 2] ?? 0);
      resolve(s / (d.length / 4));
    };
    img.onerror = () => resolve(128);
    img.src = src;
  });
}

export function fileToDataUrl(file: File, max = 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = img.width * k; c.height = img.height * k;
        c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject;
      img.src = String(r.result);
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
