import Link from "next/link";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { DiscoverMobile } from "@/components/mobile/DiscoverMobile";
import { HaloedHead } from "@/components/ui/icons/HaloedHead";
import { Church } from "@/components/ui/icons/Church";
import { Book } from "@/components/ui/icons/Book";
import { Scroll } from "@/components/ui/icons/Scroll";
import { Calendar } from "@/components/ui/icons/Calendar";
import { Codex } from "@/components/ui/icons/Codex";
import { Lyre } from "@/components/ui/icons/Lyre";
import { Quill } from "@/components/ui/icons/Quill";
import { Cross } from "@/components/ui/icons/Cross";
import { Bolt } from "@/components/ui/icons/Bolt";
import { Lampada } from "@/components/ui/icons/Lampada";
import { OrnamentHeadpiece } from "@/components/calendar/OrnamentHeadpiece";
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

export default async function DiscoverPage() {
  const locale = await getServerLocale();
  const m = getMessages(locale);

  // Order chosen so the index reads like a menologion table of contents:
  // the people first (saints), then the doctrinal record together (the
  // councils, the topics they confessed, the heresies they condemned),
  // then the year, the daily readings, the Psalter, and the patristic
  // commentary that ties it all together.
  const ENTRIES: Entry[] = [
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
      Icon: Bolt,
    },
    {
      label: t(m, "discover.tile.reading"),
      href: "/reading",
      blurb: t(m, "discover.tile.readingBlurb"),
      Icon: Lampada,
    },
    {
      label: t(m, "discover.tile.saints"),
      href: "/saints",
      blurb: t(m, "discover.tile.saintsBlurb"),
      Icon: HaloedHead,
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
    {
      label: t(m, "discover.tile.calendar"),
      href: "/calendar",
      blurb: t(m, "discover.tile.calendarBlurb"),
      Icon: Calendar,
    },
    {
      label: t(m, "discover.tile.dailyReadings"),
      href: "/prayers/today",
      blurb: t(m, "discover.tile.dailyReadingsBlurb"),
      Icon: Codex,
    },
    {
      label: t(m, "discover.tile.psalter"),
      href: "/bible/psalms/1",
      blurb: t(m, "discover.tile.psalterBlurb"),
      Icon: Lyre,
    },
    {
      label: t(m, "discover.tile.patristic"),
      href: "/bible/john/1",
      blurb: t(m, "discover.tile.patristicBlurb"),
      Icon: Quill,
    },
  ];

  return (
    <>
      <DiscoverMobile />
      <div className="hidden md:contents">
      <MobileTopBar title={t(m, "discover.h1").replace(/\.$/, "")} />
      <section className="bg-night min-h-[calc(100dvh-72px)] md:px-8 md:py-16">
        <article className="mx-auto max-w-[820px] w-full px-5 pt-6 pb-10 md:pt-0 md:pb-0">
          <header className="text-center mb-8 md:mb-12">
            <OrnamentHeadpiece className="mx-auto mb-5 max-w-[400px]" />
            <p className="font-sans text-caption font-semibold uppercase tracking-[1.6px] text-gold/85 mb-3">
              {t(m, "discover.eyebrow")}
            </p>
            <h1 className="font-display-serif text-heading md:text-display text-paper leading-[1.05]">
              {t(m, "discover.h1")}
            </h1>
            <p className="mt-4 font-serif italic text-ui md:text-body text-paper/70 max-w-[520px] mx-auto leading-[1.65]">
              {t(m, "discover.subtitle")}
            </p>
          </header>

          {/* Index list, each entry reads as one printed line of a
              menologion table of contents: glyph on the left, name in
              display-serif, italic blurb. Thin gold hairline between
              entries. No tile chrome. */}
          <ul className="divide-y divide-gold/20 border-y border-gold/20">
            {ENTRIES.map(({ label, href, blurb, Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex items-start gap-5 py-5 md:py-6 px-1 hover:bg-gold/[0.04] transition-colors"
                >
                  <span className="shrink-0 inline-flex items-center justify-center h-9 w-9 text-gold/85 group-hover:text-gold transition-colors">
                    <Icon size={28} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display-serif text-lede md:text-title-sm text-paper leading-tight group-hover:text-gold transition-colors">
                      {label}
                    </p>
                    <p className="mt-1.5 font-serif italic text-detail md:text-ui text-paper/65 leading-[1.55]">
                      {blurb}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className="shrink-0 self-center font-serif text-lede text-paper/30 group-hover:text-gold transition-colors"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Quiet colophon to close the page. */}
          <p className="mt-10 text-center font-display-serif italic text-ui text-paper/45 leading-[1.55]">
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
