import Link from "next/link";
import {
  commemorationsOn,
  fastingStatus,
  formatLongDate,
  startOfDayUtc,
  type FastKind,
} from "@/lib/calendar/orthodox";
import { getSaint } from "@/lib/saints/saints";
import { Cross } from "@/components/ui/icons/Cross";
import { Hands } from "@/components/ui/icons/Hands";
import { Book } from "@/components/ui/icons/Book";
import { Compass } from "@/components/ui/icons/Compass";
import { User } from "@/components/ui/icons/User";

/**
 * Mobile-only Today hero (modeled on Hallow's "Pentecost Sunday" surface).
 *
 *  - Full-width tinted backdrop using the day's saint icon as a soft
 *    background image, faded into the page so the type stays primary.
 *  - Date eyebrow + saint headline + a single CTA into the full prayer
 *    surface at /prayers/today.
 *  - A four-chip row underneath (Saved · Prayers · Bible · Discover ·
 *    You) — direct shortcuts into the rest of the app, like Hallow's
 *    Favorites/Ask Hallow/Routine/Recents row.
 *
 *  Hidden on `md+`: the marketing home stays the desktop landing.
 *  Server component — relies only on the calendar helpers, which are
 *  pure and cacheable.
 */

const FAST_TONE: Record<FastKind, string> = {
  strict: "border-[#c1272d]/45 text-[#f8cac7]",
  "wine-oil": "border-gold/55 text-[#f4dc91]",
  fish: "border-[#7b9b8f]/55 text-[#bfd6cc]",
  fast: "border-paper/25 text-paper/85",
  "fast-free": "border-emerald-500/50 text-emerald-200",
  normal: "border-paper/20 text-paper/75",
};

type Chip = {
  label: string;
  href: string;
  Icon: typeof Cross;
};

const CHIPS: Chip[] = [
  { label: "Pray", href: "/prayers/today", Icon: Hands },
  { label: "Read", href: "/bible", Icon: Book },
  { label: "Discover", href: "/discover", Icon: Compass },
  { label: "Saved", href: "/saved", Icon: Cross },
  { label: "You", href: "/account", Icon: User },
];

export function TodayMobileHero() {
  const today = startOfDayUtc(new Date());
  const fast = fastingStatus(today);
  const commemorations = commemorationsOn(today);
  const headline =
    commemorations.find((c) => c.kind === "feast") ?? commemorations[0];
  const headlineSaint =
    headline?.saint ?? (headline?.slug ? getSaint(headline.slug) : null);
  const bgIcon = headlineSaint?.iconUrl;

  return (
    <div className="md:hidden bg-night text-paper">
      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Tinted backdrop using the day's saint icon, blurred way down so it
            reads as a stained-glass wash rather than a portrait. */}
        {bgIcon ? (
          <div
            aria-hidden
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: `url(${bgIcon})`, filter: "blur(18px)" }}
          />
        ) : null}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(22,18,25,0.65) 0%, rgba(22,18,25,0.85) 55%, #161219 100%)",
          }}
        />
        <div className="relative px-5 pt-10 pb-8">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/65">
            {formatLongDate(today)}
          </p>
          <h1 className="mt-2 font-sans text-[28px] font-bold leading-[1.1] tracking-[-0.02em] text-paper">
            {headline ? headline.name : "A quiet day with the Church."}
          </h1>
          {headline?.kind ? (
            <p className="mt-2 font-sans text-[12px] uppercase tracking-[1.5px] text-paper/55">
              {headline.kind === "feast" ? "Feast" : "Commemoration"}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-pill border px-3 py-1.5 font-sans text-[12px] font-semibold ${FAST_TONE[fast.kind]}`}
            >
              {fast.label}
            </span>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              href="/prayers/today"
              className="inline-flex items-center justify-center rounded-pill bg-gold text-night font-sans text-[14px] font-semibold px-5 py-3 hover:bg-gold-soft transition-colors"
            >
              Open today&rsquo;s prayers
            </Link>
            {headlineSaint ? (
              <Link
                href={`/saints/${headlineSaint.slug}`}
                className="inline-flex items-center justify-center rounded-pill border border-paper/25 text-paper/85 font-sans text-[14px] font-medium px-5 py-3 hover:border-paper/55 hover:text-paper transition-colors"
              >
                Read the life
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* CHIP ROW — Hallow-style quick actions. Horizontally scrolling so the
          row doesn't squeeze on the smallest phones. */}
      <section className="px-3 pt-5">
        <ul className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
          {CHIPS.map(({ label, href, Icon }) => (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                className="flex flex-col items-center justify-center gap-1.5 h-[68px] w-[78px] rounded-2xl border border-paper/12 bg-paper/[0.04] hover:bg-paper/[0.08] hover:border-paper/25 transition-colors"
              >
                <Icon size={20} />
                <span className="font-sans text-[11px] text-paper/85">
                  {label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Verse / quote card — pulls the headline saint's first quote
          when available, with St. Seraphim as the steady fallback.
          Kept short on phone, no extra chrome. */}
      {(() => {
        const q = headlineSaint?.quotes?.[0];
        const text = q?.text ?? "Acquire the spirit of peace, and a thousand souls around you will be saved.";
        const cite = q ? `${headlineSaint?.name ?? ""}${q.source ? ` · ${q.source}` : ""}` : "St. Seraphim of Sarov";
        return (
          <section className="px-5 pt-6 pb-2">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-2">
              A word for today
            </p>
            <blockquote className="rounded-lg border border-paper/12 bg-paper/[0.03] p-5">
              <p className="font-serif text-[17px] leading-[1.55] text-paper/90">
                &ldquo;{text}&rdquo;
              </p>
              <p className="mt-3 font-sans text-[11px] uppercase tracking-[1.5px] text-paper/50">
                {cite}
              </p>
            </blockquote>
          </section>
        );
      })()}

      {/* Spacer so the last card clears the floating tab bar without being
          flush. safe-pb on <main> handles the rest. */}
      <div className="h-6" />
    </div>
  );
}
