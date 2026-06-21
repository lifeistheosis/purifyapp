// Cross-section relations for the Theology study system.
//
// The four modes — Doctrine (this folder), Topics, Heresies, Apologetics —
// are one connected research surface, not four archives. This module is the
// curated graph that ties them together: which doctrine answers which heresy,
// which apologetic response goes deeper into which doctrine, which council and
// Fathers stand behind each.
//
// Two sources feed a node's "related" set:
//   1. This curated map (cross-SECTION edges that no single dataset records,
//      e.g. doctrine:filioque ↔ heresies:arianism ↔ apologetics).
//   2. Auto-derived councils/saints from a study's own body (merged at the
//      call site via `mergeRelated`, e.g. body.councils + saintsCitedIn).
//
// Pure data + sync resolvers over the existing registries — no fs, no
// "use client" — so it can be imported from any server component. Every slug
// is validated against the registries by lib/theology/__tests__/relations.test.ts.

import { getTopicMeta } from "./topics";
import { HERESIES } from "@/lib/heresies/heresies";
import { getApologeticsMeta } from "@/lib/apologetics/topics";
import { COUNCILS } from "@/lib/councils/councils";
import { SAINTS } from "@/lib/saints/saints";

export type SectionKind = "doctrine" | "topics" | "heresies" | "apologetics";

/** A relation's slug lists, by target section. All slugs reference real
 * registry entries (enforced by the test). Councils/saints are usually
 * auto-derived, but may be pinned here when they aren't cited in the body. */
export type Relation = {
  doctrine?: string[];
  apologetics?: string[];
  heresies?: string[];
  topics?: string[];
  councils?: string[];
  saints?: string[];
};

/** A resolved, render-ready link. */
export type RelatedLink = { kind: SectionKind | "councils" | "saints"; slug: string; label: string; href: string };

/** Grouped resolved links for the RelatedRail. */
export type RelatedGroups = {
  doctrine: RelatedLink[];
  apologetics: RelatedLink[];
  heresies: RelatedLink[];
  topics: RelatedLink[];
  councils: RelatedLink[];
  saints: RelatedLink[];
};

const key = (kind: SectionKind, slug: string) => `${kind}:${slug}`;

// ── Curated cross-section edges ────────────────────────────────────────────
// Keyed `${kind}:${slug}`. Seeded with the connections the per-section data
// doesn't already carry. Councils/saints are auto-derived from bodies; pin
// them here only where a node has no body to derive from (heresies, topics).
const RELATIONS: Record<string, Relation> = {
  // Doctrine → the controversies and outward defenses it touches.
  [key("doctrine", "filioque")]: {
    topics: ["the-holy-trinity"],
    heresies: ["arianism", "macedonianism"],
  },
  [key("doctrine", "the-theotokos")]: {
    topics: ["the-theotokos", "the-incarnation"],
    heresies: ["nestorianism"],
  },
  [key("doctrine", "theosis")]: {
    topics: ["theosis"],
  },
  [key("doctrine", "original-sin")]: {
    topics: ["theosis"],
  },
  [key("doctrine", "papacy")]: {
    apologetics: ["sola-scriptura"],
  },
  [key("doctrine", "comma-johanneum")]: {
    topics: ["the-holy-trinity"],
    doctrine: ["mark-longer-ending"],
  },
  [key("doctrine", "mark-longer-ending")]: {
    doctrine: ["comma-johanneum"],
  },

  // Apologetics → the deeper Doctrine study (go deeper, don't duplicate).
  [key("apologetics", "sola-scriptura")]: {
    doctrine: ["papacy"],
  },

  // Heresies → the Doctrine study that answers them (councils/saints/topic
  // already live in lib/heresies/heresies.ts).
  [key("heresies", "arianism")]: {
    doctrine: ["filioque"],
    councils: ["first-nicaea"],
    saints: ["athanasius-the-great"],
  },
  [key("heresies", "macedonianism")]: {
    doctrine: ["filioque"],
    councils: ["first-constantinople"],
  },
  [key("heresies", "nestorianism")]: {
    doctrine: ["the-theotokos"],
    councils: ["ephesus"],
    saints: ["cyril-of-alexandria"],
  },

  // Topics → the long-form Doctrine study behind the short definition.
  [key("topics", "the-holy-trinity")]: { doctrine: ["filioque"] },
  [key("topics", "the-theotokos")]: { doctrine: ["the-theotokos"] },
  [key("topics", "theosis")]: { doctrine: ["theosis"] },
};

