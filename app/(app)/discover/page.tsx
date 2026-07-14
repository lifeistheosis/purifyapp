import Link from "next/link";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { DiscoverMobile } from "@/components/mobile/DiscoverMobile";
import { Church } from "@/components/ui/icons/Church";
import { Book } from "@/components/ui/icons/Book";
import { Scroll } from "@/components/ui/icons/Scroll";
import { Codex } from "@/components/ui/icons/Codex";
import { Cross } from "@/components/ui/icons/Cross";
import { Hourglass } from "@/components/ui/icons/Hourglass";
import { Shield } from "@/components/ui/icons/Shield";
import { Lampada } from "@/components/ui/icons/Lampada";
import { OrnamentHeadpiece } from "@/components/calendar/OrnamentHeadpiece";
import { startOfDayUtc } from "@/lib/calendar/orthodox";
import { COUNCILS } from "@/lib/councils/councils";
import { loadAllTopics } from "@/lib/topics/topics";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";

export const metadata = {
  title: "Discover",
  description:
    "An index of the library: saints, councils, the calendar, daily readings, the Psalter, patristic commentary.",
};

export const revalidate = 3600;

type Entry = {
  label: string;
  href: string;
  blurb: string;
  Icon: typeof Codex;
};

function dayOfYearUtc(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86_400_000);
}

function firstSentence(s: string): string {
  if (!s) return "";
  const match = s.match(/^.+?[.!?](?:\s|$)/);
  return (match ? match[0] : s).trim();
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-gold/80">
      {children}
    </h2>
  );
}

