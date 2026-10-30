// The mini player steps aside (1.8, the owner's pick B of r3-05, "the small
// pill"; his note 4 on build 80: "make it so that when you scroll or you
// start doing other stuff, it kind of minimizes, but it's still there"). The
// cover is a disc in a ring that is how far it has played, lit white while it
// plays and grey while it waits; on a scroll down the card draws in to a pill
// over the tabs with the disc, the name and Play, and it comes back on a
// scroll up and at the top of every page (lib/ui/__tests__/scrollAway.test.ts
// holds that rule, footRoom.test.ts the room each page keeps for it).
//
// What a reader would notice if this broke: a pill with no way to pause, or
// with one that opens Now Playing instead; the ring lit while paused or grey
// while playing; two players at once, or a hidden one a finger or a key can
// still reach; the drawing in played to a reader who asked for no motion.
//
// The bar is rendered to static markup with the player's stores stood in:
// there is no DOM here, and outside a MessagesProvider every string is its
// own key, which is enough to tell which one is used.

import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  audio: {
    src: "https://purifyapp.net/audio/read/luke-1.mp3" as string | null,
    title: "Luke 1" as string | null,
    artist: "St Luke the Evangelist" as string | null,
    art: "https://purifyapp.net/covers/luke.v1.jpg" as string | null,
    artFallback: null as string | null,
    playing: false,
    currentTime: 30,
    duration: 120,
  },
  sound: null as string | null,
}));

vi.mock("@/lib/prayers/persistentAudioStore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/prayers/persistentAudioStore")>()),
  usePersistentAudio: () => state.audio,
}));
vi.mock("@/lib/player/sheet", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/player/sheet")>()),
  useNowPlayingSheet: () => ({ open: false, view: "cover" }),
}));
vi.mock("@/lib/ambience/player", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ambience/player")>()),
  useAmbience: () => ({ playing: state.sound, loading: null, failed: null, volume: 0.5, balance: 0.5 }),
}));

import { RING_SIZES, RingCover, ringArc } from "@/components/player/RingCover";
import { NowPlayingBar } from "@/components/prayers/NowPlayingBar";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const css = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8");
const bar = fs.readFileSync(path.join(ROOT, "components/prayers/NowPlayingBar.tsx"), "utf8");

/** The bar as it first appears, playing or not; and its two faces apart. */
function render(playing: boolean) {
  state.audio.playing = playing;
  const html = renderToStaticMarkup(createElement(NowPlayingBar));
  const card = html.slice(html.indexOf("mini-player-card"), html.indexOf("mini-player-pill"));
  const pill = html.slice(html.indexOf("mini-player-pill"));
  return { html, card, pill };
}

const labels = (html: string) => [...html.matchAll(/<button[^>]*aria-label="([^"]*)"/g)].map((m) => m[1]);

