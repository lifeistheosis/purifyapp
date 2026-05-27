import Link from "next/link";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { Cross } from "@/components/ui/icons/Cross";
import { Codex } from "@/components/ui/icons/Codex";
import { Halo } from "@/components/ui/icons/Halo";
import { Lampada } from "@/components/ui/icons/Lampada";
import { Wheat } from "@/components/ui/icons/Wheat";
import { Grapes } from "@/components/ui/icons/Grapes";
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
  Icon: typeof Cross;
};

export default async function DiscoverPage() {
  const locale = await getServerLocale();
  const m = getMessages(locale);

  // Order chosen so the index reads like a menologion table of contents:
  // the people first (saints, councils), then the year, then the daily
  // readings, then the Psalter, then the patristic commentary that
  // ties it all together.
  const ENTRIES: Entry[] = [
    {
      label: t(m, "discover.tile.saints"),
      href: "/saints",
      blurb: t(m, "discover.tile.saintsBlurb"),
      Icon: Halo,
    },
    {
      label: t(m, "discover.tile.councils"),
      href: "/councils",
      blurb: t(m, "discover.tile.councilsBlurb"),
      Icon: Cross,
    },
    {
      label: t(m, "discover.tile.calendar"),
      href: "/calendar",
      blurb: t(m, "discover.tile.calendarBlurb"),
      Icon: Lampada,
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
      Icon: Wheat,
    },
    {
      label: t(m, "discover.tile.patristic"),
      href: "/bible/john/1",
      blurb: t(m, "discover.tile.patristicBlurb"),
      Icon: Grapes,
    },
  ];

  return (
    <>
      <MobileTopBar title={t(m, "discover.h1").replace(/\.$/, "")} />
      <section className="bg-night min-h-[calc(100dvh-72px)] md:px-8 md:py-16">
        <article className="mx-auto max-w-[820px] w-full px-5 pt-6 pb-10 md:pt-0 md:pb-0">
          <header className="text-center mb-8 md:mb-12">
            <OrnamentHeadpiece className="mx-auto mb-5 max-w-[400px]" />
            <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.6px] text-gold/85 mb-3">
              {t(m, "discover.eyebrow")}
            </p>
            <h1 className="font-display-serif text-[34px] md:text-[44px] text-paper leading-[1.05]">
              {t(m, "discover.h1")}
            </h1>
            <p className="mt-4 font-serif italic text-[15px] md:text-[16px] text-paper/70 max-w-[520px] mx-auto leading-[1.65]">
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
                    <p className="font-display-serif text-[20px] md:text-[22px] text-paper leading-tight group-hover:text-gold transition-colors">
                      {label}
                    </p>
                    <p className="mt-1.5 font-serif italic text-[13.5px] md:text-[14px] text-paper/65 leading-[1.55]">
                      {blurb}
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className="shrink-0 self-center font-serif text-[18px] text-paper/30 group-hover:text-gold transition-colors"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Quiet colophon to close the page. */}
          <p className="mt-10 text-center font-display-serif italic text-[14px] text-paper/45 leading-[1.55]">
            Through the prayers of our holy Fathers,
            <br />
            Lord Jesus Christ our God, have mercy on us.
          </p>
        </article>
      </section>
    </>
  );
}
