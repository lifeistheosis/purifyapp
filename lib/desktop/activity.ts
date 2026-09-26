// What the desktop app tells Discord a reader is doing, from the page they are
// on. Pure: the route and the page title in, a description out. The desktop
// app (desktop/src-tauri/src/presence.rs) validates it again before Discord
// sees it; this is where the decisions about what to say are made.
//
// Three levels, chosen by the reader in Settings and off until they choose:
//
//   off      nothing is sent.
//   app      "In Purify", whatever the page. Nothing about what they read.
//   reading  what they are reading, with a button a friend can follow to the
//            same page. Scripture by book and chapter, a saint or a study by
//            name.
//
// Some things are never described, whichever level is chosen:
//
//   - which prayer. Prayer shows as "At prayer" and nothing more.
//   - the community, the account, the shop, messages, admin. They show as
//     "In Purify", with no button, so a friend's click never lands on a
//     private page. The desktop app enforces the same list for the button.
//
// No time is ever reported. Discord would show a running clock, and Purify
// keeps no timers on prayer or reading (C3).

import { getBook } from "@/lib/bible/books";

export type PresenceLevel = "off" | "app" | "reading";

export type ActivityKind =
  | "app"
  | "scripture"
  | "prayer"
  | "saints"
  | "writings"
  | "calendar"
  | "library"
  | "catechism";

export type ReadingActivity = {
  kind: ActivityKind;
  /** A proper name: "John 3", "St. John Chrysostom". Never free text. */
  subject?: string;
  /** A public page of the site for the "Open in Purify" button. */
  path?: string;
};

/** Pages that can be described, and where their button may point. */
const LIBRARY_ROOTS = [
  "/councils",
  "/theology",
  "/apologetics",
  "/heresies",
  "/topics",
  "/history",
  "/reading",
  "/florilegium",
  "/fasting",
] as const;

const SITE_SUFFIX = /\s*\|\s*Purify\s*$/;
const SUBJECT_MAX = 80;

/** The page's own title, minus " | Purify", if it names something. */
export function subjectFromTitle(title: string | undefined | null): string | undefined {
  if (!title) return undefined;
  const s = title.replace(SITE_SUFFIX, "").replace(/\s+/g, " ").trim();
  if (!s || /^purify$/i.test(s)) return undefined;
  return s.length > SUBJECT_MAX ? `${s.slice(0, SUBJECT_MAX - 1).trimEnd()}…` : s;
}

function under(path: string, root: string): boolean {
  return path === root || path.startsWith(`${root}/`);
}

/** Split "/bible/john/3" into its segments, ignoring a trailing slash. */
function segments(path: string): string[] {
  return path.split("/").filter(Boolean);
}

export function activityFor(
  pathname: string,
  level: PresenceLevel,
  title?: string | null,
): ReadingActivity | null {
  if (level === "off") return null;
  // The front page is the one button that says nothing about the reader.
  if (level === "app") return { kind: "app", path: "/" };

  // Query and hash never reach Discord.
  const path = pathname.split(/[?#]/)[0] || "/";
  const seg = segments(path);

  if (under(path, "/bible")) {
    const [, slug, chapter] = seg;
    const book = slug ? getBook(slug) : undefined;
    if (book && chapter && /^\d{1,3}$/.test(chapter)) {
      return { kind: "scripture", subject: `${book.name} ${Number(chapter)}`, path: `/bible/${book.slug}/${Number(chapter)}` };
    }
    if (book) return { kind: "scripture", subject: book.name, path: `/bible/${book.slug}` };
    return { kind: "scripture", path: "/bible" };
  }

  // Which prayer is between the reader and God.
  if (under(path, "/prayers")) return { kind: "prayer", path: "/prayers" };

  if (under(path, "/saints")) {
    // A saint's own writing is a different thing to be reading than their
    // life: say so, name the work, and let the button open the writing rather
    // than the saint. The page title already reads "Work, Saint", which is
    // exactly what a friend should see. (Added 2026-09-25.)
    if (seg.length >= 3) {
      return {
        kind: "writings",
        subject: subjectFromTitle(title),
        path: `/saints/${seg[1]}/${seg[2]}`,
      };
    }
    if (seg.length >= 2) {
      return { kind: "saints", subject: subjectFromTitle(title), path: `/saints/${seg[1]}` };
    }
    return { kind: "saints", path: "/saints" };
  }

  if (under(path, "/calendar")) return { kind: "calendar", path: "/calendar" };
  if (under(path, "/catechism")) return { kind: "catechism", path: "/catechism" };

  for (const root of LIBRARY_ROOTS) {
    if (!under(path, root)) continue;
    const detail = seg.length >= 2;
    return {
      kind: "library",
      subject: detail ? subjectFromTitle(title) : undefined,
      // As deep as the site goes (a council's document is
      // /councils/<council>/<document>), so the button opens the page the
      // subject names, not its parent. Two levels only stopped at the
      // council while naming the document (fixed 2026-09-25).
      path: detail ? `/${seg.slice(0, 3).join("/")}` : root,
    };
  }
  if (under(path, "/discover")) return { kind: "library", path: "/discover" };

  // Everything else, including Today, the community, the account and the
  // shop: present, and nothing more.
  return { kind: "app", path: "/" };
}

/** Stable identity for "has what we would show changed?". */
export function activityKey(a: ReadingActivity | null): string {
  return a ? `${a.kind}|${a.subject ?? ""}|${a.path ?? ""}` : "";
}
