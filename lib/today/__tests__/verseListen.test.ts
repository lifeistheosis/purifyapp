// Listen on the Verse of the Day (1.8, the owner's pick B of round 10): the
// verse alone, cut out of its chapter's recording by the verse's own timings,
// through the app's one player, and nothing after its last word. Only where
// the chapter has a recording.

import fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import available from "@/data/readAloud/index.json";
import type { ReadAloudManifest } from "@/lib/readAloud/chapters";

type Snap = { src: string | null; playing: boolean; currentTime: number; duration: number };

const calls: string[] = [];
let audio: Snap = { src: null, playing: false, currentTime: 0, duration: 0 };
// When the place was last given, so the element's own clock runs on between pieces of news.
let givenAt = Date.now();
const subscribers = new Set<() => void>();
const set = (patch: Partial<Snap>) => {
  if ("currentTime" in patch || "playing" in patch) {
    if (!("currentTime" in patch)) patch = { ...patch, currentTime: now() };
    givenAt = Date.now();
  }
  audio = { ...audio, ...patch };
  [...subscribers].forEach((f) => f());
};
/** The element's own clock: where it was told, and on from there while it plays. */
const now = () => audio.currentTime + (audio.playing ? (Date.now() - givenAt) / 1000 : 0);

vi.mock("@/lib/prayers/persistentAudioStore", () => ({
  getAudioSnapshot: () => audio,
  currentTimeNow: () => now(),
  subscribeAudio: (f: () => void) => {
    subscribers.add(f);
    return () => subscribers.delete(f);
  },
  setTrack: (src: string, opts: { title?: string; artist?: string }) => {
    calls.push(`track ${src} ${opts.title} / ${opts.artist}`);
    if (audio.src !== src) set({ src, currentTime: 0, duration: 0 });
  },
  setLoopMode: () => {},
  seek: (t: number) => {
    calls.push(`seek ${t}`);
    set({ currentTime: t });
  },
  play: () => {
    calls.push("play");
    set({ playing: true });
  },
  pause: () => {
    calls.push("pause");
    set({ playing: false });
  },
}));

/** The real timings the website keeps beside each chapter's recording. */
const timings = (book: string, chapter: number): ReadAloudManifest | null => {
  const file = `public/audio/read/${book}/${chapter}.json`;
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as ReadAloudManifest) : null;
};

vi.mock("@/lib/readAloud/chapters", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/readAloud/chapters")>();
  return {
    ...real,
    readAloudManifest: async (book: string, chapter: number) => timings(book, chapter),
    readAloudSrc: (book: string, chapter: number) => real.readAloudRecording(book, chapter),
  };
});
vi.mock("@/lib/readAloud/covers", () => ({
  readAloudCover: () => ({ src: "/covers/read/luke.jpg", fallback: "/x.jpg", size: null }),
}));

const { hasReadAloud } = await import("@/lib/readAloud/chapters");
const { isListening, stopListening } = await import("@/lib/readings/listen");
const { listenToVerse, verseListenPart } = await import("../verseListen");

const flush = () => new Promise((r) => setTimeout(r, 0));
const LUKE_11_13 = { book: "luke", chapter: 11, verse: 13 };

beforeEach(() => {
  stopListening();
  calls.length = 0;
  audio = { src: null, playing: false, currentTime: 0, duration: 0 };
});

