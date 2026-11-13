import { parseListenId } from "@/lib/listen/texts";

/**
 * What the one player is speaking with the phone's voice, by its address
 * (1.9, build 95 note 25). A recording has an address the player plays; a
 * text the phone speaks has none, so it is given one, which says what it is,
 * so the player's Speed, Read, Share and the page's lit verse know it as they
 * know a recording:
 *
 *   speech:bible/<book>/<chapter>              a chapter of the English Bible
 *   speech:bible/<book>/<chapter>?in=<bible>   a chapter of a downloaded Bible
 *   speech:<listen id>?lang=<lang>             a life, a council's section, a
 *                                              study's part, an event, a work's
 *                                              section (lib/listen/texts.ts)
 *
 * Pure: no window here.
 */

export const SPOKEN = "speech:";

export type Spoken =
  | { kind: "bible"; book: string; chapter: number; bible: string | null }
  | { kind: "text"; id: string; lang: string };

export function spokenBibleSrc(book: string, chapter: number, bible: string | null = null): string {
  return `${SPOKEN}bible/${book}/${chapter}${bible ? `?in=${encodeURIComponent(bible)}` : ""}`;
}

export function spokenTextSrc(id: string, lang: string): string {
  return `${SPOKEN}${id}?lang=${encodeURIComponent(lang)}`;
}

/** What a player address speaks, or null when it is no spoken text's. */
export function spokenOf(src: string | null | undefined): Spoken | null {
  if (!src?.startsWith(SPOKEN)) return null;
  const rest = src.slice(SPOKEN.length);
  const cut = rest.indexOf("?");
  const path = cut < 0 ? rest : rest.slice(0, cut);
  const query = new URLSearchParams(cut < 0 ? "" : rest.slice(cut + 1));
  const bible = /^bible\/([a-z0-9-]+)\/(\d{1,3})$/.exec(path);
  if (bible) return { kind: "bible", book: bible[1], chapter: Number(bible[2]), bible: query.get("in") || null };
  if (parseListenId(path)) return { kind: "text", id: path, lang: query.get("lang") || "en" };
  return null;
}

/**
 * The language a voice is asked for, from the language of the text's words.
 * Koine Greek ("grc", the downloaded Septuagint and Patriarchal text) is read
 * in the Greek of today, as the Church reads it aloud; any other is its own.
 */
export function voiceLang(textLang: string): string {
  const base = textLang.toLowerCase().split(/[-_]/)[0] || "en";
  return base === "grc" ? "el" : base;
}
