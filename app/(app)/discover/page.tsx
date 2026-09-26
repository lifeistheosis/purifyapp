import Link from "next/link";
import { DiscoverMobile } from "@/components/mobile/DiscoverMobile";
import { FeaturedTodayDesktop } from "@/components/discover/FeaturedTodayDesktop";
import { Calendar } from "@/components/ui/icons/Calendar";
import { Church } from "@/components/ui/icons/Church";
import { Cross } from "@/components/ui/icons/Cross";
import { HaloedHead } from "@/components/ui/icons/HaloedHead";
import { Hourglass } from "@/components/ui/icons/Hourglass";
import { Lampada } from "@/components/ui/icons/Lampada";
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

/*
 * Redone 2026-09-26 at the owner's request, in the front page's language:
 * Lora Bold headings (every h1 to h6, from the sitewide rule in globals.css),
 * DM Sans for everything that is read rather than named, left-aligned
 * sections led by a small uppercase eyebrow, graphite cards drawn exactly like
 * the front page's "Paths to walk" (lm-card turns them to paper on Light), and
 * pills for the quick ways in. The centred masthead with its ornament and the
 * gold-washed cards in DM Serif Display are gone; the content and every link
 * are the same.
 */

/** The front page's small uppercase section eyebrow. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/60">{children}</p>
  );
}

/** The front page's graphite card ("Paths to walk"), in one place. */
const CARD =
  "lm-card group relative flex flex-col overflow-hidden rounded-[28px] p-7 ring-1 ring-inset ring-paper/10 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.5)] transition-transform duration-200 hover:-translate-y-0.5 md:p-8";
const CARD_BG = {
  background:
    "radial-gradient(115% 90% at 88% 8%, rgba(255,255,255,0.06) 0%, transparent 55%), linear-gradient(155deg, #26262b 0%, #1a1a1d 60%, #151518 100%)",
};
const ICON_TILE =
  "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-paper/[0.07] text-paper/85 ring-1 ring-inset ring-paper/10";
