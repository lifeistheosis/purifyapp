import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { LESSONS } from "@/lib/prayers/learning";
import {
  commemorationsOn,
  fastingStatus,
  formatMonthDay,
  paschaInfo,
  startOfDayUtc,
  type FastKind,
} from "@/lib/calendar/orthodox";
import { SaintIcon } from "@/components/saints/SaintIcon";
import { getSaint } from "@/lib/saints/saints";

export const metadata = {
  title: "Prayer",
  description:
    "Daily prayer in the Orthodox tradition: today's rule, morning and evening rules, akathists, the liturgical hours, and a beginner's path.",
};

// Hourly ISR so the day strip rolls forward without a redeploy.
export const revalidate = 3600;

const FAST_DOT: Record<FastKind, string> = {
  strict: "bg-[#c1272d]",
  "wine-oil": "bg-[#d4af37]",
  fish: "bg-[#7b9b8f]",
  fast: "bg-paper/40",
  "fast-free": "bg-emerald-400",
  normal: "bg-paper/30",
};

const HOURS = [
  {
    label: "First Hour",
    body: "Prayed at the rising of the sun. The Light has come into the world.",
  },
  {
    label: "Third Hour",
    body: "Mid-morning. The descent of the Holy Spirit at Pentecost.",
  },
  {
    label: "Sixth Hour",
    body: "Noon. The Lord on the Cross at the brightest hour of the day.",
  },
  {
    label: "Ninth Hour",
    body: "Mid-afternoon. The Lord's repose; the door between this day and the next.",
  },
];

