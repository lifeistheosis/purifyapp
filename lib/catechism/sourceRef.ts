// A question's source_ref is a site path into free content. This module says
// which paths are allowed, checks that the thing at the end of the path
// exists in the registries, and names it for the answer screen.
//
// Pure and registry-backed, not filesystem-backed, so scripts/quiz-import.ts
// can run it under plain Node and a unit test can run it without a server.
// The one registry that lives on disk (data/topics/*.json) is handed in as a
// lookup by the caller: bank.ts reads it with lib/topics/topics.ts, the
// import script reads the directory itself.
//
// NOT for the client bundle. The saints registry alone is five thousand
// lines; the client receives the resolved {href, label} inside the window
// and never resolves anything.

import { getBook } from "@/lib/bible/books";
import { getCouncil } from "@/lib/councils/councils";
import { getHeresy } from "@/lib/heresies/heresies";
import { listAkathists } from "@/lib/prayers/akathists";
import { listHours } from "@/lib/prayers/hours";
import { RULES } from "@/lib/prayers/rules";
import { getSaint, getWork } from "@/lib/saints/saints";

import type { ResolvedSource, SourceRefKind } from "./types";

export type Registries = {
  /** Title of a curated topic by slug, or null when there is no such file. */
  topicTitle: (slug: string) => string | null;
};

export type ParsedSourceRef = {
  kind: SourceRefKind;
  href: string;
  saint?: string;
  work?: string;
  section?: number;
  slug?: string;
  book?: string;
  chapter?: number;
  path?: string;
};

const SLUG = "[a-z0-9]+(?:-[a-z0-9]+)*";

const SHAPES: { kind: SourceRefKind; re: RegExp }[] = [
  { kind: "work", re: new RegExp(`^/saints/(${SLUG})/(${SLUG})#s(\\d{1,4})$`) },
  { kind: "saint", re: new RegExp(`^/saints/(${SLUG})$`) },
  { kind: "heresy", re: new RegExp(`^/heresies/(${SLUG})$`) },
  { kind: "council", re: new RegExp(`^/councils/(${SLUG})$`) },
  { kind: "topic", re: new RegExp(`^/topics/(${SLUG})$`) },
  { kind: "bible", re: new RegExp(`^/bible/(${SLUG})/(\\d{1,3})(?:#v\\d{1,3})?$`) },
  { kind: "prayer", re: new RegExp(`^/prayers(?:/${SLUG}(?:/${SLUG})?)?$`) },
];

/**
 * The route shapes a source may take. Shape only: a well-formed path to a
 * saint who does not exist parses here and fails in resolveSourceRef.
 */
export function parseSourceRef(ref: string): ParsedSourceRef | null {
  if (typeof ref !== "string") return null;
  for (const { kind, re } of SHAPES) {
    const m = re.exec(ref);
    if (!m) continue;
    switch (kind) {
      case "work":
        return { kind, href: ref, saint: m[1], work: m[2], section: Number(m[3]) };
      case "saint":
        return { kind, href: ref, slug: m[1] };
      case "heresy":
      case "council":
      case "topic":
        return { kind, href: ref, slug: m[1] };
      case "bible":
        return { kind, href: ref, book: m[1], chapter: Number(m[2]) };
      case "prayer":
        return { kind, href: ref, path: ref };
    }
  }
  return null;
}

// Prayer surfaces with their own page and no registry entry. Labels are the
// page titles as the tab bar and the index name them.
const FIXED_PRAYER_PATHS: Record<string, string> = {
  "/prayers": "Prayers",
  "/prayers/today": "Prayers for today",
  "/prayers/rope": "The Prayer Rope",
  "/prayers/anthem": "The Prayer Rope Anthem",
  "/prayers/learning": "Learning to pray",
  "/prayers/personal": "Personal prayers",
  "/prayers/hours": "The Hours",
  "/prayers/akathists": "Akathists",
};

function prayerLabel(path: string): string | null {
  const fixed = FIXED_PRAYER_PATHS[path];
  if (fixed) return fixed;
  const rule = RULES.find((r) => r.href === path && !r.planned);
  if (rule) return rule.title;
  const hour = listHours().find((h) => `/prayers/hours/${h.slug}` === path);
  if (hour) return hour.title;
  const akathist = listAkathists().find(
    (a) => `/prayers/akathists/${a.slug}` === path,
  );
  if (akathist) return akathist.title;
  return null;
}

/**
 * Resolve a source_ref to where it goes and what to call it, or null when
 * the path is malformed or names something the registries do not hold.
 *
 * A work section (#sN) is checked for a positive integer only. Whether the
 * work actually has that many sections needs the work's JSON, which is a
 * filesystem read; the import script does that check itself.
 */
export function resolveSourceRef(
  ref: string,
  registries: Registries,
): ResolvedSource | null {
  const p = parseSourceRef(ref);
  if (!p) return null;
  switch (p.kind) {
    case "saint": {
      const saint = getSaint(p.slug!);
      return saint ? { kind: p.kind, href: p.href, label: saint.name } : null;
    }
    case "work": {
      const hit = getWork(p.saint!, p.work!);
      if (!hit || !p.section || p.section < 1) return null;
      return {
        kind: p.kind,
        href: p.href,
        label: `${hit.saint.name}, ${hit.work.title}, section ${p.section}`,
      };
    }
    case "heresy": {
      const h = getHeresy(p.slug!);
      return h ? { kind: p.kind, href: p.href, label: h.name } : null;
    }
    case "council": {
      const c = getCouncil(p.slug!);
      return c ? { kind: p.kind, href: p.href, label: c.name } : null;
    }
    case "topic": {
      const title = registries.topicTitle(p.slug!);
      return title ? { kind: p.kind, href: p.href, label: title } : null;
    }
    case "bible": {
      const book = getBook(p.book!);
      if (!book || !p.chapter || p.chapter < 1 || p.chapter > book.chapters) return null;
      return { kind: p.kind, href: p.href, label: `${book.name} ${p.chapter}` };
    }
    case "prayer": {
      const label = prayerLabel(p.path!);
      return label ? { kind: p.kind, href: p.href, label } : null;
    }
  }
}
