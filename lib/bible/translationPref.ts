// Remembers the reader's chosen Bible translation so it carries across
// chapters and return visits. Only licensed translations (NKJV/NIV/NLT) are
// stored — the public-domain default per testament needs no preference. Set
// to null (the PD default) clears it.

const KEY = "purify.bible.v";
const LICENSED = new Set(["nkjv", "niv", "nlt"]);

export function readTranslationPref(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(KEY);
    return v && LICENSED.has(v) ? v : null;
  } catch {
    return null;
  }
}

export function writeTranslationPref(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id && LICENSED.has(id)) window.localStorage.setItem(KEY, id);
    else window.localStorage.removeItem(KEY);
  } catch {
    /* storage may be unavailable */
  }
}
