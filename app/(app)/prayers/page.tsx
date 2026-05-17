import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { LESSONS } from "@/lib/prayers/learning";

export const metadata = {
  title: "Prayer - Purify",
  description:
    "Daily prayer in the Orthodox tradition: today's rule, morning and evening rules, the Jesus Prayer counter, and a beginner's path.",
};

export default function PrayersPage() {
  return (
    <section className="bg-night px-5 md:px-8 py-12 md:py-20">
      <div className="mx-auto max-w-[1080px] w-full">
        <div className="flex items-center gap-3 mb-4">
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/60">
            Prayer
          </p>
          <Badge variant="free">Free</Badge>
        </div>
        <h1 className="font-sans text-[40px] md:text-[56px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          Prayer
        </h1>
        <p className="mt-5 max-w-[640px] font-sans text-[16px] text-paper/75">
          Daily rules, the Jesus Prayer, akathists, and a beginner&rsquo;s path
          to learn how to pray in the Orthodox tradition.
        </p>

        {/* Today — the daily prayer home */}
        <Link
          href="/prayers/today"
          className="mt-12 block rounded-lg border border-[#d4af37]/35 bg-[#d4af37]/[0.06] p-6 md:p-8 hover:border-[#d4af37]/60 hover:bg-[#d4af37]/[0.10] transition-colors"
        >
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-[#d4af37]/85 mb-3">
                Daily prayer
              </p>
              <h2 className="font-sans text-[24px] md:text-[28px] font-semibold text-paper">
                Today
              </h2>
              <p className="mt-2 font-sans text-[15px] text-paper/75 max-w-[560px]">
                Today&rsquo;s date, the saint, the fast, and the appointed
                readings, plus one-tap links into the morning rule, the evening
                rule, and the Jesus Prayer.
              </p>
            </div>
            <span aria-hidden className="text-paper/55 text-[20px] mt-1">
              →
            </span>
          </div>
        </Link>

        {/* Morning + evening + Jesus Prayer */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link
            href="/prayers/morning"
            className="rounded-md border border-paper/12 bg-paper/[0.03] hover:border-paper/30 hover:bg-paper/[0.06] transition-colors p-5"
          >
            <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-paper/55 mb-1.5">
              Morning rule
            </p>
            <p className="font-serif text-[18px] text-paper leading-tight">
              Begin the day with God
            </p>
            <p className="mt-2 font-sans text-[12px] text-paper/55">~8 minutes</p>
          </Link>
          <Link
            href="/prayers/evening"
            className="rounded-md border border-paper/12 bg-paper/[0.03] hover:border-paper/30 hover:bg-paper/[0.06] transition-colors p-5"
          >
            <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-paper/55 mb-1.5">
              Evening rule
            </p>
            <p className="font-serif text-[18px] text-paper leading-tight">
              Lay the day down
            </p>
            <p className="mt-2 font-sans text-[12px] text-paper/55">~8 minutes</p>
          </Link>
          <Link
            href="/prayers/jesus-prayer"
            className="rounded-md border border-paper/12 bg-paper/[0.03] hover:border-paper/30 hover:bg-paper/[0.06] transition-colors p-5"
          >
            <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-paper/55 mb-1.5">
              The Jesus Prayer
            </p>
            <p className="font-serif text-[18px] text-paper leading-tight">
              Counter with breath cue
            </p>
            <p className="mt-2 font-sans text-[12px] text-paper/55">
              Goal presets · day streak
            </p>
          </Link>
        </div>

        {/* Learn to Pray */}
        <Link
          href="/prayers/learning"
          className="mt-10 block rounded-lg border border-accent/30 bg-accent/[0.06] p-6 hover:border-accent/50 hover:bg-accent/[0.09] transition-colors"
        >
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-accent/80 mb-3">
                New to Orthodox prayer? Start here
              </p>
              <h2 className="font-sans text-[22px] font-semibold text-paper">
                Learn to pray
              </h2>
              <p className="mt-2 font-sans text-[14px] text-paper/75 max-w-[560px]">
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

        <section className="mt-14">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/50 mb-4">
            More coming soon
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans text-[14px] text-paper/65">
            <li className="rounded-md border border-paper/8 bg-paper/[0.02] p-4">
              Akathists to Christ, the Theotokos, and beloved saints
            </li>
            <li className="rounded-md border border-paper/8 bg-paper/[0.02] p-4">
              Seasonal plans for Great Lent, Holy Week, and Pascha
            </li>
            <li className="rounded-md border border-paper/8 bg-paper/[0.02] p-4">
              Custom personal prayer plans
            </li>
            <li className="rounded-md border border-paper/8 bg-paper/[0.02] p-4">
              Audio recordings of the daily rules
            </li>
          </ul>
        </section>
      </div>
    </section>
  );
}
