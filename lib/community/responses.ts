// Amen, Praying, Glory to God: the responses a reader can give a post or a
// reply beside the like, any or all of them, each once
// (20261005000000_community_three.sql, community_responses).
//
// Pure: the button, the route and the feed agree on what the three are and
// how a tap moves the totals, and where the tray that offers them stands.
//
// The totals are kept and never drawn (1.8, note 80 of build 86): on prayer,
// no figures. The server still sends them; nothing on the screen shows them.

export const RESPONSE_KINDS = ["amen", "praying", "glory"] as const;
export type ResponseKind = (typeof RESPONSE_KINDS)[number];

export type ResponseCounts = Record<ResponseKind, number>;

export const NO_RESPONSES: ResponseCounts = { amen: 0, praying: 0, glory: 0 };

/** Message keys for each response's name. */
export const RESPONSE_KEYS: Record<ResponseKind, string> = {
  amen: "community.respond.amen",
  praying: "community.respond.praying",
  glory: "community.respond.glory",
};

export function isResponseKind(v: unknown): v is ResponseKind {
  return typeof v === "string" && (RESPONSE_KINDS as readonly string[]).includes(v);
}

/** The totals off a feed row, zero where a row from an older server has none. */
export function countsOf(row: { amen_count?: number | null; praying_count?: number | null; glory_count?: number | null }): ResponseCounts {
  const n = (v: number | null | undefined) => (typeof v === "number" && v > 0 ? v : 0);
  return { amen: n(row.amen_count), praying: n(row.praying_count), glory: n(row.glory_count) };
}

/** The totals after a reader turns one response on or off, floored at zero. */
export function applyResponse(counts: ResponseCounts, mine: readonly ResponseKind[], kind: ResponseKind, on: boolean): ResponseCounts {
  const had = mine.includes(kind);
  if (had === on) return counts;
  return { ...counts, [kind]: Math.max(0, counts[kind] + (on ? 1 : -1)) };
}

/** A reader's own responses after the same tap. */
export function toggleMine(mine: readonly ResponseKind[], kind: ResponseKind, on: boolean): ResponseKind[] {
  const without = mine.filter((k) => k !== kind);
  return on ? RESPONSE_KINDS.filter((k) => k === kind || without.includes(k)) : without;
}

/** The candle in the row is lit once the reader has given any of the three. */
export function answered(mine: readonly ResponseKind[]): boolean {
  return mine.length > 0;
}

// ── The tray over the row (1.8, the owner's pick of r3-30, A) ───────────────
//
// The candle opens a small tray above the row: Amen, Praying and Glory to God.
// It is fixed to the screen over the candle, drawn at the top of the page, so
// nothing in the feed makes room for it. Where it stands is worked out here
// from what the button measures (components/community/ResponseButtons.tsx).

/** A box on the screen, in CSS pixels from the window's top left. */
export type ScreenBox = { left: number; top: number; width: number; height: number };

/** Where the tray stands, fixed to the screen, and where its caret points. */
export type TrayPlace = {
  left: number;
  top: number;
  /** The caret's middle, measured from the tray's left edge. */
  caret: number;
  /** Under the row with its caret pointing up: the room over the row is covered. */
  below: boolean;
};

/** How far the tray stands from the row: over a post, and one size smaller over a reply. */
export const TRAY_GAP = { post: 11, reply: 9 } as const;

/** How close the tray comes to the sides of the screen (r3-30: 14px). */
export const TRAY_EDGE = 14;

/** How close the caret comes to either end of the tray, clear of its round corners. */
export const TRAY_CARET_INSET = 22;

/**
 * The tray's place: over the candle and centred on it, `gap` px above the row,
 * held TRAY_EDGE px inside the screen's sides, its caret on the candle's
 * middle wherever the tray had to stop. `screen` is the window's width and the
 * band of it the page is seen through (lib/ui/readingPlace.ts, visibleBand):
 * when the room over the row is under a bar, the tray stands under the row
 * instead, if the band has room for it there.
 */
export function trayPlace(
  candle: ScreenBox,
  tray: { width: number; height: number },
  screen: { width: number; top: number; bottom: number },
  gap: number,
): TrayPlace {
  const middle = candle.left + candle.width / 2;
  const furthest = screen.width - TRAY_EDGE - tray.width;
  // Whole pixels for the tray, so its words are crisp; the caret is then set
  // from that whole-pixel edge, so it lands on the candle's middle.
  const left = Math.round(Math.max(TRAY_EDGE, Math.min(middle - tray.width / 2, furthest)));
  const inset = Math.min(TRAY_CARET_INSET, tray.width / 2);
  const caret = Math.max(inset, Math.min(middle - left, tray.width - inset));
  const over = candle.top - gap - tray.height;
  const under = candle.top + candle.height + gap;
  const below = over < screen.top && under + tray.height <= screen.bottom;
  return { left, top: Math.round(below ? under : over), caret: Math.round(caret * 2) / 2, below };
}

/** id -> responses held, narrowed from the wire like parseReactionMap. */
export function parseResponseMap(raw: unknown): Record<string, ResponseKind[]> {
  const out: Record<string, ResponseKind[]> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!id || !Array.isArray(value)) continue;
    const kinds = RESPONSE_KINDS.filter((k) => value.includes(k));
    if (kinds.length > 0) out[id] = kinds;
  }
  return out;
}