export default async function DiscoverPage() {
  const locale = await getServerLocale();
  const m = getMessages(locale);

  const today = startOfDayUtc(new Date());

  const topics = await loadAllTopics();
  const featuredTopic = topics.length
    ? topics[dayOfYearUtc(today) % topics.length]
    : null;
  const featuredCouncil = COUNCILS.length
    ? COUNCILS[dayOfYearUtc(today) % COUNCILS.length]
    : null;

  // The library grid: everything not already surfaced by the featured row
  // or the Today strip. Order reads like a menologion table of contents.
  const LIBRARY: Entry[] = [
    {
      label: t(m, "discover.tile.theology"),
      href: "/theology",
      blurb: t(m, "discover.tile.theologyBlurb"),
      Icon: Cross,
    },
    {
      label: t(m, "discover.tile.apologetics"),
      href: "/apologetics",
      blurb: t(m, "discover.tile.apologeticsBlurb"),
      Icon: Shield,
    },
    {
      label: t(m, "discover.tile.councils"),
      href: "/councils",
      blurb: t(m, "discover.tile.councilsBlurb"),
      Icon: Church,
    },
    {
      label: t(m, "discover.tile.topics"),
      href: "/topics",
      blurb: t(m, "discover.tile.topicsBlurb"),
      Icon: Book,
    },
    {
      label: t(m, "discover.tile.heresies"),
      href: "/heresies",
      blurb: t(m, "discover.tile.heresiesBlurb"),
      Icon: Scroll,
    },
  ];

  return (
    <>
      <DiscoverMobile />
      <div className="hidden md:contents">
        <MobileTopBar title={t(m, "discover.h1").replace(/\.$/, "")} />
        <section className="bg-night min-h-[calc(100dvh-72px)] md:px-8 md:py-16">
          <article className="mx-auto w-full max-w-[1200px] px-5 pt-6 pb-10 md:pt-0 md:pb-0">
            {/* Masthead */}
            <header className="mb-10 text-center md:mb-14">
              <OrnamentHeadpiece className="mx-auto mb-5 max-w-[400px]" />
              <p className="mb-3 font-sans text-caption font-semibold uppercase tracking-[1.6px] text-gold/85">
                {t(m, "discover.eyebrow")}
              </p>
              <h1 className="font-display-serif text-heading md:text-display text-paper leading-[1.05]">
                {t(m, "discover.h1")}
              </h1>
              <p className="mx-auto mt-4 max-w-[520px] font-serif italic text-ui md:text-body text-paper/70 leading-[1.65]">
                {t(m, "discover.subtitle")}
              </p>
            </header>

            {/* Featured: the two destinations that reward a visit, not a
                lookup. History wears the quiet gold of a new wing of the
                library; Reading keeps the lamp. */}
            <div className="grid gap-5 lg:grid-cols-2">
              <Link
                href="/history"
                className="group relative overflow-hidden rounded-lg border border-gold/25 bg-gold/[0.05] px-7 py-7 transition-colors hover:border-gold/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex h-10 w-10 items-center justify-center text-gold/90">
                    <Hourglass size={32} />
                  </span>
                  <span className="rounded-pill border border-gold/40 px-2.5 py-0.5 font-sans text-eyebrow font-semibold uppercase tracking-[1.4px] text-gold/90">
                    New
                  </span>
                </div>
                <p className="mt-4 font-display-serif text-title md:text-heading text-paper leading-tight transition-colors group-hover:text-gold">
                  {t(m, "discover.tile.history")}
                </p>
                <p className="mt-2 max-w-[440px] font-serif italic text-ui text-paper/70 leading-[1.6]">
                  {t(m, "discover.tile.historyBlurb")}
                </p>
                <p className="mt-4 font-sans text-detail font-semibold text-gold/85">
                  Explore the interactive timeline →
                </p>
              </Link>

              <Link
                href="/reading"
                className="group rounded-lg border border-paper/12 bg-night-soft/60 px-7 py-7 transition-colors hover:border-paper/30"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center text-gold/90">
                  <Lampada size={32} />
                </span>
                <p className="mt-4 font-display-serif text-title md:text-heading text-paper leading-tight transition-colors group-hover:text-gold">
                  {t(m, "discover.tile.reading")}
                </p>
                <p className="mt-2 max-w-[440px] font-serif italic text-ui text-paper/70 leading-[1.6]">
                  {t(m, "discover.tile.readingBlurb")}
                </p>
                <p className="mt-4 font-sans text-detail font-semibold text-paper/70">
                  {t(m, "reading.enterReadingRoom")} →
                </p>
              </Link>
            </div>

            {/* The library */}
            <div className="mt-14">
              <SectionHeading>The library</SectionHeading>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {LIBRARY.map(({ label, href, blurb, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group rounded-lg border border-paper/10 bg-night-soft/40 px-5 py-5 transition-colors hover:border-gold/40"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center text-gold/80 transition-colors group-hover:text-gold">
                      <Icon size={24} />
                    </span>
                    <p className="mt-3 font-display-serif text-lede text-paper leading-tight transition-colors group-hover:text-gold">
                      {label}
                    </p>
                    <p className="mt-1.5 font-serif italic text-detail text-paper/60 leading-[1.55]">
                      {blurb}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Featured today: one topic and one council, rotating daily. */}
            {featuredTopic || featuredCouncil ? (
              <div className="mt-14">
                <SectionHeading>Featured today</SectionHeading>
                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  {featuredTopic ? (
                    <Link
                      href={`/topics/${featuredTopic.slug}`}
                      className="group rounded-lg border border-paper/12 bg-paper/[0.03] px-6 py-5 transition-colors hover:border-paper/30"
                    >
                      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.6px] text-paper/55">
                        {t(m, "discover.tile.topics")}
                      </p>
                      <p className="mt-2 font-display-serif text-title-sm text-paper leading-snug transition-colors group-hover:text-gold">
                        {featuredTopic.title}
                      </p>
                      {featuredTopic.definition ? (
                        <p className="mt-1.5 font-serif italic text-detail text-paper/65 leading-[1.55] line-clamp-2">
                          {firstSentence(featuredTopic.definition)}
                        </p>
                      ) : null}
                    </Link>
                  ) : null}
                  {featuredCouncil ? (
                    <Link
                      href={`/councils/${featuredCouncil.slug}`}
                      className="group rounded-lg border border-paper/12 bg-paper/[0.03] px-6 py-5 transition-colors hover:border-paper/30"
                    >
                      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.6px] text-paper/55">
                        {t(m, "discover.tile.councils")}
                      </p>
                      <p className="mt-2 font-display-serif text-title-sm text-paper leading-snug transition-colors group-hover:text-gold">
                        {featuredCouncil.byname}
                      </p>
                      <p className="mt-1.5 font-serif italic text-detail text-paper/65 leading-[1.55]">
                        {featuredCouncil.year} · {featuredCouncil.location}
                      </p>
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Quiet colophon to close the page. */}
            <p className="mt-16 text-center font-display-serif italic text-ui text-paper/55 leading-[1.55]">
              Through the prayers of our holy Fathers,
              <br />
              Lord Jesus Christ our God, have mercy on us.
            </p>
          </article>
        </section>
      </div>
    </>
  );
}
