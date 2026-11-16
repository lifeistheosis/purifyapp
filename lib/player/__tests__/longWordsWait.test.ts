// A long text's words wait for the player to open (Updates 98m, build 98
// note 2). Now Playing stands built while anything is loaded (note 8), and
// its words view draws every word a span (components/player/LiveCaptions.tsx).
// Built closed, a Father's work's words were made and styled in the tap that
// loaded it: on the Four Discourses at 390, the work's Listen tap took the
// page from 2,187 elements to 30,918, 28,657 of them the closed player's
// words, one 454ms task with a restyle of 28,808 elements (traced on the
// export of 8bac0be1 with scripts/gate/listen-walk.mjs --trace --why; with
// every :has() rule taken out of the stylesheet it stayed, 28,801).
//
// What a reader would notice if this broke: the work's Listen, or the dock's
// turn to its next part, catching for half a second on a phone before the
// dock comes; or, the other way, a chapter's or a chant's words no longer
// standing ready, so Now Playing opened on them builds them as it slides.
//
// The sheet is rendered to static markup with the player's stores stood in,
// as the mini player's test does: drawn closed, as before any tap.

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  audio: {
    src: "https://purifyapp.net/audio/listen/work.mp3" as string | null,
    title: "Four Discourses Against the Arians. Discourse I" as string | null,
    artist: "St Athanasius the Great" as string | null,
    art: null as string | null,
    artFallback: null as string | null,
    playing: true,
    currentTime: 3,
    duration: 9000,
    rate: 1,
    loop: "off",
    rtl: false,
    captions: null as { time: number; text: string }[] | null,
  },
  view: "words" as "words" | "cover",
}));

vi.mock("@/lib/prayers/persistentAudioStore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/prayers/persistentAudioStore")>()),
  usePersistentAudio: () => state.audio,
}));
vi.mock("@/lib/player/sheet", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/player/sheet")>()),
  useNowPlayingSheet: () => ({ open: false, view: state.view }),
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push() {}, replace() {}, prefetch() {}, back() {}, refresh() {} }),
  usePathname: () => "/saints/athanasius-the-great/four-discourses-against-the-arians/",
  useSearchParams: () => new URLSearchParams(),
}));

import { NowPlayingSheet } from "@/components/player/NowPlayingSheet";
import { WORDS_BUILT_CLOSED, captionWordCount } from "@/lib/player/captions";

/** `lines` caption lines of `words` words each, a second apart. */
const text = (lines: number, words: number) =>
  Array.from({ length: lines }, (_, i) => ({ time: i, text: Array.from({ length: words }, (_, j) => `word${j}`).join(" ") }));

/** The closed sheet's words, as drawn before any tap: LiveCaptions' box, or none. */
function closedWords(captions: { time: number; text: string }[], view: "words" | "cover" = "words") {
  state.audio.captions = captions;
  state.view = view;
  const html = renderToStaticMarkup(createElement(NowPlayingSheet));
  expect(html).toContain("now-playing-closed");
  return { box: html.includes('data-sung-look="player"'), spans: (html.match(/word\d+/g) ?? []).length };
}

describe("a long text's words wait for the player to open", () => {
  it("counts a text's words as the words view draws them, one span each", () => {
    expect(captionWordCount(null)).toBe(0);
    expect(captionWordCount([{ time: 0, text: "In the beginning  was the Word" }])).toBe(6);
    expect(captionWordCount(text(176, 14))).toBe(2464);
  });

  it("keeps a chapter's words built while closed, Psalm 119 the longest (176 verses, about 2,500 words)", () => {
    expect(captionWordCount(text(176, 14))).toBeLessThanOrEqual(WORDS_BUILT_CLOSED);
    const psalm = closedWords(text(176, 14));
    expect(psalm.box).toBe(true);
    expect(psalm.spans).toBe(2464);
    // A chant's, a few dozen lines.
    expect(closedWords(text(24, 7)).box).toBe(true);
  });

  it("builds none of a Father's work's words while closed, in either view", () => {
    // Discourse I: some 2,000 sentences, 28,657 elements drawn on the export.
    const discourse = text(2000, 12);
    expect(captionWordCount(discourse)).toBeGreaterThan(WORDS_BUILT_CLOSED);
    for (const view of ["words", "cover"] as const) {
      const closed = closedWords(discourse, view);
      expect(closed.box, view).toBe(false);
      expect(closed.spans, view).toBe(0);
    }
  });

  it("still offers both views for a long text: only the words wait", () => {
    state.audio.captions = text(2000, 12);
    state.view = "cover";
    const html = renderToStaticMarkup(createElement(NowPlayingSheet));
    expect(html).toContain('id="player-view-panel-words"');
    expect(html).toContain('id="player-view-panel-cover"');
  });
});
