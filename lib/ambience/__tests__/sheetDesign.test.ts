// The ambience sheet's design of build 95, note 22 (his "can you revamp the
// ambience design? I want each button to have a photo of the corresponding
// aesthetic of the sound"), with note 11's walk folded in (the arbiter,
// 2026-11-13): the sounds rose 213 to 240px under the finger as a sound
// began, because the sheet stands on the screen's foot and grew upward with
// what the sound added below them.
//
// So: each tile carries its sound's photograph, above its name; the sounds
// stand last in the sheet, at its foot, and what a playing sound adds (the
// volume, each sound's own volume, the sleep timer) opens above them; and the
// sleep timer's line keeps its place while the timer is off.

import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AmbienceSnapshot } from "@/lib/ambience/player";

let plus: boolean | null;
let snap: AmbienceSnapshot;

vi.mock("next/navigation", () => ({ usePathname: () => "/bible/john/1" }));
vi.mock("@/components/i18n/MessagesProvider", () => ({ useTranslate: () => ({ t: (k: string) => k, locale: "en" }) }));
vi.mock("@/components/ui/Sheet", () => ({
  Sheet: ({ open, titleExtra, children }: { open: boolean; titleExtra?: ReactNode; children: ReactNode }) =>
    open ? createElement("div", { role: "dialog" }, titleExtra, children) : null,
}));
vi.mock("@/components/billing/UpgradeModal", () => ({
  UpgradeModalProvider: ({ children }: { children: ReactNode }) => children,
  useUpgradeModal: () => ({ open: () => {} }),
}));
vi.mock("@/lib/entitlements/usePlusFeatures", () => ({ usePlusFeatures: () => plus }));
vi.mock("@/lib/ambience/sheet", () => ({ useAmbienceSheet: () => ({ open: true, overPlayer: false }), closeAmbience: () => {} }));
vi.mock("@/lib/ambience/player", () => ({
  DEFAULT_LEVEL: 1,
  useAmbience: () => snap,
  layerAmbience: async () => {},
  setAmbienceBalance: () => {},
  setAmbienceLevel: () => {},
  setAmbienceVolume: () => {},
}));
vi.mock("@/lib/player/sleep", () => ({
  isChosen: () => false,
  minutesLeft: () => 0,
  setSleepTimer: () => {},
  useSleepTimer: () => ({ kind: "off" }),
}));
vi.mock("@/lib/prayers/persistentAudioStore", () => ({
  getAudioSnapshot: () => ({ playing: false, src: null }),
  subscribeAudio: () => () => {},
}));

const QUIET: AmbienceSnapshot = { playing: null, loading: null, failed: null, failedFor: null, volume: 0.55, balance: 0.4, last: null, layers: [], levels: {} };

beforeEach(() => {
  plus = true;
  snap = { ...QUIET };
});

async function sheet(): Promise<string> {
  const { AmbienceSheet } = await import("@/components/player/AmbienceSheet");
  return renderToStaticMarkup(createElement(AmbienceSheet));
}

describe("the ambience sheet's tiles (build 95, note 22)", () => {
  it("each carries its sound's own photograph, bundled beside the sound, over its own colour", async () => {
    const { AMBIENCE_TRACKS } = await import("@/lib/ambience/ambience");
    const html = await sheet();
    for (const t of AMBIENCE_TRACKS) {
      expect(html, t.id).toContain(`src="${t.photo.src}"`);
      expect(html, t.id).toContain(`background-color:${t.photo.ground}`);
    }
    // Decorative: the name beside it says what it is.
    expect((html.match(/<img [^>]*alt=""/g) ?? []).length).toBe(AMBIENCE_TRACKS.length);
  });
});

