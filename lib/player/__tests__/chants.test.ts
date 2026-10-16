import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import en from "@/lib/i18n/messages/en.json";
import { readTiming } from "@/lib/chants/media";
import { chantTitleKey } from "@/lib/chants/names";
import { chantIndex } from "@/lib/chants/registry.server";
import type { ChantIndexRow, ChantIndexVariant } from "@/lib/chants/types";
import { localDay, markAsked, setAskBeforePrayers, shouldAsk } from "@/lib/player/chantAsk";
import { choiceId, readChantIndex, underPrayerChoices } from "@/lib/player/chants";
import { previewSrc } from "@/lib/player/preview";

const MESSAGES = en as Record<string, string>;

/** A recording's line starts: from its timing file. */
function lineTimes(v: ChantIndexVariant): number[] {
  const file = path.join("public", v.timing!.replace(/^\//, ""));
  return readTiming(JSON.parse(fs.readFileSync(file, "utf8")))!.lines.map((l) => l.at);
}

describe("the chants a prayer can play under it", () => {
  // Pray with chant opens the same library as Chants (the owner, 2026-10-16):
  // the library's index, narrowed to the recordings marked to play under a
  // prayer.
  const choices = underPrayerChoices(chantIndex());
  const all = choices.flatMap((c) => c.variants.map((v) => ({ chant: c.chant, v })));

  it("are the library's own, each named in the catalog, once", () => {
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(new Set(all.map(({ chant, v }) => choiceId(chant, v))).size).toBe(all.length);
    for (const { chant, v } of all) {
      expect(MESSAGES[chantTitleKey(chant.key)], chant.slug).toBeTruthy();
      expect(v.audio.src.startsWith("/audio/"), `${chant.slug}/${v.id}`).toBe(true);
      expect(v.underPrayer).toBe(true);
    }
  });

  it("previews a stretch of 8 to 20 seconds that is sung, from a sung line", () => {
    for (const { chant, v } of all) {
      const id = `${chant.slug}/${v.id}`;
      const { from, to } = v.preview;
      expect(to - from, id).toBeGreaterThanOrEqual(8);
      expect(to - from, id).toBeLessThanOrEqual(20);
      expect(v.timing, `${id} has a timing file`).toBeTruthy();
      const times = lineTimes(v);
      // It starts within a second of a line beginning, so it never opens
      // mid-word, and it ends before the song does.
      expect(times.some((t) => Math.abs(t - from) <= 1), id).toBe(true);
      expect(Math.max(...times), id).toBeGreaterThan(to);
      expect(to, id).toBeLessThan(v.audio.durationSec);
    }
  });

  it("plays the preview by its own address, so it stops there by itself", () => {
    const { v } = all[0];
    expect(previewSrc(v.audio.src, v.preview.from, v.preview.to)).toBe(`${v.audio.src}#t=${v.preview.from},${v.preview.to}`);
  });

  it("puts a chant that ships in the app first, since it plays with no signal", () => {
    const row = (slug: string, src: string): ChantIndexRow =>
      ({
        slug,
        key: slug,
        title: slug,
        kind: "hymn",
        when: { anytime: true },
        addedOn: "2026-10-16",
        traditions: ["greek"],
        shortest: 60,
        variants: [{ id: "a", language: "el", label: "Ελληνικά", tradition: "greek", performer: null, audio: { src, durationSec: 60 }, preview: { from: 0, to: 10 }, underPrayer: true }],
      }) as ChantIndexRow;
    const order = underPrayerChoices([row("streamed", "/audio/chants/streamed/a.mp3"), row("bundled", "/audio/bundled.mp3")]);
    expect(order.map((c) => c.chant.slug)).toEqual(["bundled", "streamed"]);
    // And a chant with no recording for prayer is not offered at all.
    const none = { ...row("quiet", "/audio/chants/quiet/a.mp3") };
    none.variants = none.variants.map((v) => ({ ...v, underPrayer: false }));
    expect(underPrayerChoices([none])).toEqual([]);
  });

  it("reads the index file the export writes, and nothing else", () => {
    expect(readChantIndex(chantIndex())).not.toBeNull();
    expect(readChantIndex({ slug: "x" })).toBeNull();
    expect(readChantIndex([{ slug: 1 }])).toBeNull();
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
