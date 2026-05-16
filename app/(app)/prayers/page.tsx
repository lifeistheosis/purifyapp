import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { LESSONS } from "@/lib/prayers/learning";

export const metadata = {
  title: "Prayer - Purify",
  description:
    "Orthodox prayer: daily plans, the Jesus Prayer, and a beginner's path to learn how to pray.",
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

        {/* Featured: Learn to Pray */}
        <Link
          href="/prayers/learning"
          className="mt-12 block rounded-lg border border-accent/30 bg-accent/[0.06] p-6 md:p-8 hover:border-accent/50 hover:bg-accent/[0.09] transition-colors"
        >
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-accent/80 mb-3">
                New to Orthodox prayer? Start here
              </p>
              <h2 className="font-sans text-[24px] md:text-[28px] font-semibold text-paper">
                Learn to pray
              </h2>
              <p className="mt-2 font-sans text-[15px] text-paper/75 max-w-[560px]">
                A short, beginner&rsquo;s path through the Sign of the Cross,
                the Jesus Prayer, the Trisagion, and a simple morning and
                evening rule. {LESSONS.length} lessons.
              </p>
            </div>
            <span aria-hidden className="text-paper/55 text-[20px] mt-1">
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
              Daily morning and evening rules from the Jordanville prayer book
            </li>
            <li className="rounded-md border border-paper/8 bg-paper/[0.02] p-4">
              Akathists to Christ, the Theotokos, and beloved saints
            </li>
            <li className="rounded-md border border-paper/8 bg-paper/[0.02] p-4">
              Seasonal plans for Great Lent, Holy Week, and Pascha
            </li>
            <li className="rounded-md border border-paper/8 bg-paper/[0.02] p-4">
              The Prayer Rope, the icon corner, and a rule of life
            </li>
          </ul>
        </section>
      </div>
    </section>
  );
}
