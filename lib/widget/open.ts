/**
 * What a tap on a home screen widget opens (docs/WIDGETS.md, section 3).
 *
 * A widget is drawn by the phone, which knows nothing about the app's
 * screens, so a tap carries an address and not a route:
 * WIDGET_PREFIX and a target, "verse/luke/8/25", "calendar", "saint/...".
 * It travels the icon shortcuts' road (Android's ShortcutActivity hands it to
 * Capacitor as an opened URL), and components/native/ShortcutListener.tsx
 * asks this file which screen it means and gives that to the router.
 *
 * The same rules as lib/shortcuts/shortcuts.ts, for the same reasons: the
 * address is compared as text and never parsed as a URL, the targets are a
 * fixed list, and the parts that vary are checked against what the app holds
 * (a book of the Bible and a chapter it has, a saint it has a page for). On
 * Android another installed app can name MainActivity outright, so an
 * address must only ever pick one of these screens and never do more than
 * open it. Anything under the prefix that is not one of them opens Today,
 * which is what a widget that cannot say more means anyway.
 */

import profiledSaints from "@/data/calendar/profiled-saints.json";
import { getBook } from "@/lib/bible/books";
import { getRuleMeta } from "@/lib/prayers/rules";

/** What every widget's address starts with. The scheme is the app's id. */
export const WIDGET_PREFIX = "net.purifyapp.purify://widget/";

/** Today, the app's front door, and where an address that says nothing goes. */
const TODAY = "/";

/** The address a widget carries for a target ("calendar", "verse/john/3/16"). */
export function widgetUrl(target: string): string {
  return WIDGET_PREFIX + target;
}

/**
 * A daily rule's own screen, from the rule registry, so the widget opens the
 * rule where the app keeps it. Both rules are in the registry; Today stands in
 * only if one ever left it.
 */
function ruleRoute(id: "morning" | "evening"): string {
  return getRuleMeta(id)?.href ?? TODAY;
}

/** The targets that carry nothing of their own, letter for letter. */
const FIXED = new Map<string, () => string>([
  ["today", () => TODAY],
  // The calendar opens on today, which is what the Today and Countdown
  // families show.
  ["calendar", () => "/calendar"],
  ["whats-new", () => "/whats-new"],
  ["pray/morning", () => ruleRoute("morning")],
  ["pray/evening", () => ruleRoute("evening")],
]);

/** A chapter or a verse number as a widget writes one: 1 to 999, no leading zero. */
const NUMBER = /^[1-9]\d{0,2}$/;

/** A saint's slug as the registry spells one: "john-chrysostom". */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The saints the app has a page for. The registry in brief, row for row. */
const SAINTS = new Set((profiledSaints as { slug: string }[]).map((s) => s.slug));

/**
 * A verse of the Bible, as the Verse of the Day's own link writes it
 * (lib/today/verseOfDay.ts): the chapter, at the verse. Null when the book is
 * not one the app has or the chapter is past its last.
 *
 * The verse is checked for shape only. A verse past the chapter's end opens
 * the chapter at its top, which is still the right chapter.
 */
function verseRoute(book: string, chapter: string, verse: string): string | null {
  const known = getBook(book);
  if (!known || !NUMBER.test(chapter) || !NUMBER.test(verse)) return null;
  if (Number(chapter) > known.chapters) return null;
  return `/bible/${known.slug}/${Number(chapter)}#v${Number(verse)}`;
}

/**
 * The screen a widget's tap opens, or null when the URL is not a widget's at
 * all. Every URL the app is opened with comes past here (the icon shortcuts
 * and the Google sign-in callback among them), and null leaves it alone.
 */
export function widgetTarget(url: unknown): string | null {
  if (typeof url !== "string" || !url.startsWith(WIDGET_PREFIX)) return null;
  const target = url.slice(WIDGET_PREFIX.length);

  const fixed = FIXED.get(target);
  if (fixed) return fixed();

  const parts = target.split("/");
  if (parts[0] === "verse" && parts.length === 4) {
    return verseRoute(parts[1], parts[2], parts[3]) ?? TODAY;
  }
  if (parts[0] === "saint" && parts.length === 2 && SLUG.test(parts[1]) && SAINTS.has(parts[1])) {
    return `/saints/${parts[1]}`;
  }
  return TODAY;
}
