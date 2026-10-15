import { afterEach, beforeEach, describe, expect, it } from "vitest";

import en from "@/lib/i18n/messages/en.json";
import { localDay, markAsked, setAskBeforePrayers, shouldAsk } from "@/lib/player/chantAsk";
import { CHANTS, previewSrc } from "@/lib/player/chants";

const MESSAGES = en as Record<string, string>;

describe("the chants a prayer can play under it", () => {
  it("names each one in the catalog, once", () => {
    expect(CHANTS.length).toBeGreaterThanOrEqual(1);
    expect(new Set(CHANTS.map((c) => c.id)).size).toBe(CHANTS.length);
    for (const c of CHANTS) {
      expect(MESSAGES[c.titleKey], c.id).toBeTruthy();
      expect(c.src.startsWith("/audio/"), c.id).toBe(true);
    }
  });

  it("previews a stretch of 8 to 20 seconds that is sung, from a sung line", () => {
    for (const c of CHANTS) {
      const { from, to } = c.preview;
      expect(to - from, c.id).toBeGreaterThanOrEqual(8);
      expect(to - from, c.id).toBeLessThanOrEqual(20);
      const times = (c.captions ?? []).map((l) => l.time ?? -1).filter((t) => t >= 0);
      // It starts within a second of a line beginning, so it never opens
      // mid-word, and it ends before the song does.
      expect(times.some((t) => Math.abs(t - from) <= 1), c.id).toBe(true);
      expect(Math.max(...times), c.id).toBeGreaterThan(to);
    }
  });

  it("plays the preview by its own address, so it stops there by itself", () => {
    const c = CHANTS[0];
    expect(previewSrc(c)).toBe(`${c.src}#t=${c.preview.from},${c.preview.to}`);
  });
});

describe("when a prayer asks", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => void store.set(k, v),
        },
      },
    });
  });
  afterEach(() => {
    // @ts-expect-error -- the node test environment has no window of its own.
    delete globalThis.window;
  });

  const morning = new Date(2026, 9, 16, 7, 30);
  const evening = new Date(2026, 9, 16, 21, 0);
  const tomorrow = new Date(2026, 9, 17, 7, 30);

  it("asks once a day, and not while something plays", () => {
    expect(shouldAsk(true, morning)).toBe(false);
    expect(shouldAsk(false, morning)).toBe(true);
    markAsked(morning);
    expect(shouldAsk(false, evening)).toBe(false);
    expect(shouldAsk(false, tomorrow)).toBe(true);
  });

  it("never asks once the reader turns it off, until they turn it on", () => {
    setAskBeforePrayers(false);
    expect(shouldAsk(false, tomorrow)).toBe(false);
    setAskBeforePrayers(true);
    expect(shouldAsk(false, tomorrow)).toBe(true);
  });

  it("counts the day by the reader's own clock", () => {
    expect(localDay(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});
