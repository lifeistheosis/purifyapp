import Link from "next/link";

import {
  TheologyFilter,
  type StudyItem,
} from "@/components/theology/TheologyFilter";
import {
  THEOLOGY_TOPICS,
  THEOLOGY_GROUP_ORDER,
  THEOLOGY_GROUP_LABEL,
  topicsByGroup,
  type TheologyGroup,
} from "@/lib/theology/topics";
import { loadTopicBody, saintsCitedIn } from "@/lib/theology/load";
import { buildRelated, type RelatedLink } from "@/lib/theology/relations";
import { APOLOGETICS_TOPICS } from "@/lib/apologetics/topics";
import { loadApologeticsBody } from "@/lib/apologetics/load";
import { HERESIES } from "@/lib/heresies/heresies";
import { loadAllTopics } from "@/lib/topics/topics";
import { COUNCILS } from "@/lib/councils/councils";
import { getSaint } from "@/lib/saints/saints";
import { Cross } from "@/components/ui/icons/Cross";
import { Book } from "@/components/ui/icons/Book";
import { Scroll } from "@/components/ui/icons/Scroll";
import { Bolt } from "@/components/ui/icons/Bolt";

export const metadata = {
  title: "Theology",
  description:
    "The Orthodox theological study library: long-form Doctrine, focused Topics, the Heresies the Church condemned, and Apologetics, one connected research surface drawn verbatim from the Fathers and the Councils.",
};

export const revalidate = 3600;

type Section = StudyItem["section"];

const MODES = [
  {
    label: "Doctrine",
    kicker: "Treatise",
    href: "/theology/doctrine",
    blurb:
      "Long-form dogmatic studies, traced through Scripture, the Fathers, and the Councils.",
    Icon: Cross,
  },
  {
    label: "Topics",
    kicker: "Reference",
    href: "/topics",
    blurb: "Focused questions, answered plainly, each with the Fathers' own words.",
    Icon: Book,
  },
  {
    label: "Heresies",
    kicker: "Dossier",
    href: "/heresies",
    blurb:
      "The chief errors the Church condemned, what was claimed and why it was rejected.",
    Icon: Scroll,
  },
  {
    label: "Apologetics",
    kicker: "Defense",
    href: "/apologetics",
    blurb: "Objections and replies, a reasoned answer to the questions an objector brings.",
    Icon: Bolt,
  },
] as const;

// Flagship study + the question it settles, for the hero focal point.
const FLAGSHIP = {
  slug: "filioque",
  question: "Does the Holy Spirit proceed from the Father alone?",
};
const FEATURED = ["filioque", "papacy", "the-theotokos"]; // doctrine slugs

type Study = {
  slug: string;
  title: string;
  href: string;
  section: Section;
  summary?: string;
  date?: string;
  group?: TheologyGroup;
  council?: RelatedLink | null;
  father?: RelatedLink | null;
};

