// Calendar matrix scaffolding (v6.4 PRD §4).
//
// Two jurisdictions on the same reckoning can still commemorate
// different saints on a given day, and can keep slightly different
// fasting practice on certain feasts. The matrix layer decouples the
// /calendar page from a single global rule so the user can choose:
//
//   - a *reckoning* (New / Revised Julian, or Old / Julian), AND
//   - a *tradition* (ecumenical default, or a named local jurisdiction)
//
// Pascha is shared across every canonical Orthodox church and is
// computed once by the algorithm in `./orthodox.ts`. Only the fixed
// feasts and the menologion shift between matrices.
//
// At read time the calendar composes:
//   base menologion (data/calendar/daily-saints.json)
//   + jurisdictional patch (data/calendar/menologion-{slug}.json)
//
// The same merge-not-clobber pattern already used by the commentary
// rail (v3.10). When no patch exists for a matrix, the base is shown
// unchanged.
//
// This file is intentionally type-only + a tiny registry. No I/O. The
// actual patch loader belongs in the calendar data layer alongside
// `daily-saints.json`.

/**
 * The reckoning axis: which calendar's fixed feasts and saint-days
 * are observed.
 *
 *   "new", Revised Julian (Ecumenical Patriarchate, Greek world,
 *           Antiochian Archdiocese, OCA, most diaspora).
 *   "old", Julian (Russian Orthodox Church, Serbian Orthodox Church,
 *           Jerusalem Patriarchate, Mount Athos, ROCOR).
 *
 * Pascha is shared and not affected by this axis.
 */
export type CalendarReckoning = "new" | "old";

/**
 * The tradition axis: which jurisdictional menologion (and, where
 * needed, fasting-practice override) is overlaid on the base.
 *
 *   "ecumenical", the default base menologion already shipped in
 *                  data/calendar/daily-saints.json. Greek-leaning by
 *                  origin; no overrides applied.
 *   Named jurisdictions add overrides via menologion-{slug}.json.
 */
export type CalendarTradition =
  | "ecumenical"
  | "moscow"
  | "constantinople"
  | "antiochian"
  | "serbian"
  | "rocor";

export type CalendarMatrix = {
  /** Stable slug. Matches the data file suffix `menologion-{slug}.json`. */
  slug: CalendarTradition;
  /** User-facing label, shown in the calendar's tradition toggle. */
  title: string;
  /** Short one-line description shown when the matrix is active. */
  description: string;
  /**
   * The reckoning this jurisdiction *defaults* to. The user can still
   * flip the reckoning toggle independently; this just seeds the
   * default when they first choose a tradition.
   */
  defaultReckoning: CalendarReckoning;
  /**
   * Patch file path relative to the repo root. Null for `ecumenical`
   * (no overrides, the base menologion is used directly).
   */
  menologionRef: string | null;
  /**
   * Fasting-rules override path. Null when the matrix uses the
   * default rules in `./orthodox.ts`.
   */
  fastingRulesRef: string | null;
  /** Always true. Pascha is shared across all canonical churches. */
  paschaShared: true;
};

/**
 * Registry of supported matrices. The `ecumenical` entry is the
 * default and always present; named jurisdictions are added here as
 * editorial patches land in `data/calendar/`.
 *
 * Engineering scaffolding only at v6.4. The actual patch JSON files
 * for moscow / constantinople / antiochian / serbian / rocor are
 * left as TODOs in `data/calendar/README.md` until the editorial work
 * is committed.
 */
export const CALENDAR_MATRICES: CalendarMatrix[] = [
  {
    slug: "ecumenical",
    title: "Ecumenical (default)",
    description:
      "The base menologion that ships with the site. Greek-leaning by origin; no jurisdictional overrides.",
    defaultReckoning: "new",
    menologionRef: null,
    fastingRulesRef: null,
    paschaShared: true,
  },
  // Named jurisdictions ship one at a time as their menologion
  // patches are committed. See data/calendar/README.md.
];

/**
 * Look up a matrix by slug. Falls back to the ecumenical default when
 * the slug is missing or unknown (e.g. a user's stored preference for
 * a matrix that has not shipped yet).
 */
export function getMatrix(slug: string | null | undefined): CalendarMatrix {
  if (!slug) return CALENDAR_MATRICES[0];
  const found = CALENDAR_MATRICES.find((m) => m.slug === slug);
  return found ?? CALENDAR_MATRICES[0];
}

/**
 * Shape of a jurisdictional menologion patch file. Lives at
 * data/calendar/menologion-{slug}.json.
 *
 * Every entry is keyed by a "MM-DD" string (matching the existing
 * daily-saints.json convention) and supplies *overrides* relative to
 * the base. A patch entry may:
 *
 *   - add saints not present on that day in the base
 *   - swap the headline commemoration
 *   - reorder the saint list
 *
 * Anything omitted falls through to the base unchanged.
 */
export type MenologionPatch = {
  matrix: CalendarTradition;
  notes?: string;
  days: Record<
    string,
    {
      /** When set, becomes the day's headline commemoration. */
      headline?: string;
      /** Saints added on top of the base list, deduped on render. */
      add?: { name: string; slug?: string; rank?: "feast" | "commemoration" }[];
      /** Optional explicit ordering of saint slugs for this day. */
      order?: string[];
    }
  >;
};
