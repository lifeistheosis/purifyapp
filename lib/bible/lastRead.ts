// Single source of truth for the "last chapter read" pointer kept in
// localStorage under `purify:bible:last`. The chapter reader writes it (the
// live in-view verse, debounced, in ReadingProgressBar) and the mobile Bible
// shell's "Continue reading" card reads it to offer a one-tap resume.
//
// Shape is versionless and forward/backward-compatible: older payloads that
// only carried { book, bookName, chapter, ts } parse fine — `verse` defaults
// to 1 and `totalVerses` to 0, which the Continue card treats as "top of
// chapter, no progress hint".

export type LastRead = {
  book: string;
  bookName: string;
  chapter: number;
  /** Topmost in-view verse when the pointer was written. 1 = chapter top. */
  verse: number;
  /** Total verses in the chapter, for a progress hint. 0 = unknown. */
  totalVerses: number;
  /** Date.now() of the write. */
  ts: number;
};

const KEY = "purify:bible:last";

export function readLastRead(): LastRead | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object" || !p.book || !p.chapter) return null;
    return {
      book: String(p.book),
      bookName: String(p.bookName ?? p.book),
      chapter: Number(p.chapter),
      verse: Number.isFinite(Number(p.verse)) ? Number(p.verse) : 1,
      totalVerses: Number.isFinite(Number(p.totalVerses))
        ? Number(p.totalVerses)
        : 0,
      ts: Number(p.ts ?? 0),
    };
  } catch {
    return null;
  }
}

export function writeLastRead(v: LastRead): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* storage may be unavailable (private mode, quota) */
  }
}
