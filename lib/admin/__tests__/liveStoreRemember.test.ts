import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * The live store keeps the last good answer for the traffic days in the
 * browser, so a first open draws it at once (the owner, 2026-11-04: "the
 * chart numbers load pretty slow on first open"). Nothing else is kept.
 */

const answers = vi.hoisted(() => ({ next: null as unknown }));
vi.mock("../fetchJson", () => ({ adminJson: async () => answers.next }));

const store = new Map<string, string>();
const fakeStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

beforeAll(() => {
  vi.stubGlobal("window", { localStorage: fakeStorage });
  vi.stubGlobal("localStorage", fakeStorage);
});
afterAll(() => vi.unstubAllGlobals());

describe("remembered answers", () => {
  it("draws the kept traffic answer before the fresh read lands, and keeps the fresh one", async () => {
    const url = "/api/admin/traffic?range=120d&latest=now&case=1";
    const at = Date.parse("2026-11-04T09:00:00Z");
    store.set(`purify:admin:live:${url}`, JSON.stringify({ at, data: { points: [{ date: "2026-11-03", visitors: 7 }] } }));
    const { liveSnapshot, readLive } = await import("../liveStore");

    const first = liveSnapshot(url);
    expect(first.loading).toBe(false);
    expect(first.lastSynced?.getTime()).toBe(at);
    expect(first.data).toEqual({ points: [{ date: "2026-11-03", visitors: 7 }] });

    answers.next = { points: [{ date: "2026-11-04", visitors: 9 }] };
    await readLive(url);
    expect(liveSnapshot(url).data).toEqual({ points: [{ date: "2026-11-04", visitors: 9 }] });
    expect(JSON.parse(store.get(`purify:admin:live:${url}`)!).data).toEqual({ points: [{ date: "2026-11-04", visitors: 9 }] });
  });

  it("keeps nothing for any other address", async () => {
    const url = "/api/admin/stats?case=2";
    store.set(`purify:admin:live:${url}`, JSON.stringify({ at: 1, data: { liveCount: 99 } }));
    const { liveSnapshot, readLive } = await import("../liveStore");
    expect(liveSnapshot(url).loading).toBe(true);
    expect(liveSnapshot(url).data).toBeNull();
    answers.next = { liveCount: 3 };
    await readLive(url);
    expect(JSON.parse(store.get(`purify:admin:live:${url}`)!).data).toEqual({ liveCount: 99 });
  });

  it("starts empty when the kept answer cannot be read", async () => {
    const url = "/api/admin/traffic?range=120d&latest=complete&case=3";
    store.set(`purify:admin:live:${url}`, "{not json");
    const { liveSnapshot } = await import("../liveStore");
    expect(liveSnapshot(url).loading).toBe(true);
  });
});
