// The deduping is the whole point of the store, and it is exactly the kind of
// thing that looks right and quietly is not: a stale entry in the interval map
// leaves a timer running forever, and a missed in-flight check doubles every
// request instead of halving it. So it is driven here with fake timers rather
// than trusted.
//
// This is the reason the store was split out of useLiveData at all. The unit
// suite runs in node with no DOM, so while this logic lived inside a hook it
// could only be checked by hand in a browser.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const adminJson = vi.fn();
vi.mock("../fetchJson", () => ({ adminJson: (url: string) => adminJson(url) }));

const {
  liveSnapshot,
  liveTimerCount,
  readLive,
  resetLive,
  subscribeLive,
} = await import("../liveStore");

// setImmediate stays REAL. The default fake clock stubs it too, so a flush
// that waits on it never resolves and every test here times out. Date is faked
// on purpose: the staleness rule in subscribeLive reads Date.now().
const flush = () => new Promise((r) => setImmediate(r));

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"],
  });
  adminJson.mockReset();
  adminJson.mockImplementation(async (url: string) => ({ url }));
});

afterEach(() => {
  resetLive();
  vi.useRealTimers();
});

describe("subscribeLive", () => {
  it("collapses three subscribers to one endpoint into one timer", async () => {
    // The real case: the rail, the activity feed and the commerce tab all want
    // /api/admin/overview. Before this, that was three intervals.
    const off = [
      subscribeLive("/api/admin/overview", 60_000, "rail", () => {}),
      subscribeLive("/api/admin/overview", 30_000, "feed", () => {}),
      subscribeLive("/api/admin/overview", 30_000, "commerce", () => {}),
    ];
    await flush();

    expect(liveTimerCount()).toBe(1);
    // One read on join, not three: the second and third found data fresh
    // enough for what they asked for.
    expect(adminJson).toHaveBeenCalledTimes(1);

    off.forEach((f) => f());
  });

  it("polls at the fastest subscriber's interval, and slows when it leaves", async () => {
    const offSlow = subscribeLive("/u", 60_000, "slow", () => {});
    const offFast = subscribeLive("/u", 10_000, "fast", () => {});
    await flush();
    adminJson.mockClear();

    // 30s: three ticks at the fast cadence, none at the slow one.
    await vi.advanceTimersByTimeAsync(30_000);
    expect(adminJson).toHaveBeenCalledTimes(3);

    // The fast subscriber unmounts. The timer must fall back to 60s rather
    // than keep running at a rate nobody is asking for any more.
    offFast();
    adminJson.mockClear();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(adminJson).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(adminJson).toHaveBeenCalledTimes(1);

    offSlow();
  });

  it("stops the timer when the last subscriber leaves", async () => {
    const off = subscribeLive("/u", 10_000, "a", () => {});
    await flush();
    expect(liveTimerCount()).toBe(1);

    off();
    expect(liveTimerCount()).toBe(0);

    adminJson.mockClear();
    await vi.advanceTimersByTimeAsync(60_000);
    // A panel nobody has open must not keep hitting service-role endpoints.
    expect(adminJson).toHaveBeenCalledTimes(0);
  });

  it("keeps separate endpoints on separate timers", async () => {
    const a = subscribeLive("/a", 10_000, "x", () => {});
    const b = subscribeLive("/b", 10_000, "y", () => {});
    await flush();
    expect(liveTimerCount()).toBe(2);
    a();
    b();
  });

  it("re-reads on join when what is cached is older than the caller asked for", async () => {
    const off = subscribeLive("/u", 10_000, "first", () => {});
    await flush();
    off(); // entry survives, timer stops
    adminJson.mockClear();

    await vi.advanceTimersByTimeAsync(120_000);
    const off2 = subscribeLive("/u", 10_000, "second", () => {});
    await flush();
    // Two minutes stale against a ten second appetite. Painting that silently
    // is how a dashboard shows an old number as live.
    expect(adminJson).toHaveBeenCalledTimes(1);
    off2();
  });

  it("does not re-read on join when the cached value is fresh enough", async () => {
    const off = subscribeLive("/u", 60_000, "first", () => {});
    await flush();
    adminJson.mockClear();

    const off2 = subscribeLive("/u", 60_000, "second", () => {});
    await flush();
    expect(adminJson).toHaveBeenCalledTimes(0);
    off();
    off2();
  });

  it("notifies every subscriber from the one shared read", async () => {
    const seen: string[] = [];
    const off1 = subscribeLive("/u", 30_000, "a", () => seen.push("a"));
    const off2 = subscribeLive("/u", 30_000, "b", () => seen.push("b"));
    await flush();

    expect(seen).toContain("a");
    expect(seen).toContain("b");
    // And both are reading the same object, so two cards cannot disagree about
    // one fact at the same moment.
    expect(liveSnapshot("/u").data).toEqual({ url: "/u" });
    off1();
    off2();
  });
});

