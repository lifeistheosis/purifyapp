// Each store's download as one kind of thing (1.9, build 95 note 23): a
// Bible's, a book's saving to listen offline and a chant's, as they begin,
// go, wait and end, and the words each says in the bell's sheet and on the
// phone, in every language.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { endOf, lineOf, liveDownloads, LINE_KEYS, readsTheSame, STOPPED, type Stores } from "@/lib/downloads/watch";

const ROOT = path.resolve(__dirname, "../../..");
const names = { bible: (id: string) => `Bible ${id}`, book: (slug: string) => `Book ${slug}`, chant: (ref: string) => `Chant ${ref}` };
const idle: Stores = { bibles: { saved: {}, downloads: {} }, saving: { job: null, failed: null }, chants: { job: null, failed: null } };
const kept = { bookChapters: () => 0, chant: () => false };

describe("the downloads under way", () => {
  it("are none when nothing downloads", () => {
    expect(liveDownloads(idle, names)).toEqual([]);
  });

  it("are a Bible's, a book's and a chant's, each as far as it has come", () => {
    const live = liveDownloads(
      {
        bibles: { saved: {}, downloads: { "ru-synodal": { state: "downloading", done: 3_000_000, total: 7_500_000 }, "grc-lxx-patriarchal": { state: "failed", reason: "offline" } } },
        saving: { job: { book: "luke", done: 6, total: 24, waiting: null }, failed: null },
        chants: { job: { ref: "psalm-135/en", share: 0.5 }, failed: null },
      },
      names,
    );
    expect(live).toEqual([
      { key: "bible:ru-synodal", kind: "bible", name: "Bible ru-synodal", state: "running", share: 0.4, done: 0, total: 0 },
      { key: "book:luke", kind: "book", name: "Book luke", state: "running", share: 0.25, done: 6, total: 24 },
      { key: "chant:psalm-135/en", kind: "chant", name: "Chant psalm-135/en", state: "running", share: 0.5, done: 0, total: 0 },
    ]);
  });

  it("say a book that waits for Wi-Fi or a signal is waiting, and what for", () => {
    const [book] = liveDownloads({ ...idle, saving: { job: { book: "luke", done: 6, total: 24, waiting: "wifi" }, failed: null } }, names);
    expect(book).toMatchObject({ state: "waiting", waiting: "wifi" });
    expect(lineOf(book)).toEqual({ key: "player.offline.waitingWifi", vars: { done: 6, total: 24 } });
  });
});

describe("how a download ends", () => {
  const bible = liveDownloads({ ...idle, bibles: { saved: {}, downloads: { "ru-synodal": { state: "downloading", done: 1, total: 2 } } } }, names)[0];
  const book = liveDownloads({ ...idle, saving: { job: { book: "luke", done: 23, total: 24, waiting: null }, failed: null } }, names)[0];
  const chant = liveDownloads({ ...idle, chants: { job: { ref: "psalm-135/en", share: 0.9 }, failed: null } }, names)[0];

  it("a Bible: done once on the phone, failed with its own true words, let go otherwise", () => {
    const saved = { "ru-synodal": { version: "v", bytes: 1, books: [], at: "" } };
    expect(endOf(bible, { ...idle, bibles: { saved, downloads: {} } }, kept)).toEqual({ state: "done" });
    // Note 21's words follow it into the sheet and the bar.
    expect(endOf(bible, { ...idle, bibles: { saved: {}, downloads: { "ru-synodal": { state: "failed", reason: "unavailable" } } } }, kept)).toEqual({
      state: "failed",
      failure: { key: "bible.downloads.failedUnavailable" },
    });
    expect(endOf(bible, idle, kept)).toBeNull();
  });

  it("a book: done once every chapter is on the phone, failed when the website would not give some, let go otherwise", () => {
    expect(endOf(book, idle, { ...kept, bookChapters: () => 24 })).toEqual({ state: "done" });
    expect(endOf(book, { ...idle, saving: { job: null, failed: "luke" } }, kept)).toEqual({ state: "failed", failure: { key: "player.offline.failed" } });
    // Cancelled: some chapters saved, not all.
    expect(endOf(book, idle, { ...kept, bookChapters: () => 10 })).toBeNull();
  });

  it("a chant: done once saved, failed in the player's own words, let go otherwise", () => {
    expect(endOf(chant, idle, { ...kept, chant: () => true })).toEqual({ state: "done" });
    expect(endOf(chant, { ...idle, chants: { job: null, failed: "psalm-135/en" } }, kept)).toEqual({
      state: "failed",
      failure: { key: "player.offline.failedOne", vars: { book: "Chant psalm-135/en" } },
    });
    expect(endOf(chant, idle, kept)).toBeNull();
  });
});

describe("the words of a download", () => {
  it("say how far it has come, and how it ended", () => {
    const base = { kind: "bible" as const, share: 0.426, done: 0, total: 0 };
    expect(lineOf({ ...base, state: "running" })).toEqual({ key: "bible.downloads.downloading", vars: { percent: 42 } });
    expect(lineOf({ ...base, kind: "chant", state: "running" })).toEqual({ key: "downloads.saving", vars: { percent: 42 } });
    expect(lineOf({ ...base, kind: "book", state: "running", done: 6, total: 24 })).toEqual({ key: "player.offline.saving", vars: { done: 6, total: 24 } });
    expect(lineOf({ ...base, state: "done" })).toEqual({ key: "downloads.downloaded" });
    expect(lineOf({ ...base, kind: "book", state: "done" })).toEqual({ key: "downloads.savedToListen" });
    expect(lineOf({ ...base, state: "failed", failure: { key: "bible.downloads.failedOffline" } })).toEqual({ key: "bible.downloads.failedOffline" });
    expect(lineOf({ ...base, state: "failed" })).toEqual(STOPPED);
  });

  it("are in every language, with every value they name", () => {
    const dir = path.join(ROOT, "lib/i18n/messages");
    const catalogs = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    expect(catalogs).toHaveLength(21);
    for (const file of catalogs) {
      const words = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as Record<string, string>;
      for (const key of [...LINE_KEYS, "notifications.downloads"]) expect(words[key], `${file} ${key}`).toBeTruthy();
      for (const key of ["downloads.saving", "bible.downloads.downloading"]) expect(words[key], `${file} ${key}`).toContain("{percent}");
    }
  });

  it("are told again only when what they say changes", () => {
    const a = liveDownloads({ ...idle, saving: { job: { book: "luke", done: 6, total: 24, waiting: null }, failed: null } }, names)[0];
    expect(readsTheSame(a, { ...a })).toBe(true);
    expect(readsTheSame(a, { ...a, done: 7, share: 7 / 24 })).toBe(false);
    expect(readsTheSame(a, { ...a, share: a.share + 0.001 })).toBe(true);
  });
});
