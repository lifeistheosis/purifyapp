// Saving a book to listen offline as a job the app keeps (1.9, s3-09 of
// docs/1.9-build/ideas.json: "does saving pick up again after a lost signal,
// and can it wait for Wi-Fi?"). Before 1.9 the answer to both was no: a lost
// signal failed every chapter after it, Save again began from the first
// chapter, and it saved over mobile data without asking.
//
// The files and the website are stood in for by saveChapters' own test
// (offline.test.ts); here a chapter "saves" by being written into the list,
// and the connection is a stand-in the test moves between Wi-Fi, mobile data
// and none.

import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NetStatus } from "../saving";

const store = new Map<string, string>();
vi.stubGlobal("window", {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
});

const saved: Record<string, { mp3: string; json: string; bytes: number }> = {};
const fetched: string[] = [];
/** Chapters the website will not give. */
const refused = new Set<string>();
/** Called before each chapter is fetched: a test can change the network here. */
let beforeChapter: (key: string) => void = () => {};
let plus: boolean | null = true;

vi.mock("@/lib/entitlements/usePlusFeatures", () => ({ plusFeaturesNow: async () => plus }));
vi.mock("@/lib/media/streamed", () => ({ streamedUrl: (p: string) => `https://purifyapp.net${p}` }));
vi.mock("../chapters", () => ({ readAloudRecording: (b: string, c: number) => `https://media/${b}/${c}.mp3` }));
vi.mock("../offline", () => ({
  savedChapters: () => ({ ...saved }),
  saveChapters: async (
    book: string,
    chapters: readonly number[],
    _urls: unknown,
    progress: (done: number, total: number) => void,
    _plugin: unknown,
    stop: () => boolean,
  ) => {
    let ok = 0;
    let failed = 0;
    for (const [i, c] of chapters.entries()) {
      if (stop()) return { saved: ok, failed, stopped: true };
      const key = `${book}/${c}`;
      beforeChapter(key);
      fetched.push(key);
      if (refused.has(key) || !net.now.connected) failed += 1;
      else {
        saved[key] = { mp3: "m", json: "j", bytes: 1 };
        ok += 1;
      }
      progress(i + 1, chapters.length);
      await Promise.resolve();
    }
    return { saved: ok, failed, stopped: false };
  },
}));

const WIFI: NetStatus = { connected: true, type: "wifi" };
const CELL: NetStatus = { connected: true, type: "cellular" };
const NONE: NetStatus = { connected: false, type: "none" };

const net = {
  now: WIFI,
  watchers: new Set<(s: NetStatus) => void>(),
  status: async () => net.now,
  watch(changed: (s: NetStatus) => void) {
    net.watchers.add(changed);
    return () => void net.watchers.delete(changed);
  },
  /** The phone's connection changes, and the plugin says so. */
  move(to: NetStatus) {
    net.now = to;
    for (const w of [...net.watchers]) w(to);
  },
};

const S = await import("../saving");

/** Let every promise in flight settle. */
const settle = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  store.clear();
  for (const k of Object.keys(saved)) delete saved[k];
  fetched.length = 0;
  refused.clear();
  beforeChapter = () => {};
  plus = true;
  net.now = WIFI;
  net.watchers.clear();
  S.resetSavingForTests(net);
});

describe("saving a book on Wi-Fi", () => {
  it("saves every chapter and lets the job go", async () => {
    await S.startSaving("jude", [1]);
    expect(fetched).toEqual(["jude/1"]);
    expect(S.getSaving()).toEqual({ job: null, failed: null });
    expect(store.has("purify:readAloud.saving")).toBe(false);
  });

  it("goes on from where it stopped: chapters already saved are not fetched again", async () => {
    saved["mark/1"] = { mp3: "m", json: "j", bytes: 1 };
    saved["mark/2"] = { mp3: "m", json: "j", bytes: 1 };
    const seen: string[] = [];
    let job: ReturnType<typeof S.getSaving>["job"] = null;
    beforeChapter = () => {
      job = S.getSaving().job;
      if (job) seen.push(`${job.done}/${job.total}`);
    };
    await S.startSaving("mark", [1, 2, 3, 4]);
    expect(fetched).toEqual(["mark/3", "mark/4"]);
    // Counted from the whole book, the saved chapters included.
    expect(seen).toEqual(["2/4", "3/4"]);
  });

  it("leaves to play online what the website would not give, and says so", async () => {
    refused.add("mark/9");
    await S.startSaving("mark", [8, 9, 10]);
    expect(Object.keys(saved).sort()).toEqual(["mark/10", "mark/8"]);
    expect(S.getSaving()).toEqual({ job: null, failed: "mark" });
    // Save again tries the one that is missing, and only it.
    refused.clear();
    fetched.length = 0;
    await S.startSaving("mark", [8, 9, 10]);
    expect(fetched).toEqual(["mark/9"]);
    expect(S.getSaving()).toEqual({ job: null, failed: null });
  });
});

