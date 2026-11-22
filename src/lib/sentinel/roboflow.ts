// Maps Roboflow workflow output into Sentinel detections (pure, browser-safe, tested).
import type { DamageClass, Detection, ModelOutput } from "./model";

export const ROBOFLOW_MODEL = "Roboflow live · road-pothole-detection";

interface RfPred { x: number; y: number; width: number; height: number; confidence: number; class?: string }
interface RfBlock { image?: { width: number; height: number }; predictions?: RfPred[] }

export function rfClass(label: string | undefined): DamageClass {
  const l = (label ?? "").toLowerCase();
  if (l.startsWith("pothole")) return "D40";
  if (l.includes("transverse")) return "D10";
  if (l.includes("longitudinal")) return "D00";
  return "D20"; // other cracked / broken pavement
}

const clamp = (n: number) => Math.min(1, Math.max(0, n));

export function mapRoboflow(raw: unknown): ModelOutput {
  const out = (raw as { outputs?: { predictions?: RfBlock }[] })?.outputs?.[0]?.predictions;
  const W = out?.image?.width, H = out?.image?.height;
  if (!out || !W || !H) throw new Error("Unexpected Roboflow response");
  const detections: Detection[] = (out.predictions ?? [])
    .filter((p) => [p.x, p.y, p.width, p.height, p.confidence].every(Number.isFinite))
    .map((p) => {
      const x = clamp((p.x - p.width / 2) / W), y = clamp((p.y - p.height / 2) / H);
      return { cls: rfClass(p.class), confidence: Math.round(clamp(p.confidence) * 100) / 100,
        box: { x, y, w: clamp(p.width / W) - Math.max(0, x + p.width / W - 1), h: clamp(p.height / H) - Math.max(0, y + p.height / H - 1) } };
    });
  return { model: ROBOFLOW_MODEL, isDemo: false, detections };
}
