// The words a link came to read (1.7.2, the owner's note of 2026-10-19:
// "when you click read it in purify ensure it highlights the section in
// particular also"). The guide to a first Liturgy quotes a council, a Father,
// a psalm, and its "Read it in Purify" opens the whole text. This carries the
// quoted words across, so the page that opens finds them, brings them up the
// screen and lights them (components/reading/QuoteFocus.tsx).
//
// The words travel in the tab's session storage, not in the address: a
// quotation is a sentence long, and the address a reader sees and shares
// stays the text's own.

const KEY = "purify.quoteFocus";
/**
 * A request older than this belongs to a reader who went somewhere else
 * first. A minute: a slow phone can take a while to open a long work.
 */
const FRESH_MS = 60_000;

type Request = { path: string; texts: string[]; at: number };

/** A link's page, without its query, its place on the page or a trailing slash. */
export function pathOf(href: string): string {
  return href.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
}

/** Asks the page at `href` to light `texts` when it opens. */
export function requestQuoteFocus(href: string, texts: readonly string[]): void {
  try {
    const request: Request = { path: pathOf(href), texts: [...texts], at: Date.now() };
    sessionStorage.setItem(KEY, JSON.stringify(request));
  } catch {
    // Storage can be refused. The page still opens, at its start, unlit.
  }
}

/**
 * The words asked for on `pathname`, once: taking them clears the request.
 * A request for another page is left for it, until it goes stale.
 */
export function takeQuoteFocus(pathname: string): string[] | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw === null) return null;
    const request = JSON.parse(raw) as Partial<Request>;
    const stale = typeof request.at !== "number" || Math.abs(Date.now() - request.at) > FRESH_MS;
    if (stale) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    if (request.path !== pathOf(pathname)) return null;
    sessionStorage.removeItem(KEY);
    const texts = Array.isArray(request.texts) ? request.texts : [];
    return texts.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
  } catch {
    return null;
  }
}

/** What a page may print differently from the edition's file: curly quotes, and any white space. */
function fold(c: string): string {
  if (c === "‘" || c === "’") return "'";
  if (c === "“" || c === "”") return '"';
  return /\s/.test(c) ? " " : c;
}

export type Place = { piece: number; offset: number };

/**
 * Where `needle` stands in `pieces` (the text of each of a page's text nodes,
 * in the order it reads), with white space collapsed on both sides: the piece
 * and offset where it starts, and where it ends (exclusive). Null when the
 * page does not carry it, as a page in another language does not.
 */
export function locate(pieces: readonly string[], needle: string): { start: Place; end: Place } | null {
  const want = Array.from(needle.trim(), fold).join("").replace(/ {2,}/g, " ");
  if (!want) return null;
  let hay = "";
  const pieceAt: number[] = [];
  const offsetAt: number[] = [];
  pieces.forEach((text, piece) => {
    for (let offset = 0; offset < text.length; offset++) {
      const c = fold(text[offset]);
      if (c === " " && (hay.length === 0 || hay.endsWith(" "))) continue;
      hay += c;
      pieceAt.push(piece);
      offsetAt.push(offset);
    }
  });
  const i = hay.indexOf(want);
  if (i < 0) return null;
  const last = i + want.length - 1;
  return {
    start: { piece: pieceAt[i], offset: offsetAt[i] },
    end: { piece: pieceAt[last], offset: offsetAt[last] + 1 },
  };
}
