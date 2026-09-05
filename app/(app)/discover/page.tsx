import Link from "next/link";
import { DiscoverMobile } from "@/components/mobile/DiscoverMobile";
import { FeaturedTodayDesktop } from "@/components/discover/FeaturedTodayDesktop";
import { Church } from "@/components/ui/icons/Church";
import { Cross } from "@/components/ui/icons/Cross";
import { HaloedHead } from "@/components/ui/icons/HaloedHead";
import { Hourglass } from "@/components/ui/icons/Hourglass";
import { Lampada } from "@/components/ui/icons/Lampada";
import { OrnamentHeadpiece } from "@/components/calendar/OrnamentHeadpiece";
import { COUNCILS } from "@/lib/councils/councils";
import { loadAllTopics } from "@/lib/topics/topics";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";
import { T } from "@/components/i18n/T";

export const metadata = {
  title: "Discover",
  description:
    "A way into the wider library: Orthodox history, the reading room, the whole theological study of the Faith, and the Councils.",
};

// No `revalidate`: getServerLocale() awaits cookies(), which already makes
// this page dynamic on the web, and under `output: "export"` ISR does not
// exist at all. Anything day-dependent here resolves on the device.

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

  const topics = await loadAllTopics();

  // Summaries only: the client picks the day's pair, so it needs the
  // candidates, not the whole corpus.
  const featuredTopics = topics.map((tp) => ({
    slug: tp.slug,
    title: tp.title,
    definition: tp.definition ?? "",
    citationCount: 0,
  }));
  const featuredCouncils = COUNCILS.map((c) => ({
    slug: c.slug,
    byname: c.byname,
    year: c.year,
    location: c.location,
  }));

  // The doctrinal study library — Doctrine, Topics, Heresies, Apologetics —
  // is one connected surface (/theology). It is shown here as a single hub
  // card whose modes are chips, not four competing tiles.
  const STUDY_MODES = [
    { label: "Doctrine", href: "/theology/doctrine" },
    { label: t(m, "discover.tile.topics"), href: "/topics" },
    { label: t(m, "discover.tile.heresies"), href: "/heresies" },
    { label: t(m, "discover.tile.apologetics"), href: "/apologetics" },
  ];

  return (
    <>
      <DiscoverMobile />
      <div className="hidden md:contents native-md-hidden">
        <section className="relative bg-night min-h-[calc(100dvh-72px)] md:px-8 md:py-16">
          {/* A quiet gold wash behind the masthead, the one bit of warmth on
              an otherwise monochrome page. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
            style={{
              background:
                "radial-gradient(60% 100% at 50% 0%, rgba(212,175,55,0.08) 0%, transparent 70%)",
            }}
          />
          <article className="relative mx-auto w-full max-w-[1120px] px-5 pt-6 pb-10 md:pt-0 md:pb-0">
            {/* Masthead */}
            <header className="mb-12 text-center md:mb-16">
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

            {/* Where to begin: the destinations that reward a visit, not a
                lookup. History wears the gold of a new wing of the library;
                the reading room keeps the lamp; the saints are the people the
                whole library is about, so they belong here and not buried in
                a study grid. */}
            <SectionHeading><T k="study.discover.whereToBegin" /></SectionHeading>
            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              <Link
                href="/history"
                className="group relative overflow-hidden rounded-xl border border-gold/25 p-7 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-gold/55"
                style={{
                  background:
                    "radial-gradient(120% 100% at 0% 0%, rgba(212,175,55,0.12) 0%, transparent 55%), #100f0c",
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-gold/[0.10] text-gold/90">
                    <Hourglass size={30} />
                  </span>
                  <span className="rounded-pill border border-gold/40 px-2.5 py-0.5 font-sans text-eyebrow font-semibold uppercase tracking-[1.4px] text-gold/90">
                    <T k="calendar.styleNew" />
                  </span>
                </div>
                <p className="mt-5 font-display-serif text-title md:text-heading text-paper leading-tight transition-colors group-hover:text-gold">
                  {t(m, "discover.tile.history")}
                </p>
                <p className="mt-2 max-w-[440px] font-serif italic text-ui text-paper/70 leading-[1.6]">
                  {t(m, "discover.tile.historyBlurb")}
                </p>
                <p className="mt-5 font-sans text-detail font-semibold text-gold/85">
                  <T k="study.exploreTheInteractiveTimeline" />
                </p>
              </Link>

              <Link
                href="/reading"
                className="group relative overflow-hidden rounded-xl border border-paper/12 bg-night-soft/60 p-7 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-paper/30"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-paper/[0.05] text-gold/90">
                  <Lampada size={30} />
                </span>
                <p className="mt-5 font-display-serif text-title md:text-heading text-paper leading-tight transition-colors group-hover:text-gold">
                  {t(m, "discover.tile.reading")}
                </p>
                <p className="mt-2 max-w-[440px] font-serif italic text-ui text-paper/70 leading-[1.6]">
                  {t(m, "discover.tile.readingBlurb")}
                </p>
                <p className="mt-5 font-sans text-detail font-semibold text-paper/70">
                  {t(m, "reading.enterReadingRoom")} →
                </p>
              </Link>

              <Link
                href="/saints"
                className="group relative overflow-hidden rounded-xl border border-paper/12 bg-night-soft/60 p-7 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-paper/30"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-paper/[0.05] text-gold/90">
                  <HaloedHead size={30} />
                </span>
                <p className="mt-5 font-display-serif text-title md:text-heading text-paper leading-tight transition-colors group-hover:text-gold">
                  {t(m, "discover.tile.saints")}
                </p>
                <p className="mt-2 max-w-[440px] font-serif italic text-ui text-paper/70 leading-[1.6]">
                  {t(m, "discover.tile.saintsBlurb")}
                </p>
                <p className="mt-5 font-sans text-detail font-semibold text-paper/70">
                  {t(m, "saints.eyebrow")} →
                </p>
              </Link>
            </div>

            {/* Study the faith: the doctrinal library as one hub card (its four
                modes as chips), with the Councils beside it. */}
            <div className="mt-14">
              <SectionHeading><T k="study.discover.studyTheFaith" /></SectionHeading>
              <div className="mt-5 grid gap-5 lg:grid-cols-3">
                <div
                  className="relative overflow-hidden rounded-xl border border-gold/25 p-7 lg:col-span-2"
                  style={{
                    background:
                      "radial-gradient(110% 120% at 100% 0%, rgba(212,175,55,0.10) 0%, transparent 55%), #0e0d0b",
                  }}
                >
                  <div className="flex items-start gap-4">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gold/[0.10] text-gold/90">
                      <Cross size={28} />
                    </span>
                    <div className="min-w-0">
                      <Link href="/theology" className="group inline-block">
                        <p className="font-display-serif text-title text-paper leading-tight transition-colors group-hover:text-gold">
                          {t(m, "discover.tile.theology")}
                        </p>
                      </Link>
                      <p className="mt-2 max-w-[520px] font-serif italic text-ui text-paper/70 leading-[1.6]">
                        <T k="study.doctrineTopicsTheHeresiesThe" />
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {STUDY_MODES.map((mode) => (
                      <Link
                        key={mode.href}
                        href={mode.href}
                        className="rounded-pill border border-paper/15 bg-paper/[0.03] px-4 py-1.5 font-sans text-detail font-medium text-paper/75 transition-colors hover:border-gold/45 hover:bg-gold/[0.08] hover:text-gold-pale"
                      >
                        {mode.label}
                      </Link>
                    ))}
                  </div>
                </div>

                <Link
                  href="/councils"
                  className="group flex flex-col rounded-xl border border-paper/10 bg-night-soft/40 p-7 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-gold/40"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-paper/[0.05] text-gold/80 transition-colors group-hover:text-gold">
                    <Church size={28} />
                  </span>
                  <p className="mt-5 font-display-serif text-title-sm text-paper leading-tight transition-colors group-hover:text-gold">
                    {t(m, "discover.tile.councils")}
                  </p>
                  <p className="mt-2 font-serif italic text-detail text-paper/65 leading-[1.55]">
                    {t(m, "discover.tile.councilsBlurb")}
                  </p>
                </Link>
              </div>
            </div>

            {/* Featured today: one topic and one council, rotating daily.
                Picked on the device, not here: this tree ships into the
                Android export, where a server component's answer to "what
                day is it" is frozen at build time. */}
            <FeaturedTodayDesktop
              topics={featuredTopics}
              councils={featuredCouncils}
              heading={<T k="study.discover.featuredToday" />}
            />

            {/* Quiet colophon to close the page. */}
            <p className="mt-16 text-center font-display-serif italic text-ui text-paper/55 leading-[1.55]">
              <T k="study.colophon1" />
              <br />
              <T k="study.colophon2" />
            </p>
          </article>
        </section>
      </div>
    </>
  );
}
