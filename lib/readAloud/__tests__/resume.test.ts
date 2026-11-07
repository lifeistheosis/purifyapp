// Resume where you stopped, per book (1.9): a reading begins where the reader
// left that chapter, kept however it was stopped; a chapter barely begun
// starts again, one heard to its end lets its place go.

import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
Object.assign(globalThis, {
  window: {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  },
});

const audio = vi.hoisted(() => ({
  snapshot: { src: null as string | null, playing: false, currentTime: 0, duration: 0 },
  listeners: [] as (() => void)[],
}));
vi.mock("@/lib/prayers/persistentAudioStore", () => ({
  getAudioSnapshot: () => audio.snapshot,
  subscribeAudio: (cb: () => void) => {
    audio.listeners.push(cb);
    return () => {};
  },
}));

const { keepPlace, placeIn, startOf, watchPlaces, resetPlacesForTests } = await import("@/lib/readAloud/resume");

const NOW = Date.UTC(2026, 10, 7, 12);
const play = (next: Partial<typeof audio.snapshot>) => {
  audio.snapshot = { ...audio.snapshot, ...next };
  for (const l of audio.listeners) l();
};

beforeEach(() => {
  store.clear();
  audio.listeners.length = 0;
  audio.snapshot = { src: null, playing: false, currentTime: 0, duration: 0 };
  resetPlacesForTests();
});

describe("where a reader stopped listening", () => {
  it("is kept for each book, and a reading of that chapter begins there", () => {
    keepPlace("john", 3, 125.6, 400, NOW);
    expect(placeIn("john", NOW)).toEqual({ chapter: 3, at: 125, when: NOW });
    expect(startOf("john", 3, NOW)).toBe(125);
    // Another chapter of the book starts at its beginning; another book is its own.
    expect(startOf("john", 4, NOW)).toBe(0);
    expect(startOf("mark", 3, NOW)).toBe(0);
  });

  it("is one place a book: the chapter listened to last", () => {
    keepPlace("john", 3, 125, 400, NOW);
    keepPlace("john", 5, 40, 300, NOW + 1000);
    expect(startOf("john", 3, NOW)).toBe(0);
    expect(startOf("john", 5, NOW)).toBe(40);
  });

  it("is not kept for a chapter barely begun, and is let go when the chapter is heard to its end", () => {
    keepPlace("john", 3, 6, 400, NOW);
    expect(placeIn("john", NOW)).toBeNull();
    keepPlace("john", 3, 200, 400, NOW);
    keepPlace("john", 3, 390, 400, NOW);
    expect(placeIn("john", NOW)).toBeNull();
  });

  it("is forgotten after two months", () => {
    keepPlace("john", 3, 200, 400, NOW);
    expect(startOf("john", 3, NOW + 61 * 86_400_000)).toBe(0);
  });

  it("is kept from the player itself, whoever paused it: the lock screen, a headset, the sleep timer", () => {
    watchPlaces();
    const src = "https://audio.purifyapp.net/read/john/3.mp3";
    play({ src, playing: true, currentTime: 2, duration: 400 });
    play({ currentTime: 95 });
    // Paused from anywhere: the place is kept at once.
    play({ playing: false, currentTime: 97 });
    expect(placeIn("john")?.at).toBe(97);
    expect(placeIn("john")?.chapter).toBe(3);
  });

  it("keeps nothing for what is not a chapter of the Bible (a chant)", () => {
    watchPlaces();
    play({ src: "/audio/chants/x/a.mp3", playing: true, currentTime: 50, duration: 200 });
    play({ playing: false });
    expect(store.size).toBe(0);
  });
});
