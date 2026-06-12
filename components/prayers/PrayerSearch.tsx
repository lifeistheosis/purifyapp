"use client";

// Top-of-page prayer search for /prayers (desktop) and PrayersMobile.
//
// Honors MosesLOL @cloudw_w:
//   "There is many prayers for different things, we can't just scroll
//    till we find it, we should be able to search for it." (2_yes×2)
//
// Behavior:
//   - Empty input → renders `children` (the normal page index).
//   - Typed query → renders a filtered list of every matching surface:
//     daily rules, devotional rules, the rope, the Anthem, the hours,
//     akathists, learning, and the daily-rhythm entry. Title +
//     description + category + href are all matched, case-insensitive.
//   - Match highlight is a quiet semibold span, not a colored highlight,
//     so it sits with the prayer-book register.
//
// The corpus is hand-curated rather than crawled, so we keep editorial
// control over what shows up for which query and don't accidentally
// surface admin pages or planned entries that haven't been seeded.

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "@/components/ui/icons/Search";
import {
  RULES,
  RULE_CATEGORY_LABEL,
  type RuleMeta,
} from "@/lib/prayers/rules";

type SearchEntry = {
  /** Stable key for React. */
  id: string;
  title: string;
  description: string;
  /** Render on the right side of the row. */
  meta?: string;
  href: string;
  /** Tag used in the result row's eyebrow + by the filter. */
  group: string;
  /** Extra strings to match against (jurisdictions, alt names). */
  aliases?: string[];
  planned?: boolean;
};

const STATIC_SURFACES: SearchEntry[] = [
  {
    id: "today",
    title: "Today",
    description: "Today's fast, commemorations, and namedays.",
    href: "/prayers/today",
    group: "The day",
    aliases: ["today", "diptychs", "fast", "saint of the day"],
  },
  {
    id: "rope",
    title: "The prayer rope",
    description: "Tell the Jesus Prayer on the knotted rope.",
    href: "/prayers/rope",
    group: "Devotional",
    aliases: ["jesus prayer", "rope", "chotki", "komvoschini", "noetic prayer"],
  },
  {
    id: "anthem",
    title: "The Prayer Rope Anthem",
    description:
      "A hymn for the rope. Sung knot by knot in English, French, and Arabic.",
    href: "/prayers/anthem",
    group: "Devotional",
    aliases: ["anthem", "chant", "hymn", "rope hymn", "francais", "arabe"],
  },
  {
    id: "hours",
    title: "The Hours",
    description: "Short prayers that sanctify the daylight.",
    href: "/prayers/hours",
    group: "Liturgical",
    aliases: ["hours", "first hour", "third hour", "sixth hour", "ninth hour"],
  },
  {
    id: "akathists",
    title: "The Akathists",
    description: "Long hymns of praise, prayed standing throughout.",
    href: "/prayers/akathists",
    group: "Liturgical",
    aliases: ["akathist", "ikos", "kontakion"],
  },
  {
    id: "learning",
    title: "Learn to pray",
    description: "A short beginner's path through Orthodox prayer.",
    href: "/prayers/learning",
    group: "Learning",
    aliases: ["learn", "beginner", "catechumen", "how to pray"],
  },
];

function ruleToEntry(r: RuleMeta): SearchEntry {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? "",
    meta: r.estimatedMinutes ? `~${r.estimatedMinutes} min` : undefined,
    href: r.href,
    group: RULE_CATEGORY_LABEL[r.category].en,
    aliases: [r.titleDe, r.descriptionDe].filter(Boolean) as string[],
    planned: r.planned,
  };
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

