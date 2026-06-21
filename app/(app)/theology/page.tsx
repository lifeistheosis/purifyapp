import Link from "next/link";

import { TheologyShell } from "@/components/theology/TheologyShell";
import {
  TheologyFilter,
  type StudyItem,
} from "@/components/theology/TheologyFilter";
import {
  THEOLOGY_TOPICS,
  THEOLOGY_GROUP_ORDER,
  THEOLOGY_GROUP_LABEL,
} from "@/lib/theology/topics";
import { loadTopicBody, saintsCitedIn } from "@/lib/theology/load";
import { APOLOGETICS_TOPICS } from "@/lib/apologetics/topics";
import { loadApologeticsBody } from "@/lib/apologetics/load";
import { HERESIES } from "@/lib/heresies/heresies";
import { loadAllTopics } from "@/lib/topics/topics";
import { COUNCILS } from "@/lib/councils/councils";

export const metadata = {
  title: "Theology",
  description:
    "The Orthodox theological study system: long-form Doctrine, focused Topics, the Heresies the Church condemned, and Apologetics — one connected research surface drawn verbatim from the Fathers and the Councils.",
};

export const revalidate = 3600;

const MODES = [
  {
    label: "Doctrine",
    href: "/theology/doctrine",
    blurb:
      "Long-form dogmatic studies — the doctrine traced through Scripture, the Fathers, and the Councils.",
  },
  {
    label: "Topics",
    href: "/topics",
    blurb:
      "Focused questions and themes, answered plainly, each with the Fathers' own words.",
  },
  {
    label: "Heresies",
    href: "/heresies",
    blurb:
      "The chief errors the Church condemned — what was claimed, and why it was rejected.",
  },
  {
    label: "Apologetics",
    href: "/apologetics",
    blurb:
      "Objections and replies — a reasoned defense against the questions an objector brings.",
  },
];

const FEATURED = ["filioque", "papacy", "the-theotokos"]; // doctrine slugs

