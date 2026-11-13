// What each store's download is doing, as one kind of thing (1.9, build 95
// note 23; ./log.ts says why). Pure: the three stores' states in, the
// downloads under way out, the end of one that has left them, and the words
// of a download's line, which the bell's sheet and the phone both say.

import type { BiblesState } from "@/lib/bible/downloads/store";
import { FAILED_WORDS } from "@/lib/bible/downloads/store";

import type { Download, DownloadKind, DownloadWords } from "./log";

/** A book's saving to listen offline, as lib/readAloud/saving.ts keeps it. */
export type BookSaving = {
  job: { book: string; done: number; total: number; waiting: "wifi" | "signal" | null } | null;
  /** The last book whose saving ended with chapters the website would not give. */
  failed: string | null;
};

/** A chant's saving, as lib/chants/offline.ts keeps it. */
export type ChantSaving = { job: { ref: string; share: number } | null; failed: string | null };

export type Stores = { bibles: Pick<BiblesState, "saved" | "downloads">; saving: BookSaving; chants: ChantSaving };

/** What each download is called, by what it is. */
export type Names = { bible: (id: string) => string; book: (slug: string) => string; chant: (ref: string) => string };

/** A download under way. */
export type Live = Pick<Download, "key" | "kind" | "name" | "state" | "share" | "done" | "total" | "waiting">;

export const keyOf = (kind: DownloadKind, id: string): string => `${kind}:${id}`;
export const idOf = (key: string): string => key.slice(key.indexOf(":") + 1);

const share = (done: number, total: number) => (total > 0 ? Math.min(1, Math.max(0, done / total)) : 0);

/** The downloads under way now, in the three stores. */
export function liveDownloads(s: Stores, names: Names): Live[] {
  const out: Live[] = [];
  for (const [id, d] of Object.entries(s.bibles.downloads)) {
    if (d?.state !== "downloading") continue;
    out.push({ key: keyOf("bible", id), kind: "bible", name: names.bible(id), state: "running", share: share(d.done, d.total), done: 0, total: 0 });
  }
  const job = s.saving.job;
  if (job) {
    out.push({
      key: keyOf("book", job.book),
      kind: "book",
      name: names.book(job.book),
      state: job.waiting ? "waiting" : "running",
      share: share(job.done, job.total),
      done: job.done,
      total: job.total,
      ...(job.waiting ? { waiting: job.waiting } : {}),
    });
  }
  const chant = s.chants.job;
  if (chant) out.push({ key: keyOf("chant", chant.ref), kind: "chant", name: names.chant(chant.ref), state: "running", share: Math.min(1, Math.max(0, chant.share)), done: 0, total: 0 });
  return out;
}

/** What is on the phone now, asked of the stores' own lists. */
export type Kept = { bookChapters: (book: string) => number; chant: (ref: string) => boolean };

/** How a download that has left the stores ended: done, failed and why, or let go (null), which is not kept. */
export type End = { state: "done" } | { state: "failed"; failure: DownloadWords } | null;

export function endOf(was: Live, s: Stores, kept: Kept): End {
  const id = idOf(was.key);
  if (was.kind === "bible") {
    const d = s.bibles.downloads[id as keyof Stores["bibles"]["downloads"]];
    if (d?.state === "failed") return { state: "failed", failure: { key: FAILED_WORDS[d.reason] } };
    return s.bibles.saved[id] ? { state: "done" } : null;
  }
  if (was.kind === "book") {
    if (s.saving.failed === id) return { state: "failed", failure: { key: "player.offline.failed" } };
    return was.total > 0 && kept.bookChapters(id) >= was.total ? { state: "done" } : null;
  }
  if (s.chants.failed === id) return { state: "failed", failure: { key: "player.offline.failedOne", vars: { book: was.name } } };
  return kept.chant(id) ? { state: "done" } : null;
}

/** A download the app was closed in the middle of, said as it is (build 95 note 23). */
export const STOPPED: DownloadWords = { key: "downloads.stopped" };

/** The words of a download's line: what it is doing, or how it ended. */
export function lineOf(d: Pick<Download, "kind" | "state" | "share" | "done" | "total" | "waiting" | "failure">): DownloadWords {
  if (d.state === "failed") return d.failure ?? STOPPED;
  if (d.state === "done") return { key: d.kind === "bible" ? "downloads.downloaded" : "downloads.savedToListen" };
  if (d.state === "waiting") {
    return { key: d.waiting === "wifi" ? "player.offline.waitingWifi" : "player.offline.waitingSignal", vars: { done: d.done, total: d.total } };
  }
  if (d.kind === "book") return { key: "player.offline.saving", vars: { done: d.done, total: d.total } };
  return { key: d.kind === "bible" ? "bible.downloads.downloading" : "downloads.saving", vars: { percent: Math.floor(d.share * 100) } };
}

/** Whether two states of one download read the same: then nothing is written or told again. */
export function readsTheSame(a: Live | Download, b: Live | Download): boolean {
  return (
    a.state === b.state &&
    a.name === b.name &&
    a.done === b.done &&
    a.total === b.total &&
    a.waiting === b.waiting &&
    Math.floor(a.share * 100) === Math.floor(b.share * 100)
  );
}

/** Every message key a download's line can say: each must be in every language. */
export const LINE_KEYS: readonly string[] = [
  ...Object.values(FAILED_WORDS),
  "player.offline.failed",
  "player.offline.failedOne",
  STOPPED.key,
  "downloads.downloaded",
  "downloads.savedToListen",
  "player.offline.waitingWifi",
  "player.offline.waitingSignal",
  "player.offline.saving",
  "bible.downloads.downloading",
  "downloads.saving",
];