function score(entry: SearchEntry, q: string): number {
  const t = normalize(entry.title);
  const d = normalize(entry.description);
  const g = normalize(entry.group);
  const a = (entry.aliases ?? []).map(normalize);
  // Higher = better match. Title hits dominate. Exact prefix beats
  // substring beats alias-only.
  if (t === q) return 1000;
  if (t.startsWith(q)) return 800;
  if (t.includes(q)) return 600;
  if (a.some((x) => x.startsWith(q))) return 500;
  if (d.includes(q)) return 400;
  if (g.includes(q)) return 300;
  if (a.some((x) => x.includes(q))) return 250;
  return 0;
}

export function PrayerSearch({
  children,
  placeholder = "Search prayers, the rope, the hours",
}: {
  children: React.ReactNode;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");

  const corpus = useMemo<SearchEntry[]>(() => {
    return [...STATIC_SURFACES, ...RULES.filter((r) => !r.planned).map(ruleToEntry)];
  }, []);

  const query = q.trim();
  const hits = useMemo(() => {
    if (!query) return [];
    const nq = normalize(query);
    return corpus
      .map((e) => ({ e, s: score(e, nq) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 24)
      .map((r) => r.e);
  }, [query, corpus]);

  const showFiltered = query.length > 0;

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search
          aria-hidden
          className="absolute left-4 top-1/2 -translate-y-1/2 text-paper/40 h-4 w-4"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          aria-label="Search the prayer book"
          className="w-full bg-paper/[0.04] border border-paper/15 rounded-pill pl-10 pr-4 py-3 font-sans text-ui text-paper placeholder:text-paper/40 focus:outline-none focus:border-paper/40 transition-colors duration-150"
        />
      </div>

      {showFiltered ? (
        <PrayerSearchResults hits={hits} query={query} />
      ) : (
        children
      )}
    </div>
  );
}

function PrayerSearchResults({
  hits,
  query,
}: {
  hits: SearchEntry[];
  query: string;
}) {
  if (hits.length === 0) {
    return (
      <div className="rounded-md border border-paper/12 bg-paper/[0.02] px-5 py-8 text-center">
        <p className="font-serif text-lede text-paper/75">
          No matches for{" "}
          <span className="italic text-paper">{query}</span>.
        </p>
        <p className="mt-2 font-sans text-detail text-paper/45">
          Try a shorter word, or browse the full list of rules below by
          clearing the search.
        </p>
      </div>
    );
  }

  // Group hits by their entry.group so the results don't look like a
  // flat blob. Keeps the prayer-book register.
  const groups = new Map<string, SearchEntry[]>();
  for (const h of hits) {
    if (!groups.has(h.group)) groups.set(h.group, []);
    groups.get(h.group)!.push(h);
  }

  return (
    <div className="space-y-8">
      <p className="font-sans text-eyebrow uppercase tracking-[1.5px] text-paper/45">
        {hits.length} match{hits.length === 1 ? "" : "es"} for{" "}
        <span className="italic text-paper/65">{query}</span>
      </p>
      {[...groups.entries()].map(([group, list]) => (
        <section key={group}>
          <p className="mb-3 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55">
            {group}
          </p>
          <ul className="divide-y divide-paper/10 border-y border-paper/10">
            {list.map((h) => (
              <li key={h.id}>
                <Link
                  href={h.href}
                  className="group flex items-start justify-between gap-4 py-4 px-1 hover:bg-paper/[0.04] transition-colors"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif text-ui md:text-lede text-paper group-hover:text-paper">
                      <Highlight text={h.title} query={query} />
                    </span>
                    {h.description && (
                      <span className="mt-1 block font-sans text-detail text-paper/55">
                        <Highlight text={h.description} query={query} />
                      </span>
                    )}
                  </span>
                  {h.meta && (
                    <span className="shrink-0 font-sans text-caption text-paper/35 tabular-nums mt-1">
                      {h.meta}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * Wraps each occurrence of the query (case-insensitive) in a quiet
 * semibold span so the eye lands on it without the result row looking
 * like a search-engine highlight strip. We deliberately don't change
 * color or background.
 */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${safe})`, "ig"));
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span key={i} className="font-semibold text-paper">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