describe("Listen on the Verse of the Day", () => {
  it("is offered only where the chapter has a recording: the New Testament today", () => {
    expect(hasReadAloud("luke", 11)).toBe(true);
    expect(hasReadAloud("john", 3)).toBe(true);
    // A psalm, a prophet: no recording yet, so the card draws no Listen.
    expect(hasReadAloud("psalms", 23)).toBe(false);
    expect(hasReadAloud("isaiah", 40)).toBe(false);
    expect((available as string[]).every((key) => !key.startsWith("psalms/"))).toBe(true);
  });

  it("is the one verse, from its first word to its last", () => {
    expect(verseListenPart(LUKE_11_13, "Luke 11:13", "Verse of the Day")).toEqual({
      book: "luke",
      chapter: 11,
      from: 13,
      to: 13,
      title: "Luke 11:13",
      artist: "Verse of the Day",
    });
  });

  it("starts where the timings start the verse, and stops where they end it", async () => {
    const verse = timings("luke", 11)!.verses.find((v) => v.n === 13)!;
    expect(verse.at).toBeLessThan(verse.end);
    listenToVerse(LUKE_11_13, "Luke 11:13", "Verse of the Day");
    await flush();
    // The chapter's recording from Purify's bucket, through the one player.
    expect(calls).toEqual(["track https://audio.purifyapp.net/read/luke/11.mp3 Luke 11:13 / Verse of the Day", "play"]);
    // Placed at the verse once the recording's length is known.
    set({ duration: 422 });
    expect(calls.at(-1)).toBe(`seek ${verse.at}`);
    set({ currentTime: (verse.at + verse.end) / 2 });
    expect(isListening()).toBe(true);
    expect(calls).not.toContain("pause");
    // The verse's last word: it stops there, and nothing after it plays.
    set({ currentTime: verse.end + 0.05 });
    await flush();
    expect(calls.at(-1)).toBe("pause");
    expect(calls.filter((c) => c.startsWith("track"))).toHaveLength(1);
    expect(isListening()).toBe(false);
  });

  it("hears only the part a card shows of a long verse, and stops at its last word", async () => {
    // His word, 2026-11-28: "when you click play it starts playing the whole
    // verse rather than what you see". Luke 8:25 shows its first sentence.
    const verse = timings("luke", 8)!.verses.find((v) => v.n === 25)!;
    const { versePartCut } = await import("../versePartTimes");
    const shown = "And he said unto them, Where is your faith?";
    const cut = versePartCut("luke", 8, 25, shown)!;
    expect(cut.end).toBeLessThan(verse.end - 3);
    listenToVerse({ book: "luke", chapter: 8, verse: 25, shown }, "Luke 8:25", "Verse of the Day");
    await flush();
    set({ duration: 400 });
    expect(calls.at(-1)).toBe(`seek ${cut.at}`);
    set({ currentTime: (cut.at + cut.end) / 2 });
    expect(calls).not.toContain("pause");
    // Past the part's last word, with the rest of the verse still to come: it stops.
    set({ currentTime: cut.end + 0.05 });
    await flush();
    expect(calls.at(-1)).toBe("pause");
    expect(isListening()).toBe(false);
  });

  it("stops on the part's last word itself, not at the player's next news a quarter second on", async () => {
    // The walk of 2026-11-28 heard Luke 10:20 run 0.17 s past its end. Luke
    // 8:25's part ends inside its verse: a late stop lets the next word begin.
    const { versePartCut } = await import("../versePartTimes");
    const shown = "And he said unto them, Where is your faith?";
    const cut = versePartCut("luke", 8, 25, shown)!;
    listenToVerse({ book: "luke", chapter: 8, verse: 25, shown }, "Luke 8:25", "Verse of the Day");
    await flush();
    set({ duration: 400 });
    // The player's last news: 0.2 s before the end. No more news comes.
    set({ currentTime: cut.end - 0.2 });
    expect(calls).not.toContain("pause");
    await new Promise((r) => setTimeout(r, 350));
    expect(calls.at(-1)).toBe("pause");
    expect(isListening()).toBe(false);
  });

  it("gives way to anything else put on, and leaves it playing", async () => {
    listenToVerse(LUKE_11_13, "Luke 11:13", "Verse of the Day");
    await flush();
    set({ duration: 422 });
    set({ src: "/audio/chants/anthem/en.mp3", currentTime: 0, duration: 200 });
    expect(isListening()).toBe(false);
    set({ currentTime: 150 });
    expect(calls).not.toContain("pause");
  });
});
