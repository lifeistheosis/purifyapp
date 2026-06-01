import Link from "next/link";
import {
  commemorationsOn,
  fastingStatus,
  formatLongDate,
  startOfDayUtc,
  type FastKind,
} from "@/lib/calendar/orthodox";
import { getSaint } from "@/lib/saints/saints";
import { createClient } from "@/lib/supabase/server";
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
 *    You), direct shortcuts into the rest of the app, like Hallow's
 *    Favorites/Ask Hallow/Routine/Recents row.
 *
 *  Hidden on `md+`: the marketing home stays the desktop landing.
 *  Server component, relies only on the calendar helpers, which are
 *  pure and cacheable.
 */

const FAST_TONE: Record<FastKind, string> = {
  strict: "border-crimson/45 text-crimson-soft",
  "wine-oil": "border-gold/55 text-gold-pale",
  fish: "border-sage/55 text-sage-soft",
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

function greetingForHour(h: number): string {
  if (h < 5) return "Peace be with you";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Peace this night";
}

export async function TodayMobileHero() {
  const today = startOfDayUtc(new Date());
  const fast = fastingStatus(today);
  const commemorations = commemorationsOn(today);
  const headline =
    commemorations.find((c) => c.kind === "feast") ?? commemorations[0];
  const headlineSaint =
    headline?.saint ?? (headline?.slug ? getSaint(headline.slug) : null);
  const bgIcon = headlineSaint?.iconUrl;

  // Signed-in greeting. Silently falls back to nothing if the user is
  // unsigned, so the unauth surface stays the date eyebrow + headline.
  let firstName: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      const displayName =
        (profile?.display_name as string | undefined) ??
        (user.user_metadata?.display_name as string | undefined) ??
        user.email?.split("@")[0] ??
        null;
      if (displayName) firstName = displayName.split(/\s+/)[0];
    }
  } catch {
    // Auth lookups shouldn't break the page; leave firstName null.
  }
  const greeting = firstName
    ? `${greetingForHour(new Date().getHours())}, ${firstName}`
    : null;

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
          {greeting ? (
            <p className="font-serif text-ui italic text-paper/80 mb-1">
              {greeting}
            </p>
          ) : null}
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/65">
            {formatLongDate(today)}
          </p>
          <h1 className="mt-2 font-sans text-title font-bold leading-[1.1] tracking-[-0.02em] text-paper">
            {headline ? headline.name : "A quiet day with the Church."}
          </h1>
          {headline?.kind ? (
            <p className="mt-2 font-sans text-caption uppercase tracking-[1.5px] text-paper/55">
              {headline.kind === "feast" ? "Feast" : "Commemoration"}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-pill border px-3 py-1.5 font-sans text-caption font-semibold ${FAST_TONE[fast.kind]}`}
            >
              {fast.label}
            </span>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              href="/prayers/today"
              className="inline-flex items-center justify-center rounded-pill bg-gold text-night font-sans text-ui font-semibold px-5 py-3 hover:bg-gold-soft transition-colors"
            >
              Open today&rsquo;s prayers
            </Link>
            {headlineSaint ? (
              <Link
                href={`/saints/${headlineSaint.slug}`}
                className="inline-flex items-center justify-center rounded-pill border border-paper/25 text-paper/85 font-sans text-ui font-medium px-5 py-3 hover:border-paper/55 hover:text-paper transition-colors"
              >
                Read the life
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* CHIP ROW, Hallow-style quick actions. Centered when the row
          fits (five chips on most phones); horizontally scrollable as
          a fallback for narrow viewports. */}
      <section className="px-3 pt-5">
        <ul
          className={
            "flex gap-2 overflow-x-auto scrollbar-thin pb-1 " +
            (CHIPS.length <= 5 ? "justify-center" : "")
          }
        >
          {CHIPS.map(({ label, href, Icon }) => (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                className="flex flex-col items-center justify-center gap-1.5 h-[68px] w-[78px] rounded-2xl border border-paper/12 bg-paper/[0.04] hover:bg-paper/[0.08] hover:border-paper/25 transition-colors"
              >
                <Icon size={20} />
                <span className="font-sans text-eyebrow text-paper/85">
                  {label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Verse / quote card, pulls the headline saint's first quote
          when available, with St. Seraphim as the steady fallback.
          Kept short on phone, no extra chrome. */}
      {(() => {
        const q = headlineSaint?.quotes?.[0];
        const text = q?.text ?? "Acquire the spirit of peace, and a thousand souls around you will be saved.";
        const cite = q ? `${headlineSaint?.name ?? ""}${q.source ? ` · ${q.source}` : ""}` : "St. Seraphim of Sarov";
        return (
          <section className="px-5 pt-6 pb-2">
            <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55 mb-2">
              A word for today
            </p>
            <blockquote className="rounded-lg border border-paper/12 bg-paper/[0.03] p-5">
              <p className="font-serif text-body leading-[1.55] text-paper/90">
                &ldquo;{text}&rdquo;
              </p>
              <p className="mt-3 font-sans text-eyebrow uppercase tracking-[1.5px] text-paper/50">
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
