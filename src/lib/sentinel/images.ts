// Synthetic demo road images (SVG) and a clearly-labelled demo predictor.
// No live model is connected in this prototype; outputs are marked isDemo.
import type { DamageClass, Detection, ModelOutput } from "./model";

export const DEMO_MODEL = "demo-prediction v0 (no live inference)";

interface Defect { cls: DamageClass; x: number; y: number; w: number; h: number; conf: number }

function defectSvg(d: Defect, W: number, H: number, patched: boolean): string {
  const x = d.x * W, y = d.y * H, w = d.w * W, h = d.h * H;
  if (patched)
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#3d3f44" opacity="0.9"/>`;
  if (d.cls === "D40")
    return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" fill="#1a1a1c"/><ellipse cx="${x + w / 2}" cy="${y + h / 2 - 3}" rx="${w / 2.4}" ry="${h / 2.8}" fill="#4a3b2a" opacity="0.7"/>`;
  if (d.cls === "D20") {
    let p = "";
    for (let i = 0; i < 9; i++) {
      const a = x + ((i * 37) % w), b = y + ((i * 23) % h);
      p += `<path d="M${a} ${b} l${w / 4} ${h / 6} l${-w / 8} ${h / 4}" stroke="#141416" stroke-width="2.5" fill="none"/>`;
    }
    return p;
  }
  if (d.cls === "D00")
    return `<path d="M${x + w / 2} ${y} q${w / 3} ${h / 3} 0 ${h / 2} t0 ${h / 2}" stroke="#141416" stroke-width="3" fill="none"/>`;
  return `<path d="M${x} ${y + h / 2} q${w / 4} ${-h / 3} ${w / 2} 0 t${w / 2} 0" stroke="#141416" stroke-width="3" fill="none"/>`;
}

export function roadImage(defects: Defect[], opts: { dark?: boolean; patched?: boolean; seed?: number } = {}): string {
  const W = 800, H = 500, s = opts.seed ?? 1;
  let grain = "";
  for (let i = 0; i < 140; i++) {
    const gx = (i * 97 * s) % W, gy = (i * 61 + s * 13) % H;
    grain += `<circle cx="${gx}" cy="${gy}" r="${1 + (i % 3)}" fill="#${i % 2 ? "6b6d72" : "52545a"}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="#8fa37a"/>
<polygon points="250,0 550,0 800,${H} 0,${H}" fill="#5c5e63"/>${grain}
<polygon points="395,0 405,0 412,90 388,90" fill="#e8d36a"/><polygon points="384,150 416,150 426,290 374,290" fill="#e8d36a"/><polygon points="368,360 432,360 444,${H} 356,${H}" fill="#e8d36a"/>
${defects.map((d) => defectSvg(d, W, H, !!opts.patched)).join("")}
${opts.dark ? `<rect width="${W}" height="${H}" fill="#000" opacity="0.86"/>` : ""}
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function demoOutput(defects: Defect[]): ModelOutput {
  return {
    model: DEMO_MODEL,
    isDemo: true,
    detections: defects.map((d) => ({ cls: d.cls, confidence: d.conf, box: { x: d.x, y: d.y, w: d.w, h: d.h } })),
  };
}

export interface Sample { id: string; label: string; image: string; output: ModelOutput }

const S = (id: string, label: string, defects: Defect[], o: { dark?: boolean; patched?: boolean; seed?: number } = {}, detect = true): Sample => ({
  id, label, image: roadImage(defects, o), output: demoOutput(detect ? defects : []),
});

export const SAMPLES = {
  pothole: S("pothole", "Large pothole", [{ cls: "D40", x: 0.42, y: 0.55, w: 0.22, h: 0.16, conf: 0.86 }], { seed: 3 }),
  potholeCrack: S("potholeCrack", "Pothole with alligator cracking", [
    { cls: "D40", x: 0.3, y: 0.6, w: 0.18, h: 0.14, conf: 0.81 },
    { cls: "D20", x: 0.52, y: 0.5, w: 0.2, h: 0.22, conf: 0.64 },
  ], { seed: 5 }),
  longCrack: S("longCrack", "Longitudinal crack", [{ cls: "D00", x: 0.55, y: 0.3, w: 0.06, h: 0.5, conf: 0.72 }], { seed: 7 }),
  transCrack: S("transCrack", "Transverse crack", [{ cls: "D10", x: 0.25, y: 0.62, w: 0.45, h: 0.06, conf: 0.69 }], { seed: 9 }),
  smallPothole: S("smallPothole", "Small pothole", [{ cls: "D40", x: 0.48, y: 0.7, w: 0.1, h: 0.08, conf: 0.77 }], { seed: 11 }),
} satisfies Record<string, Sample>;

export const AFTER_SAMPLES = {
  repaired: S("repaired", "Patched surface (repair visible)", [{ cls: "D40", x: 0.42, y: 0.55, w: 0.22, h: 0.16, conf: 0 }], { patched: true, seed: 3 }, false),
  stillDamaged: S("stillDamaged", "Pothole still visible", [{ cls: "D40", x: 0.41, y: 0.55, w: 0.21, h: 0.15, conf: 0.83 }], { seed: 4 }),
  dark: S("dark", "Night photo (too dark)", [{ cls: "D40", x: 0.42, y: 0.55, w: 0.22, h: 0.16, conf: 0.31 }], { dark: true, seed: 3 }),
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
