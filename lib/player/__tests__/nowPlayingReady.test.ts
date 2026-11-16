// Now Playing opens smoothly (build 98 note 8, his word of 2026-11-15: "make
// the music player opening more smooth"; Updates 98e).
//
// On build 98 the tap mounted the whole screen and slid it two frames later;
// in the motion walk at a phone's speed (CPU 4x) it appeared about 250ms
// after the tap already up, with no slide at all, and the blurred picture
// behind it moved with it as it went down (15 frames). Now it stands built
// and drawn closed while anything is loaded, so a tap only slides it; the
// blur comes once the slide has ended and goes as the slide down starts; and
// the mini player's picture is carried up into the cover's place.
//
// What a reader would notice if this broke: the screen popping up late
// instead of rising, a soft grey picture swimming as it slides, or the cover
// appearing from nowhere instead of rising out of the mini player's disc.

import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ open: false }));

vi.mock("@/lib/prayers/persistentAudioStore", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/prayers/persistentAudioStore")>();
  return {
    ...real,
    usePersistentAudio: () => ({
      volume: 1,
      loopMode: "off",
      artFallback: null,
      captions: null,
      rtl: false,
      rate: 1,
      sleep: { kind: "off" },
      failed: false,
      src: "https://audio.purifyapp.net/read/john/10.mp3",
      title: "John 10",
      artist: "St John the Theologian",
      art: "/icons/saints/john.webp",
      playing: true,
      currentTime: 30,
      duration: 120,
    }),
  };
});
// The saved line (Updates 98d's, components/player/SaveOffline.tsx) and the
// Read link need the app's router, which is not what is tested here.
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {}, prefetch: () => {}, refresh: () => {}, forward: () => {} }),
  usePathname: () => "/prayers/",
}));
vi.mock("next/link", async () => {
  const { createElement: h } = await import("react");
  return { default: ({ href, children, className }: { href: string; children?: unknown; className?: string }) => h("a", { href, className }, children as never) };
});
vi.mock("@/lib/player/sheet", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/player/sheet")>()),
  useNowPlayingSheet: () => ({ open: state.open, view: "cover" }),
}));

import { NowPlayingSheet } from "@/components/player/NowPlayingSheet";
import { noteCarryFrom, takeCarry } from "@/lib/player/carry";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8");
const SHEET = read("components/player/NowPlayingSheet.tsx");
const BAR = read("components/prayers/NowPlayingBar.tsx");
const CSS = read("app/globals.css");

describe("Now Playing stands built while anything is loaded", () => {
  it("is drawn closed before any tap: unseen, out of reach, and no dialog", () => {
    state.open = false;
    const html = renderToStaticMarkup(createElement(NowPlayingSheet));
    expect(html).toContain("data-now-playing");
    expect(html).toContain("now-playing-closed");
    expect(html).toContain('aria-hidden="true"');
    // Out of reach by the closed class's visibility; inert on its root only while it slides down (Updates 98h).
    expect(CSS).toMatch(/\.now-playing-closed \{\s*visibility: hidden;/);
    expect(html).not.toContain('role="dialog"');
    // The large cover is in it already, decoding before the tap.
    expect(html).toContain("/icons/saints/john.webp");
    // And no blur stands in it while it is not up and still.
    expect(html).not.toContain("blur(");
  });

  it("is unseen once its slide down has run, seen at once as it opens", () => {
    expect(CSS).toMatch(/\.now-playing-closed \{\s*visibility: hidden;\s*transition: visibility 0s linear 380ms;/);
    expect(CSS).toMatch(/:where\(\[data-motion="reduce"\]\) \.now-playing-closed \{\s*transition: none;/);
  });

  it("slides on the house curve, which the carried picture shares", () => {
    expect(SHEET).toContain("transition-transform duration-[380ms] ease-[var(--ease-house)]");
    expect(SHEET).not.toContain("cubic-bezier(0.2,0.8,0.2,1)");
    expect(SHEET).toContain('const HOUSE = "cubic-bezier(0.22, 1, 0.36, 1)";');
    expect(CSS).toContain("--ease-house: cubic-bezier(0.22, 1, 0.36, 1);");
  });
});

describe("the blurred picture behind it", () => {
  it("is drawn only once the slide has ended, and faded in where it stands", () => {
    // The small blurred canvas (Updates 98h), or the cover under the filter where a canvas takes none: either only once settled.
    expect(SHEET).toMatch(/\{audio\.art && up && settled \? \(\s*bakes \? \(\s*shownBackdrop \? \(\s*<canvas[\s\S]{0,120}className="now-playing-backdrop [\s\S]{0,200}<CoverArt[\s\S]{0,200}className="now-playing-backdrop /);
    expect(SHEET).toContain("if (e.target === e.currentTarget && up) setSettled(true);");
    expect(CSS).toMatch(/@keyframes now-playing-backdrop-in \{\s*from \{ opacity: 0; \}\s*to \{ opacity: 0\.3; \}/);
    expect(CSS).toMatch(/:where\(\[data-motion="reduce"\]\) \.now-playing-backdrop \{\s*animation: none;/);
  });
});

describe("the mini player's picture, carried up into the cover's place", () => {
  afterEach(() => {
    delete (globalThis as { getComputedStyle?: unknown }).getComputedStyle;
    vi.useRealTimers();
  });

  const disc = { getBoundingClientRect: () => ({ left: 20, top: 760, width: 36, height: 36 }) } as unknown as Element;

  it("is noted where it stands as either open button is tapped", () => {
    expect(BAR.match(/onClickCapture=\{noteCarry\}\s*onClick=\{\(\) => openNowPlaying\(\)\}/g)).toHaveLength(2);
    expect(BAR).toContain('noteCarryFrom(e.currentTarget.querySelector("img"))');
  });

  it("is taken once, and only for the opening it was noted for", () => {
    vi.useFakeTimers();
    (globalThis as { getComputedStyle?: unknown }).getComputedStyle = () => ({ borderTopLeftRadius: "9999px" });
    noteCarryFrom(disc);
    expect(takeCarry()).toEqual({ left: 20, top: 760, width: 36, height: 36, round: true });
    expect(takeCarry()).toBeNull();
    noteCarryFrom(disc);
    vi.advanceTimersByTime(800);
    expect(takeCarry()).toBeNull();
  });

  it("flies by transform and opacity alone, on the slide's time, never under reduced motion or beside the page", () => {
    expect(SHEET).toContain("const from = takeCarry();");
    expect(SHEET).toContain("if (still() || window.matchMedia(WIDE).matches) return;");
    expect(SHEET).toMatch(/flight\.animate\(\s*\[\s*\{ transform: `translate\(/);
    expect(SHEET).toContain("round.animate([{ opacity: from.round ? 1 : 0 }, { opacity: 0 }]");
    expect(SHEET).toContain('const timing: KeyframeAnimationOptions = { duration: SLIDE_MS, easing: HOUSE, fill: "both" };');
    // The cover waits unseen while the copy flies, and is shown in the frame it lands.
    expect(CSS).toMatch(/\[data-now-playing\]\[data-carrying\] \[data-carry-to\] img \{\s*visibility: hidden;/);
    expect(SHEET).toContain("delete root.dataset.carrying;");
  });
});
