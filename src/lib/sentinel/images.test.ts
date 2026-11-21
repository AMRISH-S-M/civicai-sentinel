import { afterEach, describe, expect, it, vi } from "vitest";
import { fileToDataUrl, meanLuminance } from "./images";

afterEach(() => vi.unstubAllGlobals());
describe("image read failures", () => {
  it("rejects corrupted raster bytes", async () => {
    vi.stubGlobal("Image", class { onerror?: () => void; set src(_v: string) { queueMicrotask(() => this.onerror?.()); } });
    await expect(fileToDataUrl(new File(["not a PNG"], "broken.png", { type: "image/png" }))).rejects.toThrow("unreadable_image");
  });
  it("does not fabricate neutral luminance for an unavailable image", async () => {
    vi.stubGlobal("Image", class { onerror?: () => void; set src(_v: string) { queueMicrotask(() => this.onerror?.()); } });
    await expect(meanLuminance("missing.jpg")).rejects.toThrow("Could not load");
  });
});