import { createServerFn } from "@tanstack/react-start";
import { mapRoboflow } from "./roboflow";

const URL_ = "https://detect.roboflow.com/infer/workflows/ambers-workspace-0jd64/road-pothole-detection-1795352660043";

export const detectRoad = createServerFn({ method: "POST" })
  .inputValidator((d: { image: string }) => {
    if (typeof d?.image !== "string" || !d.image.startsWith("data:image/") || d.image.length > 8_000_000) throw new Error("Invalid image");
    return d;
  })
  .handler(async ({ data }) => {
    const key = process.env["ROBOFLOW_API_KEY"];
    if (!key) throw new Error("Roboflow key missing");
    const b64 = data.image.slice(data.image.indexOf(",") + 1);
    const res = await fetch(URL_, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key, inputs: { image: { type: "base64", value: b64 } } }), signal: AbortSignal.timeout(25000) });
    if (!res.ok) throw new Error(`Roboflow error ${res.status}`);
    return mapRoboflow(await res.json());
  });
