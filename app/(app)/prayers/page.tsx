import Link from "next/link";
import { T } from "@/components/i18n/T";
import { LESSONS } from "@/lib/prayers/learning";
import { PrayerIcon } from "@/components/prayers/PrayerIcon";
import { PrayersMobile } from "@/components/mobile/PrayersMobile";
import { PrayersDayCard } from "@/components/prayers/PrayersDayCard";
import { PrayerNote } from "@/components/prayers/PrayerBook";
import { PrayerSearch } from "@/components/prayers/PrayerSearch";
import { PrayNow } from "@/components/prayers/PrayNow";
import { PrayerBookIndex } from "@/components/prayers/PrayerBookIndex";
import { CARD, CARD_BG, CTA, Eyebrow, ICON_TILE, PILL } from "@/components/ui/Graphite";
import { cn } from "@/lib/cn";
import { Calendar } from "@/components/ui/icons/Calendar";
import { Hands } from "@/components/ui/icons/Hands";
import { Lampada } from "@/components/ui/icons/Lampada";
import { Lyre } from "@/components/ui/icons/Lyre";
import { Orans } from "@/components/ui/icons/Orans";
import { PrayerRope } from "@/components/ui/icons/PrayerRope";

export const metadata = {
  title: "Prayer",
  description:
    "Daily prayer in the Orthodox tradition: today's rule, morning and evening rules, the prayer of the heart, akathists, the liturgical hours, and a beginner's path.",
};

// No `revalidate`: the catalog read makes this page dynamic on the web, and
// under `output: "export"` ISR does not exist. Everything day-dependent
// resolves on the device (Pray now, the day card).

/*
 * Redesigned 2026-09-26 at the owner's request, in the language Discover
 * was given the same day: a left-aligned hero with quick pills and the day
 * beside it, then sections led by a small eyebrow and drawn as the front
 * page's graphite cards.
 *
 *   Pray now       one row of four: the prayer to continue, then what fits
 *                  the hour, the season and the fast. It replaces the two
 *                  side-by-side rails whose left column stood empty.
 *   The heart      the Jesus Prayer beside the Prayer Rope Anthem.
 *   Practices      six surfaces with their own screens, an even grid.
 *   The book       every rule by category, with the planned ones named in
 *                  one line at each category's foot instead of greyed rows.
 *
 * Every link and every piece of content from before is still here.
 */

const QUICK = [
  { href: "/prayers/morning", k: "prayers.rule.morning.title" },
  { href: "/prayers/evening", k: "prayers.rule.evening.title" },
  { href: "/prayers/hours", k: "prayers.hours" },
  { href: "/prayers/rope", k: "prayers.also.ropeTitle" },
  { href: "/prayers/akathists", k: "prayers.akathists" },
  { href: "/prayers/learning", k: "ui.learnToPray" },
] as const;

