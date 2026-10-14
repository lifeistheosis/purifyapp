import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { newerBoard } from "@/lib/packs/usePacks";
import { clearPacks, savePacks, savedPacks } from "@/lib/packs/store";
import { ASK_EVERY_MS, syncPacks } from "@/lib/packs/sync";
import {
  compareVersions,
  isDayKey,
  mergeVerseTable,
  packsTrusted,
  readPacks,
  type Packs,
} from "@/lib/packs/types";
import type { VerseOfDayEntry } from "@/lib/today/verseOfDay.types";
import { CURRENT_VERSION } from "@/lib/whatsNew/version";

/** A browser's window, as much of it as the store and the sync touch. */
function fakeWindow() {
  const items = new Map<string, string>();
  return {
    localStorage: {
      getItem: (k: string) => items.get(k) ?? null,
      setItem: (k: string, v: string) => void items.set(k, String(v)),
      removeItem: (k: string) => void items.delete(k),
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    items,
  };
}

const entry = (over: Partial<VerseOfDayEntry> = {}): VerseOfDayEntry => ({
  label: "John 3:16",
  text: "For God so loved the world.",
  href: "/bible/john/3#v16",
  source: "gospel",
  book: "john",
  bookName: "John",
  chapter: 3,
  verse: 16,
  ...over,
});

const answer = (over: Partial<Packs> = {}): Packs => ({
  format: 1,
  release: CURRENT_VERSION,
  made: "2026-10-14T12:00:00.000Z",
  packs: {
    "verse-of-day": { schema: 1, days: { "2026-10-14": entry() } },
    board: {
      schema: 1,
      message: {
        week: "2026-W42",
        date: "2026-10-14",
        eyebrow: "This week at Purify",
        headline: "1.6 is here",
        body: ["Five tabs, with the Shop and Chat on Discover."],
      },
    },
  },
  ...over,
});

describe("reading the website's answer", () => {
  it("keeps a good answer whole", () => {
    expect(readPacks(JSON.parse(JSON.stringify(answer())))).toEqual(answer());
  });

  it("refuses an answer in another format, or with no release or date", () => {
    expect(readPacks({ ...answer(), format: 2 })).toBeNull();
    expect(readPacks({ ...answer(), release: "" })).toBeNull();
    expect(readPacks({ ...answer(), release: "1.6; drop" })).toBeNull();
    expect(readPacks({ ...answer(), made: "yesterday" })).toBeNull();
    expect(readPacks(null)).toBeNull();
    expect(readPacks([])).toBeNull();
  });

  it("drops a pack it cannot read and keeps the other", () => {
    const a = answer();
    const read = readPacks({ ...a, packs: { ...a.packs, board: { schema: 9, message: null } } });
    expect(read?.packs.board).toBeUndefined();
    expect(read?.packs["verse-of-day"]).toEqual(a.packs["verse-of-day"]);
  });

  it("lets a verse lead only to a chapter of the app's own Bible", () => {
    for (const href of [
      "javascript:alert(1)",
      "https://example.com/bible/john/3",
      "//example.com/bible/john/3",
      "/bible/john/3?x=1",
      "/shop/john/3",
      "/bible/romans/3#v16", // not the book the entry names
    ]) {
      const days = { "2026-10-14": entry({ href }) };
      const read = readPacks({ ...answer(), packs: { "verse-of-day": { schema: 1, days } } });
      expect(read?.packs["verse-of-day"], href).toBeUndefined();
    }
  });

  it("refuses a whole verse pack for one bad day, so a half-read table is never used", () => {
    const days = { "2026-10-14": entry(), "2026-02-30": entry() };
    const read = readPacks({ ...answer(), packs: { "verse-of-day": { schema: 1, days } } });
    expect(read?.packs["verse-of-day"]).toBeUndefined();
    expect(isDayKey("2026-02-30")).toBe(false);
    expect(isDayKey("2026-02-28")).toBe(true);
  });

  it("refuses a verse with a wrong kind, a bad chapter or a text too long to be a verse", () => {
    for (const bad of [
      entry({ source: "sermon" as VerseOfDayEntry["source"] }),
      entry({ chapter: 0, href: "/bible/john/0#v16" }),
      entry({ chapter: 3.5 }),
      entry({ text: "x".repeat(1201) }),
      entry({ label: "" }),
    ]) {
      const read = readPacks({ ...answer(), packs: { "verse-of-day": { schema: 1, days: { "2026-10-14": bad } } } });
      expect(read?.packs["verse-of-day"], JSON.stringify(bad).slice(0, 60)).toBeUndefined();
    }
  });

  it("carries nothing it was not asked for", () => {
    const days = { "2026-10-14": { ...entry(), html: "<b>x</b>" } };
    const read = readPacks({ ...answer(), extra: 1, packs: { "verse-of-day": { schema: 1, days, more: 2 } } });
    expect(Object.keys(read!.packs["verse-of-day"]!.days["2026-10-14"]).sort()).toEqual(Object.keys(entry()).sort());
    expect(read).not.toHaveProperty("extra");
  });

  it("reads a board message as words only", () => {
    const a = answer();
    const bad = { ...a.packs.board!.message!, body: ["fine", { html: "x" }] };
    expect(readPacks({ ...a, packs: { board: { schema: 1, message: bad } } })?.packs.board).toBeUndefined();
    expect(readPacks({ ...a, packs: { board: { schema: 1, message: null } } })?.packs.board).toEqual({ schema: 1, message: null });
  });
});

describe("when packs may stand in front of the build", () => {
  it("compares versions by number, part by part", () => {
    expect(compareVersions("1.6", "1.5.2")).toBe(1);
    expect(compareVersions("1.10", "1.9")).toBe(1);
    expect(compareVersions("1.6", "1.6.0")).toBe(0);
    expect(compareVersions("1.5.2", "1.6")).toBe(-1);
  });

  it("never from a website on an older release than the app", () => {
    expect(packsTrusted(answer({ release: "1.5.2" }), "1.6", undefined)).toBe(false);
    expect(packsTrusted(answer({ release: "1.6" }), "1.6", undefined)).toBe(true);
    expect(packsTrusted(answer({ release: "1.7" }), "1.6", undefined)).toBe(true);
  });

  it("never when the pack was made before this build was built", () => {
    const p = answer({ made: "2026-10-14T12:00:00.000Z" });
    expect(packsTrusted(p, CURRENT_VERSION, "2026-10-14T13:00:00.000Z")).toBe(false);
    expect(packsTrusted(p, CURRENT_VERSION, "2026-10-14T11:00:00.000Z")).toBe(true);
  });
});

describe("what a screen shows", () => {
  it("puts the pack's days in front of the build's and leaves the others", () => {
    const bundled = {
      "2026-10-13": entry({ label: "built 13" }),
      "2026-10-14": entry({ label: "built 14" }),
    };
    const merged = mergeVerseTable(bundled, {
      schema: 1,
      days: { "2026-10-14": entry({ label: "pack 14" }), "2026-12-31": entry({ label: "pack 31" }) },
    });
    expect(merged["2026-10-13"].label).toBe("built 13");
    expect(merged["2026-10-14"].label).toBe("pack 14");
    expect(merged["2026-12-31"].label).toBe("pack 31");
    expect(mergeVerseTable(bundled, null)).toBe(bundled);
  });

  it("shows the newer board message, so an older table never hides the build's", () => {
    const built = answer().packs.board!.message!;
    const older = { ...built, date: "2026-09-08", headline: "September" };
    const newer = { ...built, date: "2026-10-20", headline: "Next week" };
    expect(newerBoard(built, older)).toBe(built);
    expect(newerBoard(built, newer)).toBe(newer);
    expect(newerBoard(built, null)).toBe(built);
    expect(newerBoard(null, older)).toBe(older);
  });
});

describe("the phone's store and the ask", () => {
  let win: ReturnType<typeof fakeWindow>;
  beforeEach(() => {
    win = fakeWindow();
    vi.stubGlobal("window", win);
    clearPacks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps an answer and reads it back, checked again", () => {
    expect(savedPacks()).toBeNull();
    expect(savePacks(answer())).toBe(true);
    expect(savedPacks()).toEqual(answer());
    // Changed by hand, or by an older build: read as strictly as a download.
    win.items.set("purify.packs", JSON.stringify({ ...answer(), format: 7 }));
    expect(savedPacks()).toBeNull();
    win.items.set("purify.packs", "{not json");
    expect(savedPacks()).toBeNull();
  });

  it("asks the website's /api/packs with no credentials, and keeps a good answer", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(answer()), { status: 200 }));
    const result = await syncPacks({ site: "https://purifyapp.net", fetchImpl: fetchImpl as typeof fetch, now: () => 1_000 });
    expect(result).toBe("kept");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://purifyapp.net/api/packs");
    expect(init.credentials).toBe("omit");
    expect(savedPacks()?.packs.board?.message?.headline).toBe("1.6 is here");
  });

  it("asks at most once in half an hour, unless forced", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(answer())));
    const ask = (t: number, force = false) =>
      syncPacks({ site: "https://x", fetchImpl: fetchImpl as typeof fetch, now: () => t, force });
    expect(await ask(10_000)).toBe("kept");
    expect(await ask(10_000 + ASK_EVERY_MS - 1)).toBe("skipped");
    expect(await ask(10_000 + 5, true)).toBe("kept");
    expect(await ask(10_000 + 5 + ASK_EVERY_MS)).toBe("kept");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("keeps what it had when the answer is an error, too large, or not packs", async () => {
    savePacks(answer());
    const cases: [Response | Error, string][] = [
      [new Response("down", { status: 503 }), "failed"],
      [new Response("x".repeat(300_001)), "refused"],
      [new Response(JSON.stringify({ format: 2 })), "refused"],
      [new Response("<html>"), "failed"],
      [new Error("no signal"), "failed"],
    ];
    let t = 0;
    for (const [res, expected] of cases) {
      const fetchImpl = vi.fn(async () => {
        if (res instanceof Error) throw res;
        return res;
      });
      t += ASK_EVERY_MS + 1;
      const now = t;
      expect(await syncPacks({ site: "https://x", fetchImpl: fetchImpl as typeof fetch, now: () => now })).toBe(expected);
      expect(savedPacks()).toEqual(answer());
    }
  });
});