describe("on mobile data", () => {
  it("waits for Wi-Fi, saying how far it has come, and saves when Wi-Fi comes", async () => {
    net.now = CELL;
    saved["john/1"] = { mp3: "m", json: "j", bytes: 1 };
    await S.startSaving("john", [1, 2, 3]);
    expect(fetched).toEqual([]);
    expect(S.getSaving().job).toEqual({ book: "john", done: 1, total: 3, waiting: "wifi" });

    net.move(WIFI);
    await settle();
    expect(fetched).toEqual(["john/2", "john/3"]);
    expect(S.getSaving().job).toBeNull();
  });

  it("saves over mobile data when the reader chooses to", async () => {
    net.now = CELL;
    await S.startSaving("john", [1, 2]);
    await S.saveOverMobileData();
    expect(fetched).toEqual(["john/1", "john/2"]);
    expect(S.getSaving().job).toBeNull();
  });

  it("stops after the chapter in hand when the phone leaves Wi-Fi for mobile data, and waits", async () => {
    beforeChapter = (key) => {
      if (key === "acts/2") net.move(CELL);
    };
    await S.startSaving("acts", [1, 2, 3, 4]);
    await settle();
    expect(fetched).toEqual(["acts/1", "acts/2"]);
    expect(S.getSaving().job).toEqual({ book: "acts", done: 2, total: 4, waiting: "wifi" });
    beforeChapter = () => {};
    net.move(WIFI);
    await settle();
    expect(fetched).toEqual(["acts/1", "acts/2", "acts/3", "acts/4"]);
    expect(S.getSaving().job).toBeNull();
  });
});

describe("with no signal", () => {
  it("waits for one when there is none, and goes on when it is back", async () => {
    net.now = NONE;
    await S.startSaving("jude", [1]);
    expect(S.getSaving().job).toEqual({ book: "jude", done: 0, total: 1, waiting: "signal" });
    net.move(WIFI);
    await settle();
    expect(saved["jude/1"]).toBeDefined();
    expect(S.getSaving().job).toBeNull();
  });

  it("picks up after a signal lost half way, from the first chapter it lost", async () => {
    beforeChapter = (key) => {
      if (key === "luke/2") net.now = NONE; // gone, before the plugin has said so
    };
    await S.startSaving("luke", [1, 2, 3]);
    await settle();
    // Chapter 2 failed with the signal gone, and 3 was never reached.
    expect(Object.keys(saved)).toEqual(["luke/1"]);
    expect(S.getSaving()).toEqual({ job: { book: "luke", done: 1, total: 3, waiting: "signal" }, failed: null });
    beforeChapter = () => {};
    net.move(WIFI);
    await settle();
    expect(Object.keys(saved).sort()).toEqual(["luke/1", "luke/2", "luke/3"]);
    expect(S.getSaving()).toEqual({ job: null, failed: null });
  });

  it("is still there the next time the app opens, and goes on from it", async () => {
    net.now = NONE;
    await S.startSaving("jude", [1]);
    // The app closes; it opens again later, on Wi-Fi.
    S.resetSavingForTests(net);
    net.now = WIFI;
    await S.resumeSaving();
    expect(saved["jude/1"]).toBeDefined();
    expect(store.has("purify:readAloud.saving")).toBe(false);
  });
});

describe("letting a saving go", () => {
  it("Cancel keeps what is saved and forgets the rest", async () => {
    saved["john/1"] = { mp3: "m", json: "j", bytes: 1 };
    net.now = CELL;
    await S.startSaving("john", [1, 2]);
    S.cancelSaving();
    expect(S.getSaving().job).toBeNull();
    net.move(WIFI);
    await settle();
    expect(fetched).toEqual([]);
    expect(saved["john/1"]).toBeDefined();
  });

  it("a waiting saving gives way to another book, whose own Save goes on from what it has", async () => {
    net.now = CELL;
    await S.startSaving("john", [1, 2]);
    await S.startSaving("mark", [1]);
    expect(S.getSaving().job?.book).toBe("mark");
    net.move(WIFI);
    await settle();
    expect(fetched).toEqual(["mark/1"]);
  });

  it("is not picked up by itself for a reader who no longer has Plus", async () => {
    net.now = NONE;
    await S.startSaving("jude", [1]);
    plus = false;
    net.move(WIFI);
    await settle();
    expect(fetched).toEqual([]);
    expect(S.getSaving().job).toBeNull();
    expect(store.has("purify:readAloud.saving")).toBe(false);
  });
});

describe("what the connection allows", () => {
  it("is Wi-Fi, or a connection it cannot name; mobile data only when chosen", () => {
    expect(S.waitingFor(WIFI, false)).toBeNull();
    expect(S.waitingFor({ connected: true, type: "unknown" }, false)).toBeNull();
    expect(S.waitingFor(CELL, false)).toBe("wifi");
    expect(S.waitingFor(CELL, true)).toBeNull();
    expect(S.waitingFor(NONE, true)).toBe("signal");
    expect(S.waitingFor({ connected: true, type: "none" }, false)).toBe("signal");
  });
});
