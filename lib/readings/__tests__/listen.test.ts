// Today's readings, read aloud (1.8): only the verses the Church reads, one
// span after another, through the app's one player, and nothing after the
// last verse of the last passage.

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ReadAloudManifest } from "@/lib/readAloud/chapters";

type Snap = { src: string | null; playing: boolean; currentTime: number; duration: number };

const calls: string[] = [];
let audio: Snap = { src: null, playing: false, currentTime: 0, duration: 0 };
const subscribers = new Set<() => void>();
const tell = () => [...subscribers].forEach((f) => f());
const set = (patch: Partial<Snap>) => {
  audio = { ...audio, ...patch };
  tell();
};

vi.mock("@/lib/prayers/persistentAudioStore", () => ({
  getAudioSnapshot: () => audio,
  subscribeAudio: (f: () => void) => {
    subscribers.add(f);
    return () => subscribers.delete(f);
  },
  setTrack: (src: string, opts: { title?: string }) => {
    calls.push(`track ${src} ${opts.title}`);
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

const MANIFESTS: Record<string, ReadAloudManifest> = {
  "romans/12": {
    voice: "af_heart",
    seconds: 60,
    verses: [
      { n: 1, at: 0.4, end: 6 },
      { n: 2, at: 6.5, end: 12 },
      { n: 3, at: 12.5, end: 20 },
      { n: 4, at: 20.5, end: 30 },
    ],
  },
  "matthew/9": {
    voice: "af_heart",
    seconds: 40,
    verses: [
      { n: 9, at: 1, end: 10 },
      { n: 10, at: 10.5, end: 18 },
      { n: 11, at: 18.5, end: 39.8 },
    ],
  },
};

vi.mock("@/lib/readAloud/chapters", async (importOriginal) => ({
  hasReadAloud: (book: string, chapter: number) => `${book}/${chapter}` in MANIFESTS,
  readAloudManifest: async (book: string, chapter: number) => MANIFESTS[`${book}/${chapter}`] ?? null,
  readAloudSrc: (book: string, chapter: number) => `/audio/read/${book}/${chapter}.mp3`,
  // The verses as the player's lines (1.8): the real one, shared with Listen.
  verseCaptions: (await importOriginal<typeof import("@/lib/readAloud/chapters")>()).verseCaptions,
}));
vi.mock("@/lib/readAloud/covers", () => ({
  readAloudCover: () => ({ src: "/covers/read/x.jpg", fallback: "/x.jpg", size: null }),
}));

const { isListening, listenParts, listeningPlace, spanTimes, startListening, stepListening, stopListening, subscribeListening } = await import("../listen");

const flush = () => new Promise((r) => setTimeout(r, 0));
const names = (item: { label: string; kind: string }) => ({ title: item.label, artist: item.kind });

beforeEach(() => {
  stopListening();
  calls.length = 0;
  audio = { src: null, playing: false, currentTime: 0, duration: 0 };
});

describe("the spans to hear", () => {
  it("keeps every span of every reading that has a recording, in order", () => {
    const parts = listenParts(
      [
        { book: "romans", chapter: 12, ranges: [[1, 2], [4, 4]], label: "Romans 12:1-2, 4", kind: "epistle" },
        { book: "judges", chapter: 6, ranges: [[2, 7]], label: "Judges 6:2-7", kind: "ot" },
        { book: "matthew", chapter: 9, ranges: [[9, 13]], label: "Matthew 9:9-13", kind: "gospel" },
      ],
      names,
    );
    expect(parts.map((p) => `${p.book} ${p.chapter}:${p.from}-${p.to} ${p.artist}`)).toEqual([
      "romans 12:1-2 epistle",
      "romans 12:4-4 epistle",
      "matthew 9:9-13 gospel",
    ]);
  });

  it("starts at the first verse read and stops at the end of the last", () => {
    expect(spanTimes(MANIFESTS["romans/12"], 2, 3)).toEqual({ start: 6.5, end: 20 });
  });

  it("reads to the chapter's end when the span runs past it", () => {
    expect(spanTimes(MANIFESTS["romans/12"], 3, Number.MAX_SAFE_INTEGER)).toEqual({ start: 12.5, end: 30 });
  });

  it("has nothing to play for verses the timings do not hold", () => {
    expect(spanTimes(MANIFESTS["romans/12"], 7, 9)).toBeNull();
  });
});

describe("hearing them", () => {
  const parts = () =>
    listenParts(
      [
        { book: "romans", chapter: 12, ranges: [[2, 3]], label: "Romans 12:2-3", kind: "epistle" },
        { book: "matthew", chapter: 9, ranges: [[10, 11]], label: "Matthew 9:10-11", kind: "gospel" },
      ],
      names,
    );

  it("places each span once its chapter loads, and goes on to the next at its last verse", async () => {
    startListening(parts());
    await flush();
    expect(calls).toEqual(["track /audio/read/romans/12.mp3 Romans 12:2-3", "play"]);
    set({ duration: 60 });
    expect(calls.at(-1)).toBe("seek 6.5");
    set({ currentTime: 15 });
    expect(isListening()).toBe(true);
    set({ currentTime: 20.1 });
    await flush();
    expect(calls.slice(-3)).toEqual(["pause", "track /audio/read/matthew/9.mp3 Matthew 9:10-11", "play"]);
    set({ duration: 40 });
    expect(calls.at(-1)).toBe("seek 10.5");
  });

  it("stops after the last verse of the last passage, even where the recording runs out", async () => {
    startListening(parts());
    await flush();
    set({ duration: 60 });
    set({ currentTime: 20.2 });
    await flush();
    set({ duration: 40 });
    set({ currentTime: 39.5 });
    // The chapter's own end: the player rewinds to 0 and stops.
    set({ playing: false, currentTime: 0 });
    await flush();
    expect(calls.at(-1)).toBe("pause");
    expect(isListening()).toBe(false);
  });

  it("lets go when something else is put on, and leaves it playing", async () => {
    startListening(parts());
    await flush();
    set({ duration: 60 });
    set({ src: "/audio/chants/x.mp3", currentTime: 0, duration: 200 });
    expect(isListening()).toBe(false);
    set({ currentTime: 50 });
    expect(calls).not.toContain("pause");
  });

  it("tells the player the reading before and after the one being heard, and nothing at the ends", async () => {
    let told = 0;
    const stop = subscribeListening(() => told++);
    startListening(parts());
    await flush();
    expect(listeningPlace()).toEqual({ src: "/audio/read/romans/12.mp3", previous: null, next: "Matthew 9:10-11" });
    set({ duration: 60 });
    set({ currentTime: 20.1 });
    await flush();
    expect(listeningPlace()).toEqual({ src: "/audio/read/matthew/9.mp3", previous: "Romans 12:2-3", next: null });
    stopListening();
    expect(listeningPlace()).toBeNull();
    expect(told).toBe(3);
    stop();
  });

  it("steps to the next reading and back, from its first verse, and stays in the readings", async () => {
    startListening(parts());
    await flush();
    set({ duration: 60 });
    set({ currentTime: 9 });
    stepListening(1);
    await flush();
    expect(calls.slice(-2)).toEqual(["track /audio/read/matthew/9.mp3 Matthew 9:10-11", "play"]);
    set({ duration: 40 });
    expect(calls.at(-1)).toBe("seek 10.5");
    expect(isListening()).toBe(true);
    stepListening(-1);
    await flush();
    expect(calls.slice(-2)).toEqual(["track /audio/read/romans/12.mp3 Romans 12:2-3", "play"]);
    set({ duration: 60 });
    expect(calls.at(-1)).toBe("seek 6.5");
    expect(listeningPlace()?.next).toBe("Matthew 9:10-11");
  });

  it("goes nowhere past either end", async () => {
    startListening(parts());
    await flush();
    set({ duration: 60 });
    const before = calls.length;
    stepListening(-1);
    await flush();
    expect(calls.length).toBe(before);
    expect(listeningPlace()?.previous).toBeNull();
  });

  it("does not move on when the reader pauses in the middle of a span", async () => {
    startListening(parts());
    await flush();
    set({ duration: 60 });
    set({ currentTime: 10 });
    set({ playing: false });
    await flush();
    expect(calls.filter((c) => c.startsWith("track"))).toHaveLength(1);
    expect(isListening()).toBe(true);
  });
});