export default async function TheologyHubPage() {
  const [topics, doctrine, apologetics] = await Promise.all([
    loadAllTopics(),
    Promise.all(
      THEOLOGY_TOPICS.filter((t) => !t.planned).map(async (meta) => ({
        meta,
        body: await loadTopicBody(meta.slug),
      })),
    ),
    Promise.all(
      APOLOGETICS_TOPICS.filter((t) => !t.planned).map(async (meta) => ({
        meta,
        body: await loadApologeticsBody(meta.slug),
      })),
    ),
  ]);

  const studies: Study[] = [
    ...doctrine.map(({ meta, body }) => ({
      slug: meta.slug,
      title: meta.title,
      href: `/theology/${meta.slug}`,
      section: "Doctrine" as const,
      summary: meta.summary,
      date: body?.curatedOn,
      group: meta.group,
    })),
    ...topics.map((t) => ({
      slug: t.slug,
      title: t.title,
      href: `/topics/${t.slug}`,
      section: "Topics" as const,
      summary: t.definition,
      date: t.curatedOn,
    })),
    ...HERESIES.map((h) => ({
      slug: h.slug,
      title: h.name,
      href: `/heresies/${h.slug}`,
      section: "Heresies" as const,
      summary: h.shortBio,
      date: h.curatedOn,
    })),
    ...apologetics.map(({ meta, body }) => ({
      slug: meta.slug,
      title: meta.title,
      href: `/apologetics/${meta.slug}`,
      section: "Apologetics" as const,
      summary: meta.summary,
      date: body?.curatedOn,
    })),
  ];

  const counts: Record<Section, number> = {
    Doctrine: doctrine.length,
    Topics: topics.length,
    Heresies: HERESIES.length,
    Apologetics: apologetics.length,
    Councils: 0,
    Fathers: 0,
  };

  // Featured doctrine studies, enriched with a related council + Father.
  function enrich(slug: string): Study | null {
    const entry = doctrine.find((d) => d.meta.slug === slug);
    if (!entry) return null;
    const base = studies.find(
      (s) => s.section === "Doctrine" && s.slug === slug,
    )!;
    let council: RelatedLink | null = null;
    let father: RelatedLink | null = null;
    if (entry.body) {
      const groups = buildRelated("doctrine", slug, {
        councils: (entry.body.councils ?? [])
          .map((c) => c.councilSlug)
          .filter((x): x is string => Boolean(x)),
        saints: saintsCitedIn(entry.body).map((s) => s.saintSlug),
      });
      council = groups.councils[0] ?? null;
      father = groups.saints[0] ?? null;
    }
    return { ...base, council, father };
  }
  const featured = FEATURED.map(enrich).filter(Boolean) as Study[];
  const [primary, ...secondary] = featured;

  const recent = studies
    .filter((s) => s.date)
    .sort((a, b) => (a.date! < b.date! ? 1 : a.date! > b.date! ? -1 : 0))
    .slice(0, 6);
  const newestDate = recent[0]?.date;

  // Fathers cited across the doctrine studies, with their short role.
  const fatherSlugs: string[] = [];
  const seen = new Set<string>();
  for (const { body } of doctrine) {
    if (!body) continue;
    for (const s of saintsCitedIn(body))
      if (!seen.has(s.saintSlug)) {
        seen.add(s.saintSlug);
        fatherSlugs.push(s.saintSlug);
      }
  }
  const fathers = fatherSlugs
    .map((slug) => getSaint(slug))
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .slice(0, 8);

  const ecumenical = COUNCILS.filter((c) => c.kind !== "local").slice(0, 7);

  // Search corpus: every mode plus councils + Fathers, so the chips reach all six.
  const filterItems: StudyItem[] = [
    ...studies.map(({ slug, title, href, section, summary }) => ({
      slug,
      title,
      href,
      section,
      summary,
    })),
    ...ecumenical.map((c) => ({
      slug: c.slug,
      title: c.byname,
      href: `/councils/${c.slug}`,
      section: "Councils" as const,
      summary: c.shortBio,
    })),
    ...fathers.map((s) => ({
      slug: s.slug,
      title: s.name,
      href: `/saints/${s.slug}`,
      section: "Fathers" as const,
      summary: s.byname ?? s.epithet,
    })),
  ];

  return (
    <section className="bg-night px-5 md:px-8 py-10 md:py-14">
      <div className="mx-auto w-full max-w-[920px]">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <header className="border-b border-paper/10 pb-10 md:pb-12">
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-paper/45">
            The study library
          </p>
          <h1 className="mt-3 font-serif text-display md:text-display-lg font-bold leading-[1.02] tracking-[-0.025em] text-paper">
            Theology
          </h1>
          <p className="mt-5 max-w-[60ch] font-serif text-lede text-paper/80 leading-[1.7]">
            One connected study of the Faith, in four modes. Read the doctrine in
            long form, settle a focused question, learn the errors the Church
            condemned, or weigh an objection. Every citation is verbatim,
            public-domain, and sourced to the Fathers and the Councils.
          </p>

          {/* Highlighted theological question, the focal point. */}
          {primary ? (
            <Link
              href={primary.href}
              className="group mt-8 flex items-center justify-between gap-5 rounded-xl border border-gold/25 bg-gold/[0.04] px-5 py-4 transition-colors hover:border-gold/45 hover:bg-gold/[0.07]"
            >
              <div>
                <p className="font-sans text-caption font-semibold uppercase tracking-[1.6px] text-gold/75">
                  Begin here
                </p>
                <p className="mt-1.5 font-serif text-title-sm text-paper leading-snug">
                  {FLAGSHIP.question}
                </p>
                <p className="mt-1 font-sans text-detail text-paper/55">
                  {primary.title}
                </p>
              </div>
              <span
                aria-hidden
                className="shrink-0 font-sans text-title-sm text-gold/60 transition-transform group-hover:translate-x-0.5 group-hover:text-gold"
              >
                →
              </span>
            </Link>
          ) : null}
        </header>

        {/* ── Four modes ────────────────────────────────────────────────── */}
        <section className="mt-10 md:mt-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px overflow-hidden rounded-xl border border-paper/[0.1] bg-paper/[0.08]">
            {MODES.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="group flex flex-col bg-night p-5 md:p-6 transition-colors hover:bg-paper/[0.02]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-paper/55 transition-colors group-hover:text-gold">
                    <m.Icon size={22} />
                  </span>
                  <span className="font-sans text-caption uppercase tracking-[1.4px] text-paper/35 tabular-nums">
                    {m.kicker} · {counts[m.label]}
                  </span>
                </div>
                <p className="mt-4 font-serif text-title-sm font-semibold text-paper transition-colors group-hover:text-gold">
                  {m.label}
                </p>
                <p className="mt-1.5 font-serif text-ui text-paper/65 leading-[1.6]">
                  {m.blurb}
                </p>
                <span
                  aria-hidden
                  className="mt-4 font-sans text-detail text-paper/30 transition-colors group-hover:text-gold"
                >
                  Enter →
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Search ────────────────────────────────────────────────────── */}
        <section className="mt-12">
          <SectionHead title="Search the library" />
          <TheologyFilter items={filterItems} />
        </section>

        {/* ── Featured studies ──────────────────────────────────────────── */}
        {featured.length > 0 ? (
          <section className="mt-14">
            <SectionHead title="Featured studies" />
            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
              {primary ? <FeaturedPrimary study={primary} /> : null}
              <div className="flex flex-col divide-y divide-paper/[0.08] rounded-xl border border-paper/[0.1] bg-paper/[0.02]">
                {secondary.map((s) => (
                  <FeaturedSecondary key={s.href} study={s} />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Recently added ────────────────────────────────────────────── */}
        <section className="mt-14">
          <SectionHead title="Recently added" />
          <ul className="divide-y divide-paper/[0.07] border-t border-paper/[0.07]">
            {recent.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="group flex items-baseline gap-4 py-3.5"
                >
                  <span className="shrink-0 w-24 pt-0.5 font-sans text-caption uppercase tracking-[1.2px] text-paper/40">
                    {s.section}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-serif text-ui font-semibold text-paper transition-colors group-hover:text-gold">
                        {s.title}
                      </span>
                      {s.date && s.date === newestDate ? (
                        <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 font-sans text-[0.625rem] font-semibold uppercase tracking-[1px] text-gold/90">
                          New
                        </span>
                      ) : null}
                    </span>
                    {s.summary ? (
                      <span className="mt-0.5 block font-serif text-detail text-paper/55 leading-[1.5] line-clamp-1">
                        {s.summary}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Doctrinal categories ──────────────────────────────────────── */}
        <section className="mt-14">
          <SectionHead title="Doctrinal categories" />
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-px">
            {THEOLOGY_GROUP_ORDER.map((g) => {
              const label = THEOLOGY_GROUP_LABEL[g];
              const n = topicsByGroup(g).filter((t) => !t.planned).length;
              return (
                <li key={g}>
                  <Link
                    href="/theology/doctrine"
                    className="group block border-b border-paper/[0.07] py-3"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-serif text-ui font-semibold text-paper transition-colors group-hover:text-gold">
                        {label.en}
                      </span>
                      {n > 0 ? (
                        <span className="shrink-0 font-sans text-caption text-paper/35 tabular-nums">
                          {n}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block font-serif text-detail text-paper/50 leading-[1.5]">
                      {label.subtitle}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ── Ecumenical Councils ───────────────────────────────────────── */}
        <section className="mt-14">
          <SectionHead
            title="The Ecumenical Councils"
            seeAll={{ href: "/councils", text: "All councils" }}
          />
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ecumenical.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/councils/${c.slug}`}
                  className="group block h-full rounded-lg border border-paper/[0.1] bg-paper/[0.02] px-4 py-3.5 transition-colors hover:border-gold/35 hover:bg-paper/[0.04]"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-serif text-ui font-semibold text-paper transition-colors group-hover:text-gold">
                      {c.byname}
                    </span>
                    <span className="shrink-0 font-sans text-caption text-paper/40 tabular-nums">
                      {c.year}
                    </span>
                  </div>
                  <p className="mt-0.5 font-sans text-caption text-paper/45">
                    {c.location}
                  </p>
                  <p className="mt-2 font-serif text-detail text-paper/60 leading-[1.5] line-clamp-2">
                    {c.shortBio}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Fathers in these studies ──────────────────────────────────── */}
        {fathers.length > 0 ? (
          <section className="mt-14">
            <SectionHead
              title="Fathers in these studies"
              seeAll={{ href: "/saints", text: "All saints" }}
            />
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-px">
              {fathers.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/saints/${s.slug}`}
                    className="group flex items-baseline justify-between gap-3 border-b border-paper/[0.07] py-3"
                  >
                    <span className="font-serif text-ui text-paper/90 transition-colors group-hover:text-gold">
                      {s.name}
                    </span>
                    {s.byname ? (
                      <span className="shrink-0 font-serif italic text-detail text-paper/45">
                        {s.byname}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ── Closing bridge ────────────────────────────────────────────── */}
        <section className="mt-16 border-t border-paper/10 pt-10 text-center">
          <p className="font-serif italic text-ui text-paper/55">
            Begin where the Church begins.
          </p>
          <Link
            href="/theology/doctrine"
            className="group mt-3 inline-flex items-center gap-2 font-serif text-title-sm font-semibold text-paper transition-colors hover:text-gold"
          >
            Read the Doctrine
            <span
              aria-hidden
              className="text-gold/70 transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>
        </section>
      </div>
    </section>
  );
}

function SectionHead({
  title,
  seeAll,
}: {
  title: string;
  seeAll?: { href: string; text: string };
}) {
  return (
    <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-paper/[0.08] pb-2.5">
      <h2 className="font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-paper/45">
        {title}
      </h2>
      {seeAll ? (
        <Link
          href={seeAll.href}
          className="font-sans text-caption text-paper/45 hover:text-paper underline decoration-paper/20 underline-offset-4"
        >
          {seeAll.text}
        </Link>
      ) : null}
    </div>
  );
}

function FeaturedPrimary({ study }: { study: Study }) {
  const category = study.group
    ? THEOLOGY_GROUP_LABEL[study.group].en
    : "Doctrine";
  return (
    <Link
      href={study.href}
      className="group flex flex-col rounded-xl border border-paper/[0.12] bg-paper/[0.03] p-6 md:p-7 transition-colors hover:border-gold/35"
    >
      <p className="font-sans text-caption font-semibold uppercase tracking-[1.6px] text-gold/75">
        {category}
      </p>
      <p className="mt-3 font-serif text-title font-semibold text-paper leading-tight transition-colors group-hover:text-gold">
        {study.title}
      </p>
      {study.summary ? (
        <p className="mt-3 font-serif text-ui text-paper/70 leading-[1.7] line-clamp-4">
          {study.summary}
        </p>
      ) : null}
      {study.council || study.father ? (
        <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-caption text-paper/45">
          {study.council ? <span>{study.council.label}</span> : null}
          {study.council && study.father ? (
            <span className="text-paper/20">·</span>
          ) : null}
          {study.father ? <span>{study.father.label}</span> : null}
        </p>
      ) : null}
    </Link>
  );
}

function FeaturedSecondary({ study }: { study: Study }) {
  const category = study.group
    ? THEOLOGY_GROUP_LABEL[study.group].en
    : "Doctrine";
  return (
    <Link
      href={study.href}
      className="group block p-5 transition-colors hover:bg-paper/[0.02]"
    >
      <p className="font-sans text-caption font-semibold uppercase tracking-[1.4px] text-paper/40">
        {category}
      </p>
      <p className="mt-2 font-serif text-lede font-semibold text-paper leading-snug transition-colors group-hover:text-gold">
        {study.title}
      </p>
      {study.summary ? (
        <p className="mt-1.5 font-serif text-detail text-paper/55 leading-[1.55] line-clamp-2">
          {study.summary}
        </p>
      ) : null}
    </Link>
  );
}
