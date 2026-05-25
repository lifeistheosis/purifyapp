import Link from "next/link";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { Cross } from "@/components/ui/icons/Cross";
import { Book } from "@/components/ui/icons/Book";
import { Halo } from "@/components/ui/icons/Halo";
import { Lampada } from "@/components/ui/icons/Lampada";
import { Wheat } from "@/components/ui/icons/Wheat";
import { Fish } from "@/components/ui/icons/Fish";
import { Grapes } from "@/components/ui/icons/Grapes";
import { Compass } from "@/components/ui/icons/Compass";

export const metadata = {
  title: "Discover",
  description:
    "The whole library at a glance: saints, councils, calendar, fasts, daily readings, patristic commentary, Pascha.",
};

export const revalidate = 3600;

type Tile = {
  label: string;
  href: string;
  blurb: string;
  Icon: typeof Cross;
  /** Hex color or tailwind text-* token rendered on the small icon halo. */
  tint: string;
};

const TILES: Tile[] = [
  {
    label: "Saints",
    href: "/saints",
    blurb: "Fifty-plus profiles, with their works to read in full.",
    Icon: Halo,
    tint: "text-gold",
  },
  {
    label: "Councils",
    href: "/councils",
    blurb: "The first four Ecumenical Councils, in their own words.",
    Icon: Cross,
    tint: "text-[#f4dc91]",
  },
  {
    label: "Calendar",
    href: "/calendar",
    blurb: "Every day of the Church's year, New and Old style.",
    Icon: Lampada,
    tint: "text-[#bfd6cc]",
  },
  {
    label: "Fasts",
    href: "/calendar#fasts",
    blurb: "Today's fast at a glance, and the whole liturgical year.",
    Icon: Fish,
    tint: "text-[#bfd6cc]",
  },
  {
    label: "Daily readings",
    href: "/prayers/today",
    blurb: "The appointed Epistle and Gospel for today.",
    Icon: Book,
    tint: "text-paper/85",
  },
  {
    label: "The Psalter",
    href: "/bible/psalms/1",
    blurb: "The hundred fifty psalms, in the Septuagint numbering.",
    Icon: Wheat,
    tint: "text-gold",
  },
  {
    label: "Patristic commentary",
    href: "/bible/john/1",
    blurb: "St. John Chrysostom verse by verse, beside the Gospel.",
    Icon: Grapes,
    tint: "text-[#e3a7a7]",
  },
  {
    label: "Pascha",
    href: "/calendar#pascha",
    blurb: "The Great Feast, and the count to it from today.",
    Icon: Compass,
    tint: "text-gold",
  },
];

export default function DiscoverPage() {
  return (
    <>
      <MobileTopBar title="Discover" />
      <section className="bg-night min-h-[calc(100dvh-72px)] md:px-8 md:py-16">
        <article className="mx-auto max-w-[1080px] w-full px-5 pt-6 pb-10 md:pt-0 md:pb-0">
          <header className="mb-6 hidden md:block">
            <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
              The whole library
            </p>
            <h1 className="font-sans text-[36px] md:text-[48px] font-bold text-paper leading-[1.05] tracking-[-0.025em]">
              Discover.
            </h1>
            <p className="mt-4 font-serif text-[17px] text-paper/80 max-w-[640px] leading-[1.65]">
              Saints, councils, the calendar, the fasts, and a way into the
              wider library. Tap a tile to start.
            </p>
          </header>

          <p className="md:hidden mt-1 mb-5 font-sans text-[13px] text-paper/65">
            The whole library at a glance.
          </p>

          <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TILES.map(({ label, href, blurb, Icon, tint }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group block h-full rounded-2xl border border-paper/12 bg-paper/[0.03] hover:border-gold/55 hover:bg-gold/[0.06] transition-colors p-4 md:p-5"
                >
                  <div
                    className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-paper/[0.06] ${tint}`}
                  >
                    <Icon size={20} />
                  </div>
                  <p className="font-sans text-[15px] font-semibold text-paper leading-tight">
                    {label}
                  </p>
                  <p className="mt-1.5 font-sans text-[12.5px] text-paper/65 leading-[1.55]">
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