describe("readLive", () => {
  it("collapses concurrent reads into one request", async () => {
    // Two components mounting in the same commit both want data now.
    const both = Promise.all([readLive("/u"), readLive("/u")]);
    await both;
    expect(adminJson).toHaveBeenCalledTimes(1);
  });

  it("allows a fresh read once the first has settled", async () => {
    await readLive("/u");
    await readLive("/u");
    expect(adminJson).toHaveBeenCalledTimes(2);
  });

  it("keeps the last good value when a read fails", async () => {
    await readLive("/u");
    const good = liveSnapshot("/u").data;
    expect(good).toEqual({ url: "/u" });
    const syncedAt = liveSnapshot("/u").lastSynced;

    adminJson.mockResolvedValueOnce(null);
    await readLive("/u");

    const after = liveSnapshot("/u");
    expect(after.failing).toBe(true);
    expect(after.data).toEqual(good);
    // lastSynced must NOT advance on a failure, or "40s ago" would describe a
    // read that returned nothing.
    expect(after.lastSynced).toBe(syncedAt);
  });

  it("clears failing once a read succeeds again", async () => {
    adminJson.mockResolvedValueOnce(null);
    await readLive("/u");
    expect(liveSnapshot("/u").failing).toBe(true);

    await readLive("/u");
    expect(liveSnapshot("/u").failing).toBe(false);
    expect(liveSnapshot("/u").loading).toBe(false);
  });

  it("reports loading until the first read lands, for a URL never asked for", () => {
    // getSnapshot must not create an entry: React calls it during render.
    expect(liveSnapshot("/never-touched")).toEqual({
      data: null,
      lastSynced: null,
      loading: true,
      failing: false,
      misses: 0,
    });
    expect(liveTimerCount()).toBe(0);
  });
});

describe("a failing endpoint", () => {
  it("is not re-requested by every new subscriber", async () => {
    // Measured in the shell preview before this was fixed: /api/admin/stats
    // answers 403 there, and its four subscribers produced four requests in
    // one mount burst. The join check keyed on lastSynced, which never
    // advances on a failure, so a broken endpoint looked infinitely stale to
    // every subscriber that arrived.
    adminJson.mockResolvedValue(null);

    const offs = [
      subscribeLive("/api/admin/stats", 20_000, "feed", () => {}),
      subscribeLive("/api/admin/stats", 10_000, "overview", () => {}),
      subscribeLive("/api/admin/stats", 5_000, "live", () => {}),
    ];
    await flush();

    expect(adminJson).toHaveBeenCalledTimes(1);
    expect(liveSnapshot("/api/admin/stats").failing).toBe(true);
    offs.forEach((f) => f());
  });

  it("still retries on the shared timer", async () => {
    adminJson.mockResolvedValue(null);
    const off = subscribeLive("/u", 10_000, "a", () => {});
    await flush();
    adminJson.mockClear();

    // Backing off per-subscriber must not become backing off entirely: the
    // one shared timer is what recovers the panel when the outage ends.
    await vi.advanceTimersByTimeAsync(30_000);
    expect(adminJson).toHaveBeenCalledTimes(3);
    off();
  });
});

describe("misses", () => {
  it("counts consecutive failures and resets on the first success", async () => {
    adminJson.mockResolvedValueOnce(null);
    await readLive("/u");
    expect(liveSnapshot("/u").misses).toBe(1);
    adminJson.mockResolvedValueOnce(null);
    await readLive("/u");
    expect(liveSnapshot("/u").misses).toBe(2);

    // One good read forgives everything before it. The strip's "panel is
    // blind" fault keys on two in a row, so a single dropped poll never fires
    // it and a recovered one clears it at once.
    await readLive("/u");
    expect(liveSnapshot("/u").misses).toBe(0);
    expect(liveSnapshot("/u").failing).toBe(false);
  });
});

describe("returning to the tab", () => {
  // node has no document, so this drives the same rule the handler applies:
  // a fresh source is left alone and a stale one is re-read, by the
  // subscribe path that shares it.
  it("re-reads only a source older than its own interval", async () => {
    const offA = subscribeLive("/fast", 10_000, "a", () => {});
    const offB = subscribeLive("/slow", 1_800_000, "b", () => {});
    await flush();
    // Leave, which stops both timers. A running 10-second timer would keep
    // /fast permanently fresh and prove nothing about the rule.
    offA();
    offB();

    // Five minutes later, come back. The 10-second source is stale by its own
    // interval; the 30-minute one is not.
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    adminJson.mockClear();
    const offA2 = subscribeLive("/fast", 10_000, "a2", () => {});
    const offB2 = subscribeLive("/slow", 1_800_000, "b2", () => {});
    await flush();

    const urls = adminJson.mock.calls.map((c) => c[0]);
    expect(urls).toContain("/fast");
    expect(urls).not.toContain("/slow");
    offA2();
    offB2();
  });
});
