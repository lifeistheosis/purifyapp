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
import { useTranslate } from "@/components/i18n/MessagesProvider";
import {
  RULES,
  type RuleCategory,
  type RuleMeta,
} from "@/lib/prayers/rules";

type Translator = ReturnType<typeof useTranslate>;

/** Result-group labels for the rule categories. "The Church year" already
 *  exists in the catalog under the saints namespace, so it is reused rather
 *  than re-translated into twenty languages. Same map the mobile index uses,
 *  so a rule lands under the same heading in both places. */
const RULE_CATEGORY_KEY: Record<RuleCategory, string> = {
  daily: "prayers.category.daily",
  "daily-life": "prayers.category.dailyLife",
  "church-year": "saints.theChurchYear",
  devotional: "prayers.category.devotional",
};

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

function staticSurfaces(t: Translator["t"]): SearchEntry[] {
  return [
    {
      id: "today",
      title: t("prayers.tabs.today"),
      description: t("prayers.search.todayDescription"),
      href: "/prayers/today",
      group: t("prayers.search.groupDay"),
      aliases: ["today", "diptychs", "fast", "saint of the day"],
    },
    {
      id: "rope",
      title: t("prayers.search.ropeTitle"),
      description: t("prayers.search.ropeDescription"),
      href: "/prayers/rope",
      group: t("prayers.category.devotional"),
      aliases: ["jesus prayer", "rope", "chotki", "komvoschini", "noetic prayer"],
    },
    {
      id: "anthem",
      title: t("today.prayNow.anthemTitle"),
      description: t("prayers.search.anthemDescription"),
      href: "/prayers/anthem",
      group: t("prayers.category.devotional"),
      aliases: ["anthem", "chant", "hymn", "rope hymn", "francais", "arabe"],
    },
    {
      id: "hours",
      title: t("prayers.hours"),
      description: t("prayers.search.hoursDescription"),
      href: "/prayers/hours",
      group: t("prayers.search.groupLiturgical"),
      aliases: ["hours", "first hour", "third hour", "sixth hour", "ninth hour"],
    },
    {
      id: "akathists",
      title: t("prayers.search.akathistsTitle"),
      description: t("prayers.search.akathistsDescription"),
      href: "/prayers/akathists",
      group: t("prayers.search.groupLiturgical"),
      aliases: ["akathist", "ikos", "kontakion"],
    },
    {
      id: "learning",
      title: t("ui.learnToPray"),
      description: t("prayers.search.learningDescription"),
      href: "/prayers/learning",
      group: t("prayers.search.groupLearning"),
      aliases: ["learn", "beginner", "catechumen", "how to pray"],
    },
  ];
}

function ruleToEntry(
  r: RuleMeta,
  t: Translator["t"],
  tn: Translator["tn"],
): SearchEntry {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? "",
    meta: r.estimatedMinutes
      ? tn("prayers.approxMin", r.estimatedMinutes)
      : undefined,
    href: r.href,
    group: t(RULE_CATEGORY_KEY[r.category]),
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
  placeholder,
}: {
  children: React.ReactNode;
  placeholder?: string;
}) {
  const { t, tn } = useTranslate();
  const [q, setQ] = useState("");

  const corpus = useMemo<SearchEntry[]>(() => {
    return [
      ...staticSurfaces(t),
      ...RULES.filter((r) => !r.planned).map((r) => ruleToEntry(r, t, tn)),
    ];
  }, [t, tn]);

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
          placeholder={placeholder ?? t("prayers.search.placeholder")}
          aria-label={t("prayers.searchPlaceholder")}
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
  const { t, tn } = useTranslate();
  if (hits.length === 0) {
    return (
      <div className="rounded-md border border-paper/12 bg-paper/[0.02] px-5 py-8 text-center">
        <p className="font-serif text-lede text-paper/75">
          {t("prayers.search.noMatchesFor")}{" "}
          <span className="italic text-paper">{query}</span>.
        </p>
        <p className="mt-2 font-sans text-detail text-paper/45">
          {t("prayers.search.tryShorter")}
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
        {tn("prayers.search.matchCount", hits.length)}{" "}
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
