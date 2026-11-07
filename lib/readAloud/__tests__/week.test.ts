// The coming week's readings kept on the phone by themselves (1.9, s3-01 of
// docs/1.9-build/ideas.json): which chapters, when, and when they go again.
//
// The calendar is the real one (lib/calendar/orthodox.ts); the files, the
// connection, Plus and the platform are stand-ins.

import { beforeEach, describe, expect, it, vi } from "vitest";

import { startOfDayLocal } from "@/lib/calendar/orthodox";

const store = new Map<string, string>();
vi.stubGlobal("window", {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
});

const saved: Record<string, { mp3: string; json: string; bytes: number }> = {};
const fetched: string[] = [];
const removed: string[] = [];
let plus: boolean | null = true;
let ios = false;
let wifi: { connected: boolean; type: "wifi" | "cellular" | "none" | "unknown" } = { connected: true, type: "wifi" };
let userJob: { book: string; waiting: null | "wifi" } | null = null;

vi.mock("@/lib/entitlements/usePlusFeatures", () => ({ plusFeaturesNow: async () => plus }));
vi.mock("@/lib/platform/native", () => ({ isNativeClient: () => true, isIOSClient: () => ios }));
vi.mock("@/lib/media/streamed", () => ({ streamedUrl: (p: string) => `https://purifyapp.net${p}` }));
vi.mock("../saving", () => ({
  connection: () => ({ status: async () => wifi, watch: () => () => {} }),
  getSaving: () => ({ job: userJob, failed: null }),
}));
vi.mock("../offline", () => ({
  savedChapters: () => ({ ...saved }),
  onSavedChange: () => () => {},
  saveChapters: async (book: string, chapters: readonly number[]) => {
    for (const c of chapters) {
      fetched.push(`${book}/${c}`);
      saved[`${book}/${c}`] = { mp3: "m", json: "j", bytes: 3_000_000 };
    }
    return { saved: chapters.length, failed: 0, stopped: false };
  },
  removeChapter: async (book: string, chapter: number) => {
    removed.push(`${book}/${chapter}`);
    delete saved[`${book}/${chapter}`];
  },
}));

const W = await import("../week");
const K = await import("../weekKept");

/** A local day, as the calendar takes it. */
const day = (iso: string) => startOfDayLocal(new Date(`${iso}T09:00:00`));

beforeEach(() => {
  store.clear();
  for (const k of Object.keys(saved)) delete saved[k];
  fetched.length = 0;
  removed.length = 0;
  plus = true;
  ios = false;
  wifi = { connected: true, type: "wifi" };
  userJob = null;
  W.resetWeekForTests();
});

describe("the week's chapters", () => {
  it("are the chapters the Church reads in the next seven days, each once, with the last day it is read", () => {
    const week = W.weekChapters(day("2026-11-07"), "new", () => true);
    const keys = week.map((c) => `${c.book}/${c.chapter}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(week.length).toBeGreaterThan(8);
    // Today's Gospel is in it, and nothing past the seventh day.
    expect(week.every((c) => c.lastDay >= "2026-11-07" && c.lastDay <= "2026-11-13")).toBe(true);
    // The same seven days by hand, from the calendar's own lists.
    const twice = W.weekChapters(day("2026-11-07"), "new", () => true, 1);
    for (const c of twice) expect(keys).toContain(`${c.book}/${c.chapter}`);
  });

  it("keep only what has a recording", () => {
    const week = W.weekChapters(day("2026-11-07"), "new", (book) => book === "luke");
    expect(week.length).toBeGreaterThan(0);
    expect(week.every((c) => c.book === "luke")).toBe(true);
  });

  it("let go of a chapter once the last day it is read has passed", () => {
    expect(W.pastChapters({ "luke/8": "2026-11-06", "luke/9": "2026-11-07", "john/10": "2026-11-12" }, "2026-11-07")).toEqual(["luke/8"]);
  });
});

describe("keeping the week", () => {
  it("saves on Wi-Fi, for Plus, the week's chapters not on the phone, and notes them as the week's", async () => {
    saved["luke/9"] = { mp3: "m", json: "j", bytes: 1 }; // the reader's own
    await W.keepWeek(new Date("2026-11-07T09:00:00"));
    const week = W.weekChapters(day("2026-11-07"), "new").map((c) => `${c.book}/${c.chapter}`);
    expect(fetched.sort()).toEqual(week.filter((k) => k !== "luke/9").sort());
    const kept = K.weekKept();
    expect(Object.keys(kept).sort()).toEqual(fetched.slice().sort());
    // The reader's own chapter is not the week's to take away.
    expect(kept["luke/9"]).toBeUndefined();
  });

  it("fetches nothing on mobile data, with no signal, or on a connection it cannot name", async () => {
    for (const net of [
      { connected: true, type: "cellular" as const },
      { connected: false, type: "none" as const },
      { connected: true, type: "unknown" as const },
    ]) {
      wifi = net;
      await W.keepWeek(new Date("2026-11-07T09:00:00"));
    }
    expect(fetched).toEqual([]);
  });

  it("fetches nothing without a sure yes to Plus, when turned off, on iPhone, or while the reader's own saving runs", async () => {
    plus = null;
    await W.keepWeek(new Date("2026-11-07T09:00:00"));
    plus = false;
    await W.keepWeek(new Date("2026-11-07T09:00:00"));
    plus = true;
    ios = true;
    await W.keepWeek(new Date("2026-11-07T09:00:00"));
    ios = false;
    userJob = { book: "mark", waiting: null };
    await W.keepWeek(new Date("2026-11-07T09:00:00"));
    userJob = null;
    store.set("purify:readAloud.week", "0");
    await W.keepWeek(new Date("2026-11-07T09:00:00"));
    expect(fetched).toEqual([]);
  });

  it("takes away what the week kept once its day has passed, and only that", async () => {
    await W.keepWeek(new Date("2026-11-07T09:00:00"));
    const before = K.weekKept();
    const gone = Object.entries(before).filter(([, last]) => last < "2026-11-10").map(([k]) => k);
    expect(gone.length).toBeGreaterThan(0);
    saved["acts/1"] = { mp3: "m", json: "j", bytes: 1 }; // the reader's own, never the week's
    wifi = { connected: false, type: "none" }; // taking away needs no signal
    await W.keepWeek(new Date("2026-11-10T09:00:00"));
    expect(removed.sort()).toEqual(gone.sort());
    expect(saved["acts/1"]).toBeDefined();
    for (const k of gone) expect(K.weekKept()[k]).toBeUndefined();
  });

  it("leaves a chapter the reader saved with its book: it is theirs now", async () => {
    await W.keepWeek(new Date("2026-11-07T09:00:00"));
    const book = Object.keys(K.weekKept())[0].split("/")[0];
    K.releaseWeekBook(book);
    await W.keepWeek(new Date("2026-11-20T09:00:00"));
    expect(removed.some((k) => k.startsWith(`${book}/`))).toBe(false);
  });

  it("turned off, takes away everything it kept, and says what it keeps while on", async () => {
    await W.keepWeek(new Date("2026-11-07T09:00:00"));
    const n = Object.keys(K.weekKept()).length;
    expect(W.weekState()).toEqual({ on: true, chapters: n, bytes: n * 3_000_000 });
    await W.setWeekReadings(false);
    expect(removed.length).toBe(n);
    expect(K.weekKept()).toEqual({});
    expect(W.weekState()).toEqual({ on: false, chapters: 0, bytes: 0 });
  });
});
