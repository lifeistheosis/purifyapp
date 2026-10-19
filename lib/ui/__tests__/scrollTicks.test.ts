// The click as a row is scrolled by hand (the chapter strip, the century
// timeline). One click per item passing the row's middle, only from a hand,
// never closer than MIN_GAP_MS, and nothing at all in a browser. The why is
// in ../scrollTicks.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { slotAt } from "../scrollTicks";

type Platform = "ios" | "android" | null;

/** A stand-in for the plugin, recording each call in order. */
function plugin() {
  const calls: string[] = [];
  const p = {
    calls,
    loads: 0,
    factory: () => {
      p.loads += 1;
      const record = (name: string) => async (options?: { duration?: number }) => {
        calls.push(options?.duration !== undefined ? `${name}:${options.duration}` : name);
      };
      return {
        Haptics: {
          vibrate: record("vibrate"),
          selectionStart: record("selectionStart"),
          selectionChanged: record("selectionChanged"),
          selectionEnd: record("selectionEnd"),
        },
      };
    },
  };
  return p;
}

/**
 * A row 100px wide whose items' middles sit at `middles` along it, as the
 * browser would report them for wherever the row is scrolled to.
 */
class Row extends EventTarget {
  scrollLeft = 0;
  clientWidth = 100;
  clientLeft = 0;
  readonly middles: number[];
  constructor(middles: number[]) {
    super();
    this.middles = middles;
  }
  getBoundingClientRect() {
    return { left: 0, width: this.clientWidth };
  }
  querySelectorAll() {
    return this.middles.map((m) => ({
      getBoundingClientRect: () => ({ left: m - 10 - this.scrollLeft, width: 20 }),
    }));
  }
  fire(type: string) {
    this.dispatchEvent(new Event(type));
  }
  scrollTo(left: number) {
    this.scrollLeft = left;
    this.fire("scroll");
  }
}

/** attachScrollTicks, loaded fresh in the given shell with the plugin stood in for. */
async function load(platform: Platform, p: ReturnType<typeof plugin>) {
  vi.resetModules();
  vi.doMock("@/lib/platform/native", () => ({
    isNativeClient: () => platform !== null,
    nativePlatform: () => platform,
  }));
  vi.doMock("@capacitor/haptics", p.factory);
  return (await import("../scrollTicks")).attachScrollTicks;
}

const soon = { timeout: 5_000, interval: 10 };

/** Give a started load and its calls a few turns of the loop to land. */
async function settle(ms = 0) {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
  for (let i = 0; i < 3; i++) await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/** The clock performance.now reads, moved by hand. */
let clock = 0;

beforeEach(() => {
  clock = 1_000;
  vi.spyOn(performance, "now").mockImplementation(() => clock);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock("@/lib/platform/native");
  vi.doUnmock("@capacitor/haptics");
});

describe("slotAt", () => {
  it("counts the middles before the row's middle", () => {
    const middles = [20, 60, 100, 140];
    expect(slotAt(middles, 0)).toBe(0);
    expect(slotAt(middles, 20)).toBe(0);
    expect(slotAt(middles, 21)).toBe(1);
    expect(slotAt(middles, 99)).toBe(2);
    expect(slotAt(middles, 141)).toBe(4);
    expect(slotAt([], 50)).toBe(0);
  });
});

describe("attachScrollTicks", () => {
  // Items every 40px from 20: the row's middle starts at 50, between the
  // second and third item.
  const middles = Array.from({ length: 10 }, (_, i) => 20 + i * 40);

  it("clicks once for each item a finger drags past, with a 10 ms pulse on Android", async () => {
    const p = plugin();
    const attach = await load("android", p);
    const row = new Row(middles);
    attach(row as unknown as HTMLElement);

    row.fire("touchstart");
    for (const left of [10, 30, 50, 70, 90]) {
      clock += 100;
      row.scrollTo(left);
    }
    // The middle went from 50 to 140: past the items at 60 and 100, and onto
    // the one at 140 without passing it.
    await vi.waitFor(() => expect(p.calls).toEqual(["vibrate:10", "vibrate:10"]), soon);
  });

  it("keeps clicking through the fling after the finger lifts, then stops", async () => {
    const p = plugin();
    const attach = await load("android", p);
    const row = new Row(middles);
    attach(row as unknown as HTMLElement);

    row.fire("touchstart");
    clock += 100;
    row.scrollTo(20); // the middle at 70: past 60
    row.fire("touchend");
    clock += 100;
    row.scrollTo(60); // 110: past 100
    clock += 100;
    row.scrollTo(100); // 150: past 140
    await settle(250);
    clock += 100;
    row.scrollTo(140); // at rest, the row moved by itself: silent
    await settle();
    expect(p.calls).toEqual(["vibrate:10", "vibrate:10", "vibrate:10"]);
  });

  it("never clicks for a tap, nor for the row centring itself after it", async () => {
    const p = plugin();
    const attach = await load("android", p);
    const row = new Row(middles);
    attach(row as unknown as HTMLElement);

    row.fire("touchstart");
    row.fire("touchend");
    clock += 100;
    row.scrollTo(200);
    await settle();
    expect(p.calls).toEqual([]);
    expect(p.loads).toBe(0);
  });

  it("drops a click that would come closer than MIN_GAP_MS to the last", async () => {
    const p = plugin();
    const attach = await load("android", p);
    const row = new Row(middles);
    attach(row as unknown as HTMLElement);

    row.fire("touchstart");
    clock += 100;
    row.scrollTo(20); // past 60: clicks
    clock += 10;
    row.scrollTo(60); // past 100, 10 ms later: dropped
    clock += 100;
    row.scrollTo(100); // past 140: clicks
    await vi.waitFor(() => expect(p.calls).toEqual(["vibrate:10", "vibrate:10"]), soon);
  });

  it("uses the picker's selection click on iOS, between a start and an end", async () => {
    const p = plugin();
    const attach = await load("ios", p);
    const row = new Row(middles);
    attach(row as unknown as HTMLElement);

    row.fire("touchstart");
    clock += 100;
    row.scrollTo(20);
    clock += 100;
    row.scrollTo(60);
    row.fire("touchend");
    await settle(250);
    expect(p.calls).toEqual(["selectionStart", "selectionChanged", "selectionChanged", "selectionEnd"]);
  });

  it("does nothing at all in a browser: no listeners, no plugin", async () => {
    const p = plugin();
    const attach = await load(null, p);
    const row = new Row(middles);
    const listen = vi.spyOn(row, "addEventListener");
    attach(row as unknown as HTMLElement);

    row.fire("touchstart");
    clock += 100;
    row.scrollTo(100);
    await settle();
    expect(listen).not.toHaveBeenCalled();
    expect(p.loads).toBe(0);
  });

  it("lets go of the row when stopped", async () => {
    const p = plugin();
    const attach = await load("android", p);
    const row = new Row(middles);
    const stop = attach(row as unknown as HTMLElement);
    stop();

    row.fire("touchstart");
    clock += 100;
    row.scrollTo(100);
    await settle();
    expect(p.calls).toEqual([]);
  });
});