export default function PrayersPage() {
  const today = startOfDayUtc(new Date());
  const fast = fastingStatus(today);
  const pascha = paschaInfo(today);
  const commemorations = commemorationsOn(today);
  const headline =
    commemorations.find((c) => c.kind === "feast") ?? commemorations[0];
  const headlineSaint =
    headline?.saint ?? (headline?.slug ? getSaint(headline.slug) : null);

  return (
    <section className="bg-night px-5 md:px-8 py-12 md:py-16">
      <div className="mx-auto max-w-[1080px] w-full">
        {/* HERO */}
        <div className="flex items-center gap-3 mb-4">
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/60">
            Prayer
          </p>
          <Badge variant="free">Free</Badge>
        </div>
        <h1 className="font-sans text-[40px] md:text-[56px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          Pray with the Church.
        </h1>
        <p className="mt-5 max-w-[620px] font-sans text-[16px] text-paper/75 leading-[1.65]">
          Daily rules, the prayer of the heart, akathists, and a
          beginner&rsquo;s path. Open it when you rise, open it when you lie
          down; stand in the presence of God, even for a moment.
        </p>

        {/* DAY STRIP — today's date + fast + saint, in one quiet bar */}
        <Link
          href="/prayers/today"
          className="group mt-8 flex items-center gap-4 rounded-md border border-[#d4af37]/30 bg-[#d4af37]/[0.04] px-5 py-4 hover:border-[#d4af37]/60 hover:bg-[#d4af37]/[0.07] transition-colors"
        >
          <div className="shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-md border border-[#d4af37]/40 bg-night text-center">
            <p className="font-sans text-[9px] uppercase tracking-[1.5px] text-[#d4af37]/85 leading-none">
              {formatMonthDay(today).split(" ")[0].slice(0, 3).toUpperCase()}
            </p>
            <p className="font-sans text-[18px] font-bold text-paper leading-none mt-0.5 tabular-nums">
              {today.getUTCDate()}
            </p>
          </div>
          {headlineSaint && (
            <div className="shrink-0">
              <SaintIcon saint={headlineSaint} size="sm" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-[#d4af37]/85 mb-1">
              Today
            </p>
            <p className="font-sans text-[15px] font-semibold text-paper truncate">
              {headline?.name ?? "Pray with the Church"}
            </p>
            <p className="mt-0.5 font-sans text-[12.5px] text-paper/60 flex items-center gap-2 truncate">
              <span
                aria-hidden
                className={`inline-block w-1.5 h-1.5 rounded-full ${FAST_DOT[fast.kind]}`}
              />
              <span>{fast.label}</span>
              <span className="text-paper/30">·</span>
              <span>
                {pascha.daysAway > 0
                  ? `${pascha.daysAway} days to Pascha`
                  : pascha.daysAway === 0
                    ? "Pascha is today"
                    : pascha.label}
              </span>
            </p>
          </div>
          <span
            aria-hidden
            className="shrink-0 font-sans text-[18px] text-paper/45 group-hover:text-[#d4af37] transition-colors"
          >
            →
          </span>
        </Link>

        {/* TODAY — primary CTA */}
        <Link
          href="/prayers/today"
          className="mt-3 block rounded-lg border border-[#d4af37]/35 bg-[#d4af37]/[0.06] p-6 md:p-7 hover:border-[#d4af37]/60 hover:bg-[#d4af37]/[0.10] transition-colors"
        >
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-[#d4af37]/85 mb-3">
                Daily prayer
              </p>
              <h2 className="font-sans text-[24px] md:text-[28px] font-semibold text-paper">
                Today
              </h2>
              <p className="mt-2 font-sans text-[14.5px] text-paper/75 max-w-[560px] leading-[1.6]">
                The date, the saint, the fast, today&rsquo;s appointed
                readings, and one-tap links into the morning rule, the evening
                rule, and the Jesus Prayer.
              </p>
            </div>
            <span aria-hidden className="text-paper/55 text-[20px] mt-1">
              →
            </span>
          </div>
        </Link>

        {/* TWO-CARD GRID — Morning + Evening */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/prayers/morning"
            className="group rounded-lg border border-paper/12 bg-paper/[0.03] hover:border-[#d4af37]/55 hover:bg-[#d4af37]/[0.06] transition-colors p-6"
          >
            <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-[#d4af37]/85 mb-2">
              Morning rule
            </p>
            <h2 className="font-serif text-[26px] md:text-[28px] text-paper leading-tight">
              Begin the day with God
            </h2>
            <p className="mt-4 font-sans text-[13.5px] text-paper/70 leading-[1.65]">
              Sign of the Cross · O Heavenly King · the Trisagion · the
              Lord&rsquo;s Prayer · Rising from Sleep · the Jesus Prayer · the
              Theotokos hymn · dismissal.
            </p>
            <p className="mt-5 flex items-center justify-between">
              <span className="font-sans text-[12px] text-paper/55">
                About 8 minutes
              </span>
              <span className="font-sans text-[13px] font-medium text-paper/75 group-hover:text-[#d4af37] transition-colors">
                Open the rule →
              </span>
            </p>
          </Link>

          <Link
            href="/prayers/evening"
            className="group rounded-lg border border-paper/12 bg-paper/[0.03] hover:border-[#d4af37]/55 hover:bg-[#d4af37]/[0.06] transition-colors p-6"
          >
            <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-[#d4af37]/85 mb-2">
              Evening rule
            </p>
            <h2 className="font-serif text-[26px] md:text-[28px] text-paper leading-tight">
              Lay the day down
            </h2>
            <p className="mt-4 font-sans text-[13.5px] text-paper/70 leading-[1.65]">
              The Trisagion · the Lord&rsquo;s Prayer · a brief examination of
              the day · the Jesus Prayer · Into Thy hands · dismissal.
            </p>
            <p className="mt-5 flex items-center justify-between">
              <span className="font-sans text-[12px] text-paper/55">
                About 8 minutes
              </span>
              <span className="font-sans text-[13px] font-medium text-paper/75 group-hover:text-[#d4af37] transition-colors">
                Open the rule →
              </span>
            </p>
          </Link>
        </div>

        {/* AKATHISTS — placeholder, styled honestly */}
        <a
          href="mailto:team@purify.app?subject=Akathists"
          className="group mt-8 block rounded-lg border border-paper/12 bg-paper/[0.02] hover:border-paper/30 hover:bg-paper/[0.04] transition-colors p-6"
        >
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="min-w-0">
              <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-paper/45 mb-3">
                Coming next
              </p>
              <h2 className="font-serif text-[24px] md:text-[26px] text-paper leading-tight">
                Akathists
              </h2>
              <p className="mt-3 font-sans text-[14px] text-paper/65 leading-[1.65] max-w-[620px]">
                Akathists to Christ, to the Theotokos, and to the
                most-asked-for saints are the next major content drop. Written
                ikoi and kontakia in the wording the Church has carried.
                Email us if you want to be told when they land.
              </p>
            </div>
            <span className="shrink-0 font-sans text-[13px] font-medium text-paper/75 group-hover:text-paper transition-colors mt-1">
              Notify me →
            </span>
          </div>
        </a>

        {/* LEARN TO PRAY */}
        <Link
          href="/prayers/learning"
          className="group mt-8 block rounded-lg border border-accent/30 bg-accent/[0.06] p-6 hover:border-accent/50 hover:bg-accent/[0.09] transition-colors"
        >
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-accent/80 mb-3">
                New to Orthodox prayer? Start here
              </p>
              <h2 className="font-sans text-[22px] md:text-[24px] font-semibold text-paper">
                Learn to pray
              </h2>
              <p className="mt-2 font-sans text-[14px] text-paper/75 max-w-[560px] leading-[1.6]">
                A short, beginner&rsquo;s path through the Sign of the Cross,
                the Jesus Prayer, the Trisagion, and a simple morning and
                evening rule. {LESSONS.length} lessons.
              </p>
            </div>
            <span aria-hidden className="text-paper/55 text-[18px] mt-1">
              →
            </span>
          </div>
        </Link>

        {/* THE HOURS — placeholder 4-card grid */}
        <section className="mt-12">
          <div className="flex items-baseline justify-between mb-4 flex-wrap gap-3">
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/55">
              The Hours
            </p>
            <p className="font-sans text-[11px] text-paper/40 uppercase tracking-[1.2px]">
              Coming soon
            </p>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {HOURS.map((h) => (
              <li
                key={h.label}
                className="rounded-md border border-paper/8 bg-paper/[0.02] p-4"
              >
                <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-paper/55 mb-2">
                  {h.label}
                </p>
                <p className="font-serif text-[14.5px] text-paper/80 leading-[1.55]">
                  {h.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* SIGN-IN NUDGE — soft footer line */}
        <p className="mt-14 font-sans text-[12.5px] text-paper/45 leading-[1.6]">
          Your prayer-rule streaks and highlights live on this device. Sign
          in to keep them across devices.{" "}
          <Link
            href="/account"
            className="text-paper/65 hover:text-paper underline underline-offset-2 decoration-paper/25"
          >
            Your account →
          </Link>
        </p>
      </div>
    </section>
  );
}
