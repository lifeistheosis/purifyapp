// One surface at the foot (build 98 note 14, his word of 2026-11-15: "also
// there's a small stutter when switching between these screens", the reader's
// dock over the tab bar while a track was loaded).
//
// While anything is loaded, the reader's dock is the player on a page that is
// the player for everything (components/bible/ReaderDock.tsx) and the mini
// player is everywhere else. The mini player used to leave by a render that
// came after the page switch's picture (if (!visible) return null), so it cut
// out and in under a moving page. Now it is never taken away for such a page:
// it stays mounted, unseen under the page's class, which the page writes in
// the commit that brings it, and the dock and the bar wear one name in the
// View Transitions, so the one changes into the other inside the switch.
//
// What a reader would notice if this broke: the bar gone a moment after the
// Bible arrives, or arriving a moment after the page it comes back over; two
// players at once, or the page keeping room for a bar that is not drawn.

import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  audio: {
    src: "https://audio.purifyapp.net/read/john/10.mp3" as string | null,
    title: "John 10" as string | null,
    artist: "St John the Theologian" as string | null,
    art: null as string | null,
    artFallback: null as string | null,
    playing: true,
    currentTime: 30,
    duration: 120,
  },
  sound: null as string | null,
  own: ["*"] as string[],
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
vi.mock("@/lib/player/pagePlayer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/player/pagePlayer")>()),
  usePagePlayer: () => state.own,
}));

import { NowPlayingBar } from "@/components/prayers/NowPlayingBar";
import * as pagePlayer from "@/lib/player/pagePlayer";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const css = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8");
const own = fs.readFileSync(path.join(ROOT, "lib/player/pagePlayer.ts"), "utf8");

describe("the mini player on a page that is the player for everything", () => {
  it("stays mounted with a track loaded, so a page switch pictures it", () => {
    state.own = ["*"];
    state.sound = null;
    const html = renderToStaticMarkup(createElement(NowPlayingBar));
    expect(html).toContain("data-mini-player");
    expect(html).toContain("mini-player-card");
  });

  it("stays mounted with a sound playing alone", () => {
    state.own = ["*"];
    state.audio.src = null;
    state.sound = "rain";
    const html = renderToStaticMarkup(createElement(NowPlayingBar));
    expect(html).toContain("data-mini-player");
    state.audio.src = "https://audio.purifyapp.net/read/john/10.mp3";
    state.sound = null;
  });

  it("still steps aside for a chant's page that plays its own recording", () => {
    state.own = ["/read/john/10.mp3"];
    expect(renderToStaticMarkup(createElement(NowPlayingBar))).toBe("");
    state.own = ["*"];
  });
});

describe("the page's class", () => {
  it("is written by the page itself in its layout effect, and taken back with it", () => {
    expect((pagePlayer as Record<string, unknown>).HOSTS_CLASS).toBe("hosts-player");
    expect(own).toContain("if (hosts) root.classList.add(HOSTS_CLASS);");
    expect(own).toContain("if (hosts) root.classList.remove(HOSTS_CLASS);");
  });

  it("hides the mini player and gives back its room, keeping focus mode's own", () => {
    expect(css).toMatch(/html\.hosts-player \[data-mini-player\] \{\s*display: none;/);
    expect(css).toMatch(/html\.hosts-player\.has-now-playing,\s*html\.hosts-player\.has-now-playing\.now-playing-drawn \{\s*--now-playing-h: 0px;/);
    expect(css).toMatch(/html\.hosts-player\.reader-focus\.has-reader-dock \{\s*--now-playing-h: 64px;/);
  });
});

describe("the dock and the mini player", () => {
  it("wear one name in the View Transitions, moving on the house curve inside the page switch", () => {
    expect(css).toMatch(/\.mini-player,\s*\.reader-dock \{\s*view-transition-name: foot-player;/);
    expect(css).toMatch(/::view-transition-group\(foot-player\) \{\s*animation-duration: var\(--duration-route-enter\);\s*animation-timing-function: var\(--ease-house\);/);
  });
});
