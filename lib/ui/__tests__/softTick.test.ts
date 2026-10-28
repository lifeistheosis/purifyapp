// The soft tick is for the phone apps. A browser must not so much as load the
// plugin, and nothing it does may ever reach the screen as an error. The why
// is in ../softTick.ts.

import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** As node_modules/@capacitor/haptics spells them. */
const ImpactStyle = { Heavy: "HEAVY", Medium: "MEDIUM", Light: "LIGHT" };

type Impact = (options: { style: string }) => Promise<void>;

/** A stand-in for the plugin, counting each time it is loaded. */
function plugin(impact: Impact = async () => {}) {
  const p = {
    loads: 0,
    impact: vi.fn(impact),
    factory: () => {
      p.loads += 1;
      return { Haptics: { impact: p.impact }, ImpactStyle };
    },
  };
  return p;
}

/** A plugin whose chunk never arrives. A failed load is not kept, so every attempt counts. */
function missingPlugin() {
  const p = {
    loads: 0,
    factory: (): never => {
      p.loads += 1;
      throw new Error("the chunk did not load");
    },
  };
  return p;
}

/** softTick, loaded fresh: in the phone app or a browser, with the plugin stood in for. */
async function load(isNative: () => boolean, factory: () => object) {
  vi.doMock("@/lib/platform/native", () => ({ isNativeClient: isNative }));
  vi.doMock("@capacitor/haptics", factory);
  return (await import("../softTick")).softTick;
}

/** softTick answers nothing: give what it started two turns of the loop to finish, a rejection included. */
async function settle() {
  for (let i = 0; i < 2; i++) await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/** Loading the plugin crosses to the test runner and back, so wait for it rather than guess. */
const soon = { timeout: 5_000, interval: 10 };

/** softTick, called with the clock standing at `ms`. */
function tickAt(softTick: () => void, ms: number) {
  const clock = vi.spyOn(Date, "now").mockReturnValue(ms);
  softTick();
  clock.mockRestore();
}

/**
 * The wait for a tick that must not come. Our own load of the plugin goes the
 * same road, behind anything softTick started, so once it is back and the loop
 * has turned, a tick softTick had asked for would have been counted.
 */
async function behind() {
  await import("@capacitor/haptics").catch(() => {});
  await settle();
}

const unhandled: unknown[] = [];
const onUnhandled = (reason: unknown) => void unhandled.push(reason);

beforeEach(() => {
  unhandled.length = 0;
  process.on("unhandledRejection", onUnhandled);
});

afterEach(() => {
  process.off("unhandledRejection", onUnhandled);
  vi.restoreAllMocks();
  // A fresh softTick each time: it remembers when it last ticked.
  vi.resetModules();
});

describe("the soft tick", () => {
  it("does nothing in a browser, and never loads the plugin", async () => {
    const gone = missingPlugin();
    const softTick = await load(() => false, gone.factory);
    softTick();
    // Our own load goes the same road, behind anything softTick started.
    await expect(import("@capacitor/haptics")).rejects.toThrow();
    await settle();
    expect(gone.loads).toBe(1);
  });

  it("gives the phone one light impact", async () => {
    const haptics = plugin();
    const softTick = await load(() => true, haptics.factory);
    softTick();
    await vi.waitFor(() => expect(haptics.impact).toHaveBeenCalledTimes(1), soon);
    expect(haptics.impact).toHaveBeenCalledWith({ style: "LIGHT" });
    expect(haptics.loads).toBe(1);
  });

  it("makes one tick of two marks that land together", async () => {
    // Finishing the morning rule is also what keeps the day: one tap, one tick.
    const haptics = plugin();
    const softTick = await load(() => true, haptics.factory);
    tickAt(softTick, 1_000_000);
    await vi.waitFor(() => expect(haptics.impact).toHaveBeenCalledTimes(1), soon);
    // The second mark is made only once the first load is back. Of two loads
    // of a stood-in module that overlap, vitest gives the second the real
    // module, so a tick wrongly given there would never be counted.
    tickAt(softTick, 1_000_000);
    tickAt(softTick, 1_000_399);
    await behind();
    expect(haptics.impact).toHaveBeenCalledTimes(1);
  });

  it("ticks again once the moment has passed", async () => {
    const haptics = plugin();
    const softTick = await load(() => true, haptics.factory);
    tickAt(softTick, 1_000_000);
    // One load at a time here too, for the same reason.
    await vi.waitFor(() => expect(haptics.impact).toHaveBeenCalledTimes(1), soon);
    tickAt(softTick, 1_000_400);
    await vi.waitFor(() => expect(haptics.impact).toHaveBeenCalledTimes(2), soon);
  });

  it("stays quiet when the plugin cannot be loaded", async () => {
    const gone = missingPlugin();
    const softTick = await load(() => true, gone.factory);
    expect(() => softTick()).not.toThrow();
    await vi.waitFor(() => expect(gone.loads).toBe(1), soon);
    await settle();
    expect(unhandled).toEqual([]);
  });

  it("stays quiet when the phone refuses the tick", async () => {
    const haptics = plugin(async () => {
      throw new Error("no vibrator");
    });
    const softTick = await load(() => true, haptics.factory);
    expect(() => softTick()).not.toThrow();
    await vi.waitFor(() => expect(haptics.impact).toHaveBeenCalledTimes(1), soon);
    await settle();
    expect(unhandled).toEqual([]);
  });

  it("stays quiet when the call to the phone throws outright", async () => {
    const haptics = plugin(() => {
      throw new Error("the bridge is down");
    });
    const softTick = await load(() => true, haptics.factory);
    expect(() => softTick()).not.toThrow();
    await vi.waitFor(() => expect(haptics.impact).toHaveBeenCalledTimes(1), soon);
    await settle();
    expect(unhandled).toEqual([]);
  });

  it("never throws, whatever the native check does", async () => {
    const haptics = plugin();
    const softTick = await load(() => {
      throw new Error("no window");
    }, haptics.factory);
    expect(() => softTick()).not.toThrow();
    await settle();
    expect(haptics.loads).toBe(0);
  });
});

describe("where the tick is given", () => {
  it("has no way to buzz a browser", () => {
    const src = readFileSync("lib/ui/softTick.ts", "utf8");
    // A call, not prose: the header names the thing it leaves out.
    expect(src).not.toMatch(/navigator\.vibrate\s*\(/);
    expect(src).toMatch(/if \(!isNativeClient\(\)\) return;/);
  });

  it("goes through this helper at each of its moments", () => {
    for (const file of [
      "components/prayers/PrayerRuleReader.tsx", // a prayer rule finished
      "lib/streak/useStreak.ts", // the day kept
      "components/bible/VerseRow.tsx", // a verse saved
      "components/bible/ReaderMoreSheet.tsx", // a chapter saved, from the reader's ••• (1.8)
      "components/bible/ChapterBookmarkButton.tsx", // the same save, on the website's wide screen
      "components/today/VerseCardActions.tsx", // the verse of the day saved
    ]) {
      const src = readFileSync(file, "utf8");
      expect(src, `${file} does not use lib/ui/softTick`).toMatch(/from "@\/lib\/ui\/softTick"/);
    }
  });
});
