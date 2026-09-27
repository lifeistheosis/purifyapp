// The query of /api/discord/art, read strictly. The desktop app builds these
// URLs itself (desktop/src-tauri/src/presence.rs, art_url) and Discord's
// media proxy fetches them, so anything that is not exactly what the app
// would build is refused rather than guessed at.
//
//   ?saint=<slug>&p=<0..100>&season=<color>&gilded=1   the large picture
//   ?badge=<color>                                     the small season disc
//
// Every part of the picture is optional but at least one must be there. No
// saint means Purify's own mark (Scripture with no writer's icon).

import { isSeasonColor, type SeasonColor } from "@/lib/desktop/presenceModes";

export type ArtParams =
  | { kind: "badge"; season: SeasonColor }
  | { kind: "art"; saint?: string; progress?: number; season?: SeasonColor; gilded: boolean };

const SLUG = /^[a-z0-9-]{1,80}$/;
const PERCENT = /^(100|[1-9]?\d)$/;
const KNOWN = new Set(["saint", "p", "season", "gilded", "badge"]);

export function parseArtParams(sp: URLSearchParams): ArtParams | null {
  for (const key of sp.keys()) if (!KNOWN.has(key)) return null;
  const badge = sp.get("badge");
  if (badge !== null) {
    if ([...sp.keys()].length !== 1 || !isSeasonColor(badge)) return null;
    return { kind: "badge", season: badge };
  }
  const saint = sp.get("saint");
  const p = sp.get("p");
  const season = sp.get("season");
  const gilded = sp.get("gilded");
  if (saint !== null && !SLUG.test(saint)) return null;
  if (p !== null && !PERCENT.test(p)) return null;
  if (season !== null && !isSeasonColor(season)) return null;
  if (gilded !== null && (gilded !== "1" || season === null)) return null;
  if (saint === null && p === null && season === null) return null;
  return {
    kind: "art",
    saint: saint ?? undefined,
    progress: p === null ? undefined : Number(p),
    season: season ?? undefined,
    gilded: gilded === "1",
  };
}

/** One key per distinct picture, whatever order the query came in. */
export function artCacheKey(a: ArtParams): string {
  return a.kind === "badge"
    ? `badge:${a.season}`
    : `art:${a.saint ?? ""}:${a.progress ?? ""}:${a.season ?? ""}:${a.gilded ? 1 : 0}`;
}