/** Raw curated relation for a node (empty when none). */
export function relationFor(kind: SectionKind, slug: string): Relation {
  return RELATIONS[key(kind, slug)] ?? {};
}

// ── Resolvers (slug → render-ready link) ───────────────────────────────────
function uniq<T>(items: T[], id: (t: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((t) => (seen.has(id(t)) ? false : (seen.add(id(t)), true)));
}

function resolveDoctrine(slug: string): RelatedLink | null {
  const m = getTopicMeta(slug);
  return m ? { kind: "doctrine", slug, label: m.title, href: `/theology/${slug}` } : null;
}
function resolveHeresy(slug: string): RelatedLink | null {
  const h = HERESIES.find((x) => x.slug === slug);
  return h ? { kind: "heresies", slug, label: h.name, href: `/heresies/${slug}` } : null;
}
function resolveApologetics(slug: string): RelatedLink | null {
  const m = getApologeticsMeta(slug);
  return m ? { kind: "apologetics", slug, label: m.title, href: `/apologetics/${slug}` } : null;
}
function resolveCouncil(slug: string): RelatedLink | null {
  const c = COUNCILS.find((x) => x.slug === slug);
  return c ? { kind: "councils", slug, label: c.byname, href: `/councils/${slug}` } : null;
}
function resolveSaint(slug: string): RelatedLink | null {
  const s = SAINTS.find((x) => x.slug === slug);
  return s ? { kind: "saints", slug, label: s.name, href: `/saints/${slug}` } : null;
}
// Topic titles live behind a server-only fs loader; derive a clean label from
// the slug (the topic registry titles are exactly the title-cased slug).
function resolveTopic(slug: string): RelatedLink {
  const label = slug
    .split("-")
    .map((w) => (w === "the" || w === "of" || w === "and" ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ")
    .replace(/^[a-z]/, (c) => c.toUpperCase());
  return { kind: "topics", slug, label, href: `/topics/${slug}` };
}

/** Resolve a curated Relation into grouped, render-ready links. */
export function resolveRelation(rel: Relation): RelatedGroups {
  return {
    doctrine: (rel.doctrine ?? []).map(resolveDoctrine).filter(Boolean) as RelatedLink[],
    apologetics: (rel.apologetics ?? []).map(resolveApologetics).filter(Boolean) as RelatedLink[],
    heresies: (rel.heresies ?? []).map(resolveHeresy).filter(Boolean) as RelatedLink[],
    topics: (rel.topics ?? []).map(resolveTopic),
    councils: (rel.councils ?? []).map(resolveCouncil).filter(Boolean) as RelatedLink[],
    saints: (rel.saints ?? []).map(resolveSaint).filter(Boolean) as RelatedLink[],
  };
}

/** Merge curated relations for a node with extra relations derived from its
 * own dataset (e.g. a doctrine body's councils/saints, a heresy's condemnedBy
 * and relatedTopic), excluding the node itself. */
export function buildRelated(
  kind: SectionKind,
  slug: string,
  extra?: Relation,
): RelatedGroups {
  const base = resolveRelation(relationFor(kind, slug));
  const ex = resolveRelation(extra ?? {});
  const self = `${kind}:${slug}`;
  const merge = (a: RelatedLink[], b: RelatedLink[]) =>
    uniq([...a, ...b], (l) => `${l.kind}:${l.slug}`).filter((l) => `${l.kind}:${l.slug}` !== self);
  return {
    doctrine: merge(base.doctrine, ex.doctrine),
    apologetics: merge(base.apologetics, ex.apologetics),
    heresies: merge(base.heresies, ex.heresies),
    topics: merge(base.topics, ex.topics),
    councils: merge(base.councils, ex.councils),
    saints: merge(base.saints, ex.saints),
  };
}

/** True when a group set has any link. */
export function hasAnyRelated(g: RelatedGroups): boolean {
  return (
    g.doctrine.length + g.apologetics.length + g.heresies.length + g.topics.length + g.councils.length + g.saints.length >
    0
  );
}

/** All curated keys, for the validation test. */
export function _curatedEntries(): [string, Relation][] {
  return Object.entries(RELATIONS);
}