type Study = {
  slug: string;
  title: string;
  href: string;
  section: StudyItem["section"];
  summary?: string;
  date?: string;
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

  const filterItems: StudyItem[] = studies.map(
    ({ slug, title, href, section, summary }) => ({
      slug,
      title,
      href,
      section,
      summary,
    }),
  );

  const recent = studies
    .filter((s) => s.date)
    .sort((a, b) => (a.date! < b.date! ? 1 : a.date! > b.date! ? -1 : 0))
    .slice(0, 6);

  const featured = FEATURED.map((slug) =>
    studies.find((s) => s.section === "Doctrine" && s.slug === slug),
  ).filter(Boolean) as Study[];

  // Fathers actually cited across the doctrine studies — no hand-picked list.
  const fathers = new Map<string, string>();
  for (const { body } of doctrine) {
    if (!body) continue;
    for (const s of saintsCitedIn(body))
      if (!fathers.has(s.saintSlug)) fathers.set(s.saintSlug, s.author);
  }
  const fatherList = [...fathers.entries()].slice(0, 12);

  const ecumenical = COUNCILS.filter((c) => c.kind !== "local").slice(0, 7);

  return (
    <TheologyShell isHub>
      <header>
        <h1 className="font-serif text-display-sm md:text-display font-bold leading-[1.08] tracking-[-0.02em] text-paper">
          Theology
        </h1>
        <p className="mt-5 font-serif text-body md:text-lede text-paper/80 leading-[1.75] max-w-[64ch]">
          One connected study of the Faith, in four modes. Read the doctrine in
          long form, settle a focused question, learn the errors the Church
          condemned, or weigh an objection — and move freely between them. Every
          citation is verbatim, public-domain, and sourced to the Fathers and
          the Councils.
        </p>
      </header>

      {/* Four modes — an editorial list, not cards. */}
      <nav className="mt-12 divide-y divide-paper/[0.08] border-y border-paper/[0.08]">
        {MODES.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group flex items-baseline justify-between gap-5 py-5 transition-colors hover:bg-paper/[0.02]"
          >
            <div>
              <p className="font-serif text-title-sm font-semibold text-paper leading-tight group-hover:text-gold transition-colors">
                {m.label}
              </p>
              <p className="mt-1.5 font-serif text-ui text-paper/65 leading-[1.6] max-w-[58ch]">
                {m.blurb}
              </p>
            </div>
            <span
              aria-hidden
              className="shrink-0 self-center font-sans text-ui text-paper/30 group-hover:text-gold transition-colors"
            >
              →
            </span>
          </Link>
        ))}
      </nav>

      {/* Shared search across all four modes. */}
      <div className="mt-12">
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/45 mb-3">
          Search the whole library
        </p>
        <TheologyFilter items={filterItems} />
      </div>

      {/* Featured + Recently added. */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-10">
        <Column label="Featured studies">
          {featured.map((s) => (
            <StudyRow key={s.href} study={s} />
          ))}
        </Column>
        <Column label="Recently added">
          {recent.map((s) => (
            <StudyRow key={s.href} study={s} showSection />
          ))}
        </Column>
      </div>

      {/* Doctrinal categories. */}
      <section className="mt-12 border-t border-paper/[0.08] pt-8">
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/45">
          Doctrinal categories
        </p>
        <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
          {THEOLOGY_GROUP_ORDER.map((g) => {
            const label = THEOLOGY_GROUP_LABEL[g];
            return (
              <li key={g}>
                <Link
                  href="/theology/doctrine"
                  className="group flex items-baseline justify-between gap-3 border-b border-paper/[0.06] py-2.5"
                >
                  <span className="font-serif text-ui text-paper/85 group-hover:text-paper">
                    {label.en}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Related councils. */}
      <ChipSection
        label="The Ecumenical Councils"
        seeAll={{ href: "/councils", text: "All councils" }}
      >
        {ecumenical.map((c) => (
          <Chip key={c.slug} href={`/councils/${c.slug}`} label={c.byname} />
        ))}
      </ChipSection>

      {/* Fathers cited across the studies. */}
      {fatherList.length > 0 ? (
        <ChipSection
          label="Fathers in these studies"
          seeAll={{ href: "/saints", text: "All saints" }}
        >
          {fatherList.map(([slug, name]) => (
            <Chip key={slug} href={`/saints/${slug}`} label={name} />
          ))}
        </ChipSection>
      ) : null}
    </TheologyShell>
  );
}

function Column({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/45 mb-3">
        {label}
      </p>
      <ul className="divide-y divide-paper/[0.06] border-t border-paper/[0.06]">
        {children}
      </ul>
    </section>
  );
}

function StudyRow({
  study,
  showSection = false,
}: {
  study: Study;
  showSection?: boolean;
}) {
  return (
    <li>
      <Link href={study.href} className="group block py-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-serif text-ui font-semibold text-paper leading-tight group-hover:text-gold transition-colors">
            {study.title}
          </span>
          {showSection ? (
            <span className="shrink-0 font-sans text-caption uppercase tracking-[1.2px] text-paper/40">
              {study.section}
            </span>
          ) : null}
        </div>
        {study.summary ? (
          <p className="mt-1 font-serif text-detail text-paper/60 leading-[1.5] line-clamp-2">
            {study.summary}
          </p>
        ) : null}
      </Link>
    </li>
  );
}

function ChipSection({
  label,
  seeAll,
  children,
}: {
  label: string;
  seeAll?: { href: string; text: string };
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12 border-t border-paper/[0.08] pt-8">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-paper/45">
          {label}
        </p>
        {seeAll ? (
          <Link
            href={seeAll.href}
            className="font-sans text-caption text-paper/50 hover:text-paper underline decoration-paper/25 underline-offset-4"
          >
            {seeAll.text}
          </Link>
        ) : null}
      </div>
      <ul className="mt-4 flex flex-wrap gap-2">{children}</ul>
    </section>
  );
}

function Chip({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="inline-flex rounded-full border border-paper/12 bg-paper/[0.03] px-3 py-1 font-sans text-detail text-paper/80 hover:border-gold/40 hover:text-paper transition-colors"
      >
        {label}
      </Link>
    </li>
  );
}
