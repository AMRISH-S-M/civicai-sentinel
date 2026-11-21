import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("./images", async (importOriginal) => ({ ...await importOriginal<typeof import("./images")>(), meanLuminance: vi.fn(async () => 120) }));
import { meanLuminance, AFTER_SAMPLES } from "./images";

afterEach(() => { vi.resetModules(); localStorage.clear(); vi.clearAllMocks(); });
describe("field to citizen lifecycle", () => {
  it("completion remains pending until a person confirms, then persists closed", async () => {
    const { store, seedReports, submitAfterPhoto, signOff } = await import("./store");
    store.reset(); const r = seedReports().find((x) => x.id === "RPT-1004");
    if (!r) throw new Error("Missing repair seed");
    await submitAfterPhoto(r, AFTER_SAMPLES.repaired.image, AFTER_SAMPLES.repaired.output, true);
    const rows = () => JSON.parse(localStorage.getItem("civicai-sentinel-v3") ?? "[]") as typeof r[];
    expect(rows().find((x) => x.id === r.id)?.status).toBe("VERIFICATION_PENDING");
    expect(rows().find((x) => x.id === r.id)?.verification?.human).toBeUndefined();
    signOff(r.id, "confirmed", "citizen", "Checked on site");
    expect(rows().find((x) => x.id === r.id)?.status).toBe("CLOSED");
    expect(rows().find((x) => x.id === r.id)?.verification?.human?.note).toBe("Checked on site");
  });
  it("a dispute reopens the ticket", async () => {
    const { store, signOff } = await import("./store"); store.reset();
    signOff("RPT-1005", "disputed", "citizen", "Damage remains");
    const rows = JSON.parse(localStorage.getItem("civicai-sentinel-v3") ?? "[]") as { id: string; status: string }[];
    expect(rows.find((x) => x.id === "RPT-1005")?.status).toBe("REOPENED");
  });
  it("a failed photo leaves the original ticket unchanged", async () => {
    vi.mocked(meanLuminance).mockRejectedValueOnce(new Error("Unreadable"));
    const { store, seedReports, submitAfterPhoto } = await import("./store"); store.reset();
    const r = seedReports()[0]; if (!r) throw new Error("Missing seed");
    const saved = localStorage.getItem("civicai-sentinel-v3");
    await expect(submitAfterPhoto(r, "bad-photo", AFTER_SAMPLES.repaired.output, true)).rejects.toThrow("Unreadable");
    expect(localStorage.getItem("civicai-sentinel-v3")).toBe(saved);
  });
  it("reset restores the eleven known reports", async () => {
    const { store, seedReports } = await import("./store"); store.reset();
    const r = seedReports()[0]; if (!r) throw new Error("Missing seed");
    store.add({ ...r, id: "CUSTOM" }); store.reset();
    const rows = JSON.parse(localStorage.getItem("civicai-sentinel-v3") ?? "[]") as { id: string }[];
    expect(rows).toHaveLength(11); expect(rows.some((x) => x.id === "CUSTOM")).toBe(false);
  });
});