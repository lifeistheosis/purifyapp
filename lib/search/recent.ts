// The words a reader searched for lately, on this phone only.
//
// From 1.7 the search kept the last five RESULTS a reader opened. The owner's
// pick of r3-12 (1.8) keeps the WORDS instead, the way a phone's own search
// does, and he confirmed it on 2026-10-30 ("Yes, those are good. Incorporate
// that into the search engine."): before anything is typed the search lists
// the last words searched, newest first, and a tap puts one back in the field.
//
// Kept in this device's storage and nowhere else: it is not synced and never
// leaves the phone. Every read and write is guarded, because storage can be
// missing, full or refused (a private window, a cleared app), and the search
// must open whatever happens here. The 1.7 list of results, under its old
// key, is dropped the first time the words are cleared.

export const RECENT_KEY = "purify:search:words";
/** Where 1.7 kept the results opened; read by nothing now, removed on Clear. */
export const OLD_RECENT_KEY = "purify:search:recent";
export const RECENT_MAX = 5;
/** Longer than this is not a search a reader would want back. */
const LONGEST = 80;

/** The words as they are kept: trimmed, spaces folded, never longer than LONGEST. */
export function tidy(words: string): string {
  return words.replace(/\s+/g, " ").trim().slice(0, LONGEST);
}

/** The list with `words` first, once (in any case), and no longer than `max`. Pure. */
export function withWords(list: readonly string[], words: string, max: number = RECENT_MAX): string[] {
  const kept = tidy(words);
  if (!kept) return list.slice(0, max);
  const key = kept.toLocaleLowerCase();
  return [kept, ...list.filter((w) => w.toLocaleLowerCase() !== key)].slice(0, max);
}

/** What storage holds, cleaned: anything that is not a list of words is dropped. Pure. */
export function parseWords(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: string[] = [];
    for (const v of parsed) {
      if (typeof v !== "string") continue;
      const w = tidy(v);
      if (w && !out.some((o) => o.toLocaleLowerCase() === w.toLocaleLowerCase())) out.push(w);
    }
    return out.slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

export function readWords(): string[] {
  try {
    return parseWords(window.localStorage.getItem(RECENT_KEY));
  } catch {
    return [];
  }
}

/** Keep `words` as the newest, and hand back the list as it now stands. */
export function rememberWords(words: string): string[] {
  const next = withWords(readWords(), words);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Storage refused: the list simply is not kept this time.
  }
  return next;
}

export function clearWords(): void {
  try {
    window.localStorage.removeItem(RECENT_KEY);
    window.localStorage.removeItem(OLD_RECENT_KEY);
  } catch {
    // Nothing to do: a list that cannot be read is already not shown.
  }
}
