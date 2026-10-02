// Amen, Praying, Glory to God: the responses a reader can give a post or a
// reply beside the like, any or all of them, each once
// (20261005_community_three.sql, community_responses).
//
// Pure: the button, the route and the feed agree on what the three are and
// how a tap moves the totals.

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