describe("the ambience sheet holds the sounds still (note 11's walk, in note 22)", () => {
  it("stands the sounds last, at the sheet's foot, with what a playing sound adds above them", async () => {
    snap = { ...QUIET, playing: "rain", layers: ["rain"] };
    const html = await sheet();
    const volume = html.indexOf("ambience.volume");
    const sleep = html.indexOf("player.sleep");
    const firstTile = html.indexOf("data-ambience-tile=");
    expect(volume).toBeGreaterThan(-1);
    expect(sleep).toBeGreaterThan(-1);
    expect(firstTile).toBeGreaterThan(sleep);
    expect(html.indexOf("ambience.layerHint")).toBeLessThan(firstTile);
  });

  it("keeps what a sound adds in the sheet while none plays, closed and out of reach, so it can open above them", async () => {
    const html = await sheet();
    const closed = html.slice(0, html.indexOf("data-ambience-tile="));
    expect(closed).toContain("ambience.volume");
    expect(closed).toContain("grid-rows-[0fr]");
    expect(closed).toMatch(/aria-hidden="true"[^>]*inert=""|inert=""[^>]*aria-hidden="true"/);
  });

  it("keeps the sleep timer's line in its place while the timer is off", async () => {
    snap = { ...QUIET, playing: "rain", layers: ["rain"] };
    const html = await sheet();
    expect(html).toMatch(/<p role="status" class="[^"]*invisible[^"]*"> <\/p>/);
  });

  it("opens each sound's own volume above the sounds while two play", async () => {
    snap = { ...QUIET, playing: "rain", layers: ["rain", "bell"] };
    const html = await sheet();
    const firstTile = html.indexOf("data-ambience-tile=");
    expect(html.indexOf('aria-label="ambience.rain"')).toBeGreaterThan(-1);
    expect(html.indexOf('aria-label="ambience.rain"')).toBeLessThan(firstTile);
    expect(html.indexOf('aria-label="ambience.bell"')).toBeLessThan(firstTile);
  });
});

describe("a sound that takes another's place moves nothing above the sounds (Updates 28's walk, 2026-11-13)", () => {
  // Two play and a third is tapped: the first stops at once, and the third
  // plays once it has loaded. Between the two only one played, so the sheet
  // folded both sounds' own volumes away, opened the line for a second sound,
  // and a breath later did the opposite: the sheet's top dropped and rose
  // again, and the sounds under the finger moved with it ("The sea: takes
  // Rain's place", 7px; the gate's limit is 4).
  it("counts the sound still loading beside the one that plays, so both volumes stay open", async () => {
    snap = { ...QUIET, playing: "bell", layers: ["bell"], loading: "sea" };
    const html = await sheet();
    const firstTile = html.indexOf("data-ambience-tile=");
    expect(html.indexOf('aria-label="ambience.bell"')).toBeGreaterThan(-1);
    expect(html.indexOf('aria-label="ambience.sea"')).toBeGreaterThan(-1);
    expect(html.indexOf('aria-label="ambience.sea"')).toBeLessThan(firstTile);
  });

  /** The opening tag of the glide that holds the words a key names. */
  const glideOf = (html: string, key: string) => {
    const inner = html.lastIndexOf('<div class="min-h-0 overflow-hidden">', html.indexOf(key));
    const tag = html.lastIndexOf("<div", inner - 1);
    return html.slice(tag, html.indexOf(">", tag) + 1);
  };

  it("keeps the line for a second sound closed while the second is loading", async () => {
    snap = { ...QUIET, playing: "bell", layers: ["bell"], loading: "sea" };
    const tag = glideOf(await sheet(), "ambience.layerHint");
    expect(tag).toContain("grid-rows-[0fr]");
    expect(tag).toContain('aria-hidden="true"');
  });

  it("opens the line for a second sound while one plays and none is loading", async () => {
    snap = { ...QUIET, playing: "bell", layers: ["bell"] };
    const tag = glideOf(await sheet(), "ambience.layerHint");
    expect(tag).toContain("grid-rows-[1fr]");
    expect(tag).not.toContain("aria-hidden");
  });
});
