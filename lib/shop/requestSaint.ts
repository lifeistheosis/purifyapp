/**
 * The saint a request is for, as Requests A draws him (r3-19, the owner's
 * pick of 2026-10-31): his own icon from the app, his name and one line, and
 * the form that finds him as the reader types.
 *
 * The saints are the library's in brief (data/calendar/profiled-saints.json,
 * lib/saints/brief.ts), never the registry, which is every saint's whole life
 * and stays out of the shop's script (lib/shop/bySaint.ts says the same). The
 * request form imported the registry for its datalist until 1.8.
 *
 * An icon is shown only where its rights are settled (lib/saints/iconRights.ts,
 * verified or used with permission); any other saint, and a subject that is no
 * saint at all, stands with the lit cross instead. Never a stand-in face.
 */

import profiledSaints from "@/data/calendar/profiled-saints.json";
import type { SaintBrief } from "@/lib/saints/brief";
import { iconRightsFor } from "@/lib/saints/iconRights";
import { KNOWN_FORMS, nameCore } from "@/lib/saints/nameForms";
import { fold } from "@/lib/ui/listbox";

export type RequestSaint = {
  slug: string;
  /** The library's name: "St. Herman of Alaska". */
  name: string;
  /** The first part of his epithet: "Monk of Valaam". */
  line: string;
  /** His icon in the app, only where its rights are settled; else null. */
  icon: string | null;
};

const BRIEFS = profiledSaints as SaintBrief[];
const BY_SLUG = new Map(BRIEFS.map((s) => [s.slug, s]));

/** The icon, if its rights are settled. */
export function settledIcon(src: string | null | undefined): string | null {
  return src && iconRightsFor(src) ? src : null;
}

function asRequestSaint(s: SaintBrief): RequestSaint {
  return {
    slug: s.slug,
    name: s.name,
    line: (s.epithet ?? "").split(" · ")[0]?.trim() ?? "",
    icon: settledIcon(s.iconUrl),
  };
}

/** The library's saint for a request's slug, or null when it has no profile of him. */
export function requestSaint(slug: string | null | undefined): RequestSaint | null {
  const brief = slug ? BY_SLUG.get(slug) : undefined;
  return brief ? asRequestSaint(brief) : null;
}

/** Every way the library writes him, folded for matching. */
function formsOf(s: SaintBrief): string[] {
  return [s.name, nameCore(s.name), ...(KNOWN_FORMS[s.slug] ?? [])].map(fold);
}

/**
 * The saint a subject names exactly, in any of his written forms ("St. Herman
 * of Alaska", "Herman of Alaska"), so a request typed in full, or arriving
 * as ?subject=, still links to his page and his icons.
 */
export function saintByName(text: string): RequestSaint | null {
  const q = fold(text.trim());
  if (!q) return null;
  const hit = BRIEFS.find((s) => formsOf(s).includes(q));
  return hit ? asRequestSaint(hit) : null;
}

/**
 * The saints as the reader types: a name that begins with what was typed
 * first, then one with a word that does, then one that holds it anywhere,
 * accents off ("theo" finds Théophane). Two letters at least, so one letter
 * does not list half the calendar.
 */
export function findSaints(query: string, limit = 4): RequestSaint[] {
  const q = fold(query.trim());
  if (q.length < 2) return [];
  const scored: { s: SaintBrief; score: number }[] = [];
  for (const s of BRIEFS) {
    const forms = formsOf(s);
    let score = -1;
    if (forms.some((f) => f.startsWith(q))) score = 0;
    else if (forms.some((f) => f.split(/[\s,.-]+/).some((w) => w.startsWith(q)))) score = 1;
    else if (forms.some((f) => f.includes(q))) score = 2;
    if (score >= 0) scored.push({ s, score });
  }
  return scored
    .sort((a, b) => a.score - b.score || nameCore(a.s.name).localeCompare(nameCore(b.s.name), "en"))
    .slice(0, limit)
    .map(({ s }) => asRequestSaint(s));
}

/** "St. Phanourios": the name as the door to his icons writes it, without his epithet. */
export function saintShortName(name: string): string {
  return name.replace(/\s+(the|of)\s.*$/i, "").trim() || name;
}