const CTA = "mt-6 font-sans text-detail font-medium text-paper/75 transition-colors group-hover:text-paper";

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

  // The doctrinal study library (Doctrine, Topics, Heresies, Apologetics) is
  // one connected surface (/theology). It is shown as a single hub card whose
  // modes are pills, not four competing tiles.
  const STUDY_MODES = [
    { label: t(m, "study.doctrine"), href: "/theology/doctrine" },
    { label: t(m, "discover.tile.topics"), href: "/topics" },
    { label: t(m, "discover.tile.heresies"), href: "/heresies" },
    { label: t(m, "discover.tile.apologetics"), href: "/apologetics" },
  ];

  // Every door in the library, as the front page's pills.
  const QUICK = [
    { label: t(m, "discover.tile.saints"), href: "/saints" },
    { label: t(m, "discover.tile.councils"), href: "/councils" },
    { label: t(m, "discover.tile.theology"), href: "/theology" },
    { label: t(m, "discover.tile.history"), href: "/history" },
    { label: t(m, "discover.tile.reading"), href: "/reading" },
    { label: t(m, "discover.tile.calendar"), href: "/calendar" },
  ];

  return (
    <>
      <DiscoverMobile />
      <div className="hidden md:contents native-md-hidden">
        <section className="relative overflow-hidden bg-night min-h-[calc(100dvh-72px)] md:px-8 md:py-16">
          {/* The front page hero's candle glow, in white, behind the heading. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[560px]"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 20% 10%, rgba(255,255,255,0.05) 0%, transparent 65%)",
            }}
          />
          <article className="relative mx-auto w-full max-w-[1240px] px-5 pt-6 pb-10 md:pt-6 md:pb-0">
            {/* Hero */}
            <header className="max-w-[780px]">
              <Eyebrow>{t(m, "discover.eyebrow")}</Eyebrow>
              <h1 className="mt-4 text-heading font-bold leading-[1.05] tracking-[-0.025em] text-paper md:text-display-sm lg:text-display">
                {t(m, "discover.h1")}
              </h1>
              <p className="mt-6 max-w-[560px] font-sans text-ui leading-[1.6] text-paper/75 md:text-lede">
                {t(m, "discover.subtitle")}
              </p>
              <nav aria-label={t(m, "discover.eyebrow")} className="mt-8 flex flex-wrap gap-2.5">
                {QUICK.map((q) => (
                  <Link
                    key={q.href}
                    href={q.href}
                    className="rounded-pill border border-paper/15 bg-paper/[0.04] px-5 py-2.5 font-sans text-ui font-medium text-paper transition-colors duration-150 hover:border-paper/30 hover:bg-paper/10"
                  >
                    {q.label}
                  </Link>
                ))}
              </nav>
            </header>

            {/* Where to begin: History as the large card (it is the newest
                wing of the library), the reading room and the saints beside
                it. The saints are the people the whole library is about, so
                they belong here and not in a study grid. */}
            <section className="mt-20">
              <Eyebrow>
                <T k="study.discover.whereToBegin" />
              </Eyebrow>
              <div className="mt-5 grid gap-5 lg:grid-cols-3 lg:grid-rows-2">
                <Link href="/history" className={`${CARD} lg:col-span-2 lg:row-span-2 md:p-10`} style={CARD_BG}>
                  <div className="flex items-start justify-between gap-4">
                    <span className={ICON_TILE}>
                      <Hourglass size={30} />
                    </span>
                    <span className="rounded-pill bg-premium px-2.5 py-0.5 font-sans text-eyebrow font-semibold uppercase tracking-[1.4px] text-night">
                      <T k="calendar.styleNew" />
                    </span>
                  </div>
                  <div className="mt-10 lg:mt-auto">
                    <h2 className="text-title font-bold leading-[1.08] tracking-[-0.02em] text-paper md:text-display-sm">
                      {t(m, "discover.tile.history")}
                    </h2>
                    <p className="mt-4 max-w-[520px] font-sans text-ui leading-[1.6] text-paper/70 md:text-lede">
                      {t(m, "discover.tile.historyBlurb")}
                    </p>
                    <p className={CTA}>
                      <T k="study.exploreTheInteractiveTimeline" />
                    </p>
                  </div>
                </Link>

                <Link href="/reading" className={CARD} style={CARD_BG}>
                  <span className={ICON_TILE}>
                    <Lampada size={28} />
                  </span>
                  <h2 className="mt-5 text-lede font-bold leading-tight text-paper md:text-title-sm">
                    {t(m, "discover.tile.reading")}
                  </h2>
                  <p className="mt-2 font-sans text-ui leading-[1.55] text-paper/65">
                    {t(m, "discover.tile.readingBlurb")}
                  </p>
                  <p className={CTA}>{t(m, "reading.enterReadingRoom")} →</p>
                </Link>

                <Link href="/saints" className={CARD} style={CARD_BG}>
                  <span className={ICON_TILE}>
                    <HaloedHead size={28} />
                  </span>
                  <h2 className="mt-5 text-lede font-bold leading-tight text-paper md:text-title-sm">
                    {t(m, "discover.tile.saints")}
                  </h2>
                  <p className="mt-2 font-sans text-ui leading-[1.55] text-paper/65">
                    {t(m, "discover.tile.saintsBlurb")}
                  </p>
                  <p className={CTA}>{t(m, "saints.eyebrow")} →</p>
                </Link>
              </div>
            </section>

            {/* Study the faith: the doctrinal library as one hub card with
                its four modes as pills, the Councils and the Calendar beside
                it. */}
            <section className="mt-16">
              <Eyebrow>
                <T k="study.discover.studyTheFaith" />
              </Eyebrow>
              <div className="mt-5 grid gap-5 lg:grid-cols-3">
                <div className={`${CARD} lg:col-span-2 hover:translate-y-0`} style={CARD_BG}>
                  <div className="flex items-start gap-5">
                    <span className={ICON_TILE}>
                      <Cross size={26} />
                    </span>
                    <div className="min-w-0">
                      <Link href="/theology" className="inline-block">
                        <h2 className="text-lede font-bold leading-tight text-paper transition-colors hover:text-paper/80 md:text-title">
                          {t(m, "discover.tile.theology")}
                        </h2>
                      </Link>
                      <p className="mt-2 max-w-[560px] font-sans text-ui leading-[1.6] text-paper/70">
                        <T k="study.doctrineTopicsTheHeresiesThe" />
                      </p>
                    </div>
                  </div>
                  {/* Anchored to the foot, as the History card's text is: the
                      card stretches to the height of the two beside it. */}
                  <div className="mt-auto flex flex-wrap gap-2.5 pt-8">
                    {STUDY_MODES.map((mode) => (
                      <Link
                        key={mode.href}
                        href={mode.href}
                        className="rounded-pill border border-paper/15 bg-paper/[0.04] px-5 py-2.5 font-sans text-ui font-medium text-paper transition-colors hover:border-paper/30 hover:bg-paper/10"
                      >
                        {mode.label}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="grid gap-5">
                  <Link href="/councils" className={CARD} style={CARD_BG}>
                    <span className={ICON_TILE}>
                      <Church size={26} />
                    </span>
                    <h2 className="mt-5 text-lede font-bold leading-tight text-paper">
                      {t(m, "discover.tile.councils")}
                    </h2>
                    <p className="mt-2 font-sans text-detail leading-[1.55] text-paper/65">
                      {t(m, "discover.tile.councilsBlurb")}
                    </p>
                  </Link>
                  <Link href="/calendar" className={CARD} style={CARD_BG}>
                    <span className={ICON_TILE}>
                      <Calendar size={24} />
                    </span>
                    <h2 className="mt-5 text-lede font-bold leading-tight text-paper">
                      {t(m, "discover.tile.calendar")}
                    </h2>
                    <p className="mt-2 font-sans text-detail leading-[1.55] text-paper/65">
                      {t(m, "discover.tile.calendarBlurb")}
                    </p>
                  </Link>
                </div>
              </div>
            </section>

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
            <p className="mt-20 text-center font-serif italic text-ui leading-[1.55] text-paper/55">
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
