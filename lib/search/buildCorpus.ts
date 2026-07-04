import "server-only";

// Cross-surface command-palette corpus. Assembled once on the server from the
// pure-data registries (saints, prayer rules, councils, heresies, Bible books)
// plus the filesystem-loaded topics, then handed to the client palette as a
// flat, serialisable list. No fuzzy index is precomputed here — the corpus is
// small enough (a few hundred entries) that the client filters it directly.
//
// Hidden v10.0 setup: this is the single index the expanded library
// (catena, apologetics, audio-bible passages) will be appended to.

import { SAINTS } from "@/lib/saints/saints";
import { COUNCILS } from "@/lib/councils/councils";
import { HERESIES } from "@/lib/heresies/heresies";
import { BOOKS } from "@/lib/bible/books";
import { RULES } from "@/lib/prayers/rules";
import { loadAllTopics } from "@/lib/topics/topics";
import { publishedEvents } from "@/lib/history/events";
import type { SearchItem } from "./types";

export type { SearchItem, SearchGroup } from "./types";
export { GROUP_ORDER } from "./types";

const STATIC_PAGES: SearchItem[] = [
  { id: "page-calendar", label: "The Church calendar", href: "/calendar", group: "Other" },
  { id: "page-discover", label: "Discover", href: "/discover", group: "Other" },
  { id: "page-reading", label: "Reading", href: "/reading", group: "Other" },
  { id: "page-anthem", label: "The Prayer Rope Anthem", href: "/prayers/anthem", group: "Prayers", keywords: "hymn chant rope" },
  { id: "page-rope", label: "The Prayer Rope", href: "/prayers/rope", group: "Prayers", keywords: "komvoschini knots jesus prayer" },
  { id: "page-support", label: "Support Purify", href: "/support", group: "Other", keywords: "donate give giving" },
  { id: "page-pricing", label: "Pricing", href: "/pricing", group: "Other", keywords: "app pass subscription free" },
  { id: "page-whats-new", label: "What's new", href: "/whats-new", group: "Other", keywords: "release notes changelog updates" },
  { id: "page-about", label: "About Purify", href: "/about", group: "Other" },
];

export async function buildSearchCorpus(): Promise<SearchItem[]> {
  const items: SearchItem[] = [];

  for (const b of BOOKS) {
    items.push({
      id: `book-${b.slug}`,
      label: b.name,
      sublabel: `${b.chapters} ${b.chapters === 1 ? "chapter" : "chapters"}`,
      href: `/bible/${b.slug}/1`,
      group: "Bible",
    });
  }

  for (const s of SAINTS) {
    items.push({
      id: `saint-${s.slug}`,
      label: s.name,
      sublabel: s.epithet,
      href: `/saints/${s.slug}`,
      group: "Saints",
      keywords: s.byname,
    });
  }

  for (const r of RULES) {
    if (r.planned) continue;
    items.push({
      id: `rule-${r.id}`,
      label: r.title,
      sublabel: r.description,
      href: r.href,
      group: "Prayers",
    });
  }

  for (const c of COUNCILS) {
    items.push({
      id: `council-${c.slug}`,
      label: c.name,
      sublabel: `Council · ${c.year}`,
      href: `/councils/${c.slug}`,
      group: "Councils & Heresies",
      keywords: c.byname,
    });
  }

  for (const h of HERESIES) {
    items.push({
      id: `heresy-${h.slug}`,
      label: h.name,
      sublabel: `Heresy · ${h.era}`,
      href: `/heresies/${h.slug}`,
      group: "Councils & Heresies",
      keywords: [h.alsoCalled?.join(" "), h.heresiarch].filter(Boolean).join(" "),
    });
  }

  for (const e of publishedEvents()) {
    items.push({
      id: `history-${e.slug}`,
      label: e.title,
      sublabel: `History · ${e.displayDate}`,
      href: `/history/${e.slug}`,
      group: "History",
      keywords: [e.aliases?.join(" "), e.region, String(e.yearStart)]
        .filter(Boolean)
        .join(" "),
    });
  }

  const topics = await loadAllTopics();
  for (const t of topics) {
    items.push({
      id: `topic-${t.slug}`,
      label: t.title,
      sublabel: "Topic",
      href: `/topics/${t.slug}`,
      group: "Topics",
    });
  }

  items.push(...STATIC_PAGES);
  return items;
}