describe("the mini player as it first appears", () => {
  it("is the card, with the pill drawn but out of reach", () => {
    const { html } = render(false);
    expect(html).toContain('data-mini-player=""');
    expect(html).toContain('data-screen-edge="bottom"');
    expect(html).not.toContain("data-drawn");
    // The card's face is live; the pill's is there to draw in to, and no
    // finger, key or screen reader reaches it until it has.
    expect(html).toMatch(/<div class="mini-player-card /);
    expect(html).toMatch(/<div inert="" aria-hidden="true" class="mini-player-pill /);
    expect(html.match(/inert=""/g)?.length).toBe(1);
  });

  it("shows the cover as a disc in its ring, and no line along its foot", () => {
    const { card } = render(false);
    expect(card).toMatch(/data-ring="waiting" class="relative grid shrink-0 place-items-center text-paper size-11"/);
    expect(card).toMatch(/<img[^>]*class="img-arrive object-cover relative rounded-full size-9 object-\[50%_18%\]"/);
    // 1.7's thin line for how far it had played: the ring says it now.
    expect(bar).not.toMatch(/h-\[2px\]/);
  });

  it("keeps the card's own controls: open, play, and the cross", () => {
    const { card } = render(false);
    expect(labels(card)).toEqual(["prayers.nowPlaying: Luke 1", "prayers.play", "prayers.dismissPlayer"]);
    expect(card).toContain("St Luke the Evangelist");
  });
});

describe("the pill it draws in to", () => {
  it("holds the disc, the name and Play, and nothing else", () => {
    const { pill } = render(false);
    // The name opens Now Playing, as the card does; Play plays where it is.
    expect(labels(pill)).toEqual(["prayers.nowPlaying: Luke 1", "prayers.play"]);
    expect(pill).toMatch(/data-ring="waiting" class="relative grid shrink-0 place-items-center text-paper size-8"/);
    expect(pill).toMatch(/<img[^>]*class="img-arrive object-cover relative rounded-full size-6 object-\[50%_18%\]"/);
    expect(pill).toContain(">Luke 1</span>");
    expect(pill).not.toContain("St Luke the Evangelist");
    expect(pill).not.toContain("prayers.dismissPlayer");
  });

  it("pauses where it is while it plays, and its ring is lit", () => {
    const { card, pill } = render(true);
    expect(labels(pill)).toEqual(["prayers.nowPlaying: Luke 1", "prayers.pause"]);
    expect(labels(card)).toContain("prayers.pause");
    for (const face of [card, pill]) {
      expect(face).toContain('data-ring="lit"');
      expect(face).toContain("mini-player-ring-lit");
    }
  });

  it("works its controls in place: the name opens Now Playing, the button plays or pauses", () => {
    // The track's pill: the second pill={...}, before the shell.
    const faces = bar.slice(0, bar.indexOf("The room the page gives back"));
    const track = faces.slice(faces.lastIndexOf("pill={"));
    expect(track).toMatch(/onClick=\{\(\) => openNowPlaying\(\)\}/);
    expect(track).toMatch(/<PillButton onClick=\{toggle\} label=\{toggleLabel\}>/);
    expect(bar).toMatch(/const toggle = \(\) => \(playing \? pause\(\) : play\(\)\);/);
  });

  it("gives every control on it a 44px touch box", () => {
    expect(bar).toMatch(/function PillButton[\s\S]*?className="tap-press hit-44 /);
    for (const m of bar.matchAll(/className="tap-press [^"]*flex h-full[^"]*"/g)) expect(m[0]).toContain("hit-44");
  });

  it("is the sound's own while a sound plays alone: its mark, its name and Stop", () => {
    const track = state.audio.src;
    state.audio.src = null;
    state.sound = "rain";
    try {
      const { card, pill } = render(false);
      expect(labels(card)).toEqual(["ambience.playingAria", "ambience.stop"]);
      expect(labels(pill)).toEqual(["ambience.playingAria", "ambience.stop"]);
      expect(pill).toContain(">ambience.rain</span>");
      // No ring: a sound has no length to show.
      expect(pill).not.toContain("data-ring");
    } finally {
      state.audio.src = track;
      state.sound = null;
    }
  });
});

describe("the ring", () => {
  it("is as long as the circle, and lit as far as it has played", () => {
    const { r, length, lit } = ringArc(RING_SIZES.card.box, 0.25);
    expect(r).toBe(20.5);
    expect(length).toBeCloseTo(2 * Math.PI * 20.5, 6);
    expect(lit).toBeCloseTo(length / 4, 6);
    expect(ringArc(RING_SIZES.pill.box, 1).lit).toBeCloseTo(ringArc(RING_SIZES.pill.box, 1).length, 6);
  });

  it("lights none of it before the start or for a stream with no length, and no more than all of it", () => {
    expect(ringArc(32, 0).lit).toBe(0);
    expect(ringArc(32, -1).lit).toBe(0);
    expect(ringArc(32, Number.NaN).lit).toBe(0);
    expect(ringArc(32, Number.POSITIVE_INFINITY).lit).toBe(0);
    expect(ringArc(32, 3).lit).toBe(ringArc(32, 3).length);
  });

  it("draws no arc at the start, where a round cap would leave a dot", () => {
    const html = renderToStaticMarkup(createElement(RingCover, { art: null, played: 0, lit: true, size: "pill" }));
    expect(html.match(/<circle/g)?.length).toBe(1);
    expect(html).not.toContain("mini-player-ring-lit");
    // No picture: an empty disc, never a broken image.
    expect(html).not.toContain("<img");
    expect(html).toContain('class="relative rounded-full size-6 bg-paper/10"');
  });

  it("is white and glowing while it plays, grey while it waits, from the top round", () => {
    const lit = renderToStaticMarkup(createElement(RingCover, { art: null, played: 0.5, lit: true, size: "card" }));
    const waiting = renderToStaticMarkup(createElement(RingCover, { art: null, played: 0.5, lit: false, size: "card" }));
    const half = ringArc(44, 0.5);
    for (const html of [lit, waiting]) {
      expect(html).toContain(`stroke-dasharray="${half.lit} ${half.length}"`);
      expect(html).toMatch(/class="absolute inset-0 size-full -rotate-90/);
      expect(html).toContain('stroke-linecap="round"');
    }
    expect(lit).toMatch(/-rotate-90 mini-player-ring-lit"/);
    expect(lit).toMatch(/stroke-opacity="1" stroke-width="2" stroke-linecap="round"/);
    expect(waiting).not.toContain("mini-player-ring-lit");
    expect(waiting).toMatch(/stroke-opacity="0.62" stroke-width="2" stroke-linecap="round"/);
    // The faint track under it, the same in both.
    expect(lit).toContain('stroke-opacity="0.16"');
  });

  it("glows white on the dark palettes and is the plain ink on Parchment", () => {
    expect(css).toMatch(/\.mini-player-ring-lit \{\s*filter: drop-shadow\(0 0 3px rgb\(255 255 255 \/ 0\.95\)\) drop-shadow\(0 0 7px rgb\(255 255 255 \/ 0\.45\)\);\s*\}/);
    expect(css).toMatch(/html\[data-reading-mode="parchment"\] \.mini-player-ring-lit \{\s*filter: none;\s*\}/);
  });
});

describe("drawing in", () => {
  it("narrows, lowers and rounds the one surface to the pill's own size", () => {
    const card = css.match(/\n\.mini-player \{[^}]*\}/)?.[0] ?? "";
    const pill = css.match(/\[data-mini-player\]\[data-drawn\] \.mini-player \{[^}]*\}/)?.[0] ?? "";
    expect(card).toMatch(/width: 100%;\s*height: 3\.5rem;\s*border-radius: 14px;/);
    expect(pill).toMatch(/width: var\(--mini-player-pill-w, 9rem\);\s*height: 2\.5rem;\s*border-radius: 1\.25rem;/);
    for (const prop of ["width", "height", "border-radius"]) expect(card).toContain(`${prop} var(--duration-base) var(--ease-house)`);
    // The width is the pill's own, measured as its name sets it.
    expect(bar).toMatch(/surface\.style\.setProperty\("--mini-player-pill-w", /);
    expect(bar).toMatch(/new ResizeObserver\(measure\)/);
  });

  it("fades the face not shown out of reach, after it has faded", () => {
    expect(css).toMatch(
      /\.mini-player-pill,\s*\[data-mini-player\]\[data-drawn\] \.mini-player-card \{\s*opacity: 0;\s*visibility: hidden;\s*pointer-events: none;\s*transition:\s*opacity var\(--duration-fast\) var\(--ease-house\),\s*visibility 0s linear var\(--duration-fast\);\s*\}/,
    );
    expect(css).toMatch(
      /\.mini-player-card,\s*\[data-mini-player\]\[data-drawn\] \.mini-player-pill \{\s*opacity: 1;\s*visibility: visible;\s*pointer-events: auto;/,
    );
    // And in the markup, both ways round: the hidden face is inert.
    expect(bar).toMatch(/inert=\{drawn\}\s*aria-hidden=\{drawn \|\| undefined\}\s*className="mini-player-card /);
    expect(bar).toMatch(/inert=\{!drawn\}\s*aria-hidden=\{!drawn \|\| undefined\}\s*className="mini-player-pill /);
  });

  it("is simply there or not for a reader who asked for no motion, at the weight of each rule", () => {
    for (const selector of [
      ".mini-player,",
      ".mini-player-card,",
      ".mini-player-pill,",
      "[data-mini-player][data-drawn] .mini-player-card,",
      "[data-mini-player][data-drawn] .mini-player-pill {",
    ]) {
      expect(css, selector).toContain(`:where([data-motion="reduce"]) ${selector}`);
    }
  });

  it("goes by the Bible's own rule, on a scroll alone, and not while the keyboard is on it", () => {
    expect(bar).toMatch(/watchScrollAway\(\(away\) => \{\s*if \(!keyboardOn\(shellRef\.current\)\) setDrawn\(away\);\s*\}\)/);
    // A tap on the page does not draw it in (r3-05's open question, as drawn).
    expect(bar).not.toMatch(/addEventListener\("(click|pointerdown|touchstart)"/);
  });
});
