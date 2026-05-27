import Link from "next/link";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { Cross } from "@/components/ui/icons/Cross";
import { Book } from "@/components/ui/icons/Book";
import { Halo } from "@/components/ui/icons/Halo";
import { Lampada } from "@/components/ui/icons/Lampada";
import { Wheat } from "@/components/ui/icons/Wheat";
import { Grapes } from "@/components/ui/icons/Grapes";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";

export const metadata = {
  title: "Discover",
  description:
    "The whole library at a glance: saints, councils, the calendar, daily readings, the Psalter, patristic commentary.",
};

export const revalidate = 3600;

type Tile = {
  label: string;
  href: string;
  blurb: string;
  Icon: typeof Cross;
  /** Color of the icon glyph. */
  tint: string;
  /**
   * Background tint for the whole tile, ~8% opacity over the dark
   * surface. Hallow's Discover uses real per-category color blocks;
   * this brings that energy without breaking the dark register.
   */
  bg: string;
  border: string;
};

export default async function DiscoverPage() {
  const locale = await getServerLocale();
  const m = getMessages(locale);

  const TILES: Tile[] = [
    {
      label: t(m, "discover.tile.saints"),
      href: "/saints",
      blurb: t(m, "discover.tile.saintsBlurb"),
      Icon: Halo,
      tint: "text-gold",
      bg: "bg-gold/[0.08]",
      border: "border-gold/30",
    },
    {
      label: t(m, "discover.tile.councils"),
      href: "/councils",
      blurb: t(m, "discover.tile.councilsBlurb"),
      Icon: Cross,
      tint: "text-[#f4dc91]",
      bg: "bg-[var(--color-grad-violet)]/[0.18]",
      border: "border-[var(--color-grad-violet)]/40",
    },
    {
      label: t(m, "discover.tile.calendar"),
      href: "/calendar",
      blurb: t(m, "discover.tile.calendarBlurb"),
      Icon: Lampada,
      tint: "text-[#bfd6cc]",
      bg: "bg-[var(--color-grad-teal)]/[0.14]",
      border: "border-[var(--color-grad-teal)]/35",
    },
    {
      label: t(m, "discover.tile.dailyReadings"),
      href: "/prayers/today",
      blurb: t(m, "discover.tile.dailyReadingsBlurb"),
      Icon: Book,
      tint: "text-paper/85",
      bg: "bg-paper/[0.05]",
      border: "border-paper/15",
    },
    {
      label: t(m, "discover.tile.psalter"),
      href: "/bible/psalms/1",
      blurb: t(m, "discover.tile.psalterBlurb"),
      Icon: Wheat,
      tint: "text-gold",
      bg: "bg-gold/[0.06]",
      border: "border-gold/25",
    },
    {
      label: t(m, "discover.tile.patristic"),
      href: "/bible/john/1",
      blurb: t(m, "discover.tile.patristicBlurb"),
      Icon: Grapes,
      tint: "text-[#e3a7a7]",
      bg: "bg-[var(--color-accent)]/[0.10]",
      border: "border-[var(--color-accent)]/30",
    },
  ];

  return (
    <>
      <MobileTopBar title={t(m, "discover.h1").replace(/\.$/, "")} />
      <section className="bg-night min-h-[calc(100dvh-72px)] md:px-8 md:py-16">
        <article className="mx-auto max-w-[1080px] w-full px-5 pt-6 pb-10 md:pt-0 md:pb-0">
          <header className="mb-6 hidden md:block">
            <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
              {t(m, "discover.eyebrow")}
            </p>
            <h1 className="font-sans text-[36px] md:text-[48px] font-bold text-paper leading-[1.05] tracking-[-0.025em]">
              {t(m, "discover.h1")}
            </h1>
            <p className="mt-4 font-serif text-[17px] text-paper/80 max-w-[640px] leading-[1.65]">
              {t(m, "discover.subtitle")}
            </p>
          </header>

          <p className="md:hidden mt-1 mb-5 font-sans text-[13px] text-paper/65">
            {t(m, "discover.mobileSubtitle")}
          </p>

          <ul className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TILES.map(({ label, href, blurb, Icon, tint, bg, border }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={`group block h-full rounded-2xl border transition-colors p-4 md:p-5 hover:brightness-125 ${bg} ${border}`}
                >
                  <div
                    className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-night/40 ${tint}`}
                  >
                    <Icon size={20} />
                  </div>
                  <p className="font-sans text-[15px] font-semibold text-paper leading-tight">
                    {label}
                  </p>
                  <p className="mt-1.5 font-sans text-[12.5px] text-paper/70 leading-[1.55]">
                    {blurb}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </>
  );
}