export default function PrayersPage() {
  const practices = [
    { href: "/prayers/today", icon: <Calendar size={24} />, title: <T k="prayers.tabs.today" />, body: <T k="prayers.also.todayDesc" /> },
    { href: "/prayers/hours", icon: <Lampada size={26} />, title: <T k="prayers.hours" />, body: <T k="prayers.also.hoursDesc" /> },
    { href: "/prayers/akathists", icon: <Lyre size={26} />, title: <T k="prayers.also.akathistsTitle" />, body: <T k="prayers.also.akathistsDesc" /> },
    { href: "/prayers/rope", icon: <PrayerRope size={26} />, title: <T k="prayers.also.ropeTitle" />, body: <T k="prayers.also.ropeDesc" /> },
    {
      href: "/prayers/learning",
      icon: <Orans size={26} />,
      title: <T k="ui.learnToPray" />,
      body: <T k="prayers.also.learningDesc" />,
      meta: <T k="prayers.lessonCount" count={LESSONS.length} />,
    },
    { href: "/prayers/personal", icon: <Hands size={26} />, title: <T k="prayers.tabs.personal" />, body: <T k="ui.yourOwnRule" /> },
  ];

  return (
    <>
      <PrayersMobile />
      <div className="hidden md:block native-md-hidden">
        <section className="relative overflow-hidden bg-night min-h-[calc(100dvh-72px)] md:px-8 md:py-16">
          {/* The front page hero's candle glow, in white, behind the heading. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[560px]"
            style={{
              background: "radial-gradient(ellipse 70% 60% at 20% 10%, rgba(255,255,255,0.05) 0%, transparent 65%)",
            }}
          />
          <article className="relative mx-auto w-full max-w-[1240px] px-5 pt-6 pb-10 md:pt-6 md:pb-0">
            {/* Hero: the section's words and its quick ways in, the day beside them. */}
            <header className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
              <div className="min-w-0">
                <Eyebrow>
                  <T k="footer.prayer" />
                </Eyebrow>
                <h1 className="mt-4 text-heading font-bold leading-[1.05] tracking-[-0.025em] text-paper md:text-display-sm lg:text-display">
                  <T k="ui.prayWithoutCeasing" />
                </h1>
                <p className="mt-3 font-serif italic text-detail text-paper/55">
                  <T k="ui.1Thessalonians517" />
                </p>
                <p className="mt-5 max-w-[560px] font-sans text-ui leading-[1.6] text-paper/75 md:text-lede">
                  <T k="prayers.index.intro" />
                </p>
                <nav aria-label="Prayers" className="mt-8 flex flex-wrap gap-2">
                  {QUICK.map((q) => (
                    <Link key={q.href} href={q.href} className={cn(PILL, "px-4 text-detail")}>
                      <T k={q.k} />
                    </Link>
                  ))}
                </nav>
              </div>
              <PrayersDayCard />
            </header>

            {/* Pray now: one full row, always four. */}
            <section className="mt-16">
              <Eyebrow level={2}>
                <T k="today.prayNow.eyebrow" />
              </Eyebrow>
              <div className="mt-5">
                <PrayNow variant="desktop" />
              </div>
            </section>

            {/* The prayer of the heart, and the hymn for the rope beside it. */}
            <section className="mt-16">
              <Eyebrow level={2}>
                <T k="prayers.heart.eyebrow" />
              </Eyebrow>
              <div className="mt-5 grid gap-5 lg:grid-cols-3">
                <div className={cn(CARD, "lg:col-span-2 hover:translate-y-0 md:p-10")} style={CARD_BG}>
                  <div className="flex items-start gap-6">
                    <PrayerIcon slug="christ-pantocrator" size="md" />
                    <div className="min-w-0">
                      <p className="font-heading text-title-sm font-bold leading-[1.35] text-paper md:text-title">
                        <T k="prayers.heart.line1" />
                        <br />
                        <T k="prayers.heart.line2" />
                        <br />
                        <T k="prayers.heart.line3" />
                      </p>
                      <p className="mt-4 max-w-[52ch] font-sans text-ui leading-[1.6] text-paper/65">
                        <T k="prayers.heart.note" />
                      </p>
                    </div>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2.5 pt-8">
                    <Link href="/prayers/learning/jesus-prayer" className={PILL}>
                      <T k="ui.learnHowToPrayIt" />
                    </Link>
                    <Link href="/prayers/rope" className={PILL}>
                      <T k="prayers.also.ropeTitle" />
                    </Link>
                  </div>
                </div>

                <Link href="/prayers/anthem" className={CARD} style={CARD_BG}>
                  <span
                    aria-hidden
                    className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-paper/[0.08] text-paper ring-1 ring-inset ring-paper/15 transition-transform duration-200 group-hover:scale-[1.04] motion-reduce:transition-none"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="translate-x-[1px]">
                      <path d="M7 5.5v13l11-6.5L7 5.5z" />
                    </svg>
                  </span>
                  {/* The words sit at the card's foot, the play button at
                      its head, however tall the heart card beside it makes it. */}
                  <p className="mt-auto pt-8 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55">
                    <T k="prayers.anthem.bandKicker" />
                  </p>
                  <h3 className="mt-2 text-title-sm font-bold leading-tight text-paper">
                    <T k="today.prayNow.anthemTitle" />
                  </h3>
                  <p className="mt-2 font-sans text-detail leading-[1.55] text-paper/65">
                    <T k="prayers.anthem.bandBody" />
                  </p>
                </Link>
              </div>
            </section>

            {/* Practices: the surfaces with a screen of their own. */}
            <section className="mt-16">
              <Eyebrow level={2}>
                <T k="ui.practices" />
              </Eyebrow>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {practices.map((p) => (
                  <Link key={p.href} href={p.href} className={CARD} style={CARD_BG}>
                    <div className="flex items-start justify-between gap-4">
                      <span className={ICON_TILE}>{p.icon}</span>
                      {p.meta ? (
                        <span className="font-sans text-caption tabular-nums text-paper/55">{p.meta}</span>
                      ) : null}
                    </div>
                    <h3 className="mt-5 text-lede font-bold leading-tight text-paper md:text-title-sm">{p.title}</h3>
                    <p className="mt-2 font-sans text-detail leading-[1.55] text-paper/65">{p.body}</p>
                    <p className={cn(CTA, "mt-auto pt-5")}>
                      <span aria-hidden>→</span>
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            {/* The prayer book: search it, or read it by category. */}
            <section className="mt-16">
              <Eyebrow level={2}>
                <T k="prayers.bookTitle" />
              </Eyebrow>
              <div className="mt-5">
                <PrayerSearch>
                  <PrayerBookIndex variant="desktop" />
                </PrayerSearch>
              </div>
            </section>

            <PrayerNote>
              <T k="prayers.deviceNote" />{" "}
              <Link href="/account" className="text-paper/55 underline decoration-paper/25 underline-offset-2 hover:text-paper">
                <T k="prayers.yourAccountLink" />
              </Link>
            </PrayerNote>
          </article>
        </section>
      </div>
    </>
  );
}
