// The downloads kept on the phone for the bell's sheet (1.9, build 95 note 23):
// newest first, changed where they stand, the last eight and an ended one a
// week, a download let go not kept, and an end unseen lighting the bell until
// the sheet is opened.

import { beforeEach, describe, expect, it } from "vitest";

const store = new Map<string, string>();
Object.assign(globalThis, {
  window: {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  },
});

const { putDownload, dropDownload, readDownloads, hasUnseenEnd, markDownloadsSeen, keep, KEPT, KEPT_MS, resetDownloadsForTests } = await import("@/lib/downloads/log");
type Download = import("@/lib/downloads/log").Download;

const at = "2026-11-13T10:00:00.000Z";
const bible = (over: Partial<Download> = {}): Download => ({ key: "bible:ru-synodal", kind: "bible", name: "Синодальный перевод (1876)", state: "running", share: 0.4, done: 0, total: 0, at, ...over });

beforeEach(() => {
  store.clear();
  resetDownloadsForTests();
});

describe("the downloads kept on the phone", () => {
  it("keeps a new one at the top and changes one already kept where it stands", () => {
    putDownload(bible());
    putDownload({ ...bible(), key: "book:luke", kind: "book", name: "Luke", done: 3, total: 24 });
    expect(readDownloads().map((d) => d.key)).toEqual(["book:luke", "bible:ru-synodal"]);
    putDownload(bible({ share: 0.9 }));
    expect(readDownloads().map((d) => d.key)).toEqual(["book:luke", "bible:ru-synodal"]);
    expect(readDownloads()[1].share).toBe(0.9);
    // Written on the phone, read back after a restart.
    resetDownloadsForTests();
    expect(readDownloads().map((d) => d.key)).toEqual(["book:luke", "bible:ru-synodal"]);
  });

  it("puts one that begins again (a Bible tried again) back at the top", () => {
    putDownload(bible({ state: "failed", failure: { key: "bible.downloads.failedUnavailable" }, ended: at }));
    putDownload({ ...bible(), key: "book:luke", kind: "book", name: "Luke" });
    putDownload(bible({ state: "running", share: 0 }));
    expect(readDownloads().map((d) => [d.key, d.state])).toEqual([
      ["bible:ru-synodal", "running"],
      ["book:luke", "running"],
    ]);
  });

  it("does not keep a download let go before its end", () => {
    putDownload(bible());
    dropDownload("bible:ru-synodal");
    expect(readDownloads()).toEqual([]);
  });

  it("keeps the last eight, and an ended one a week", () => {
    const now = Date.parse("2026-11-20T10:00:00.000Z");
    const list: Download[] = Array.from({ length: 10 }, (_, i) => bible({ key: `chant:c${i}/en`, kind: "chant", state: "done", ended: new Date(now - i * 60_000).toISOString() }));
    expect(keep(list, now)).toHaveLength(KEPT);
    const old = bible({ state: "done", ended: new Date(now - KEPT_MS - 1).toISOString() });
    const running = bible({ key: "book:luke", kind: "book", at: new Date(now - KEPT_MS - 1).toISOString() });
    // An old end goes; a download under way stays however long it has run.
    expect(keep([old, running], now).map((d) => d.key)).toEqual(["book:luke"]);
    // Anything that is not a download is not kept.
    expect(keep([{ nonsense: true } as unknown as Download, bible()], now).map((d) => d.key)).toEqual(["bible:ru-synodal"]);
  });

  it("lights the bell for an end not yet seen, until the sheet is opened", () => {
    putDownload(bible());
    expect(hasUnseenEnd()).toBe(false);
    putDownload(bible({ state: "done", share: 1, ended: at, seen: false }));
    expect(hasUnseenEnd()).toBe(true);
    markDownloadsSeen();
    expect(hasUnseenEnd()).toBe(false);
    expect(readDownloads()[0].seen).toBe(true);
  });
});
