import Link from "next/link";
import { SUPPORT } from "@/data/support/support";

export const metadata = {
  title: "Support",
  description:
    "How the project is funded, what the money goes toward, and how to help. Free now. Transparent goal. No paywall on what is shipped.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";

function formatUsd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: SUPPORT.currency, maximumFractionDigits: 0 });
}

export default function SupportPage() {
  const totalMonthlyExpense = SUPPORT.expenses.reduce(
    (s, e) => s + e.monthlyUsd,
    0,
  );
  const pct = Math.min(
    1,
    Math.max(0, SUPPORT.monthlyRaisedUsd / SUPPORT.monthlyGoalUsd),
  );

  return (
    <section className={`${SECTION} bg-night`}>
      <article className="mx-auto max-w-[760px] w-full">
        <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
          Support this work
        </p>
        <h1 className="font-sans text-[40px] md:text-[52px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          Free now. Donations welcome.
        </h1>
        <p className="mt-6 font-serif text-[19px] text-paper/85 leading-[1.7]">
          Purify is free, with no plans to put a paywall around what
          ships today. Hosting, storage, sourcing, and the people who
          do the work all cost money. If the site has helped you, you
          can keep the lights on, or speed up the next thing we build.
        </p>

        {/* Live goal */}
        <section className="mt-12 rounded-lg border border-paper/12 bg-paper/[0.03] p-6 md:p-8">
          <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
            <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55">
              This month&rsquo;s goal
            </p>
            <p className="font-sans text-[11px] text-paper/40">
              Updated {SUPPORT.lastUpdated}
            </p>
          </div>
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <p className="font-sans text-[28px] md:text-[32px] font-bold text-paper tabular-nums">
              {formatUsd(SUPPORT.monthlyRaisedUsd)}
              <span className="text-paper/45 text-[18px] font-normal">
                {" "}of {formatUsd(SUPPORT.monthlyGoalUsd)}
              </span>
            </p>
            <p className="font-sans text-[13px] text-[#d4af37] font-semibold tabular-nums">
              {Math.round(pct * 100)}%
            </p>
          </div>
          <div className="h-[6px] rounded-full bg-paper/8 overflow-hidden">
            <div
              className="h-full bg-[#d4af37] transition-[width] duration-500"
              style={{ width: `${Math.round(pct * 100)}%` }}
            />
          </div>
          <p className="mt-3 font-sans text-[12.5px] text-paper/55">
            We list real numbers, not vanity metrics. The goal moves with
            actual monthly expenses below.
          </p>
        </section>

        {/* How to give */}
        <section className="mt-10">
          <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
            How to give
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SUPPORT.donateLinks.map((d) => (
              <Link
                key={d.label}
                href={d.href}
                target={d.href.startsWith("http") ? "_blank" : undefined}
                rel={d.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="group rounded-md border border-paper/15 bg-paper/[0.03] hover:border-[#d4af37]/55 hover:bg-[#d4af37]/[0.06] transition-colors p-5"
              >
                <p className="font-sans text-[16px] font-semibold text-paper leading-tight">
                  {d.label}
                </p>
                <p className="mt-2 font-sans text-[12.5px] text-paper/65 leading-[1.55]">
                  {d.note}
                </p>
                <p className="mt-4 font-sans text-[12px] font-medium text-paper/65 group-hover:text-[#d4af37] transition-colors">
                  Open →
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Expense breakdown */}
        <section className="mt-14">
          <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
            Where the money goes
          </p>
          <p className="font-serif text-[17px] text-paper/80 leading-[1.7] mb-6">
            Every line is real. Total monthly cost as of{" "}
            {SUPPORT.lastUpdated} is {formatUsd(totalMonthlyExpense)}. The
            funding goal above is set at {formatUsd(SUPPORT.monthlyGoalUsd)}
            {" "}to leave some margin for the unpredictable months.
          </p>
          <ul className="divide-y divide-paper/8 border border-paper/12 rounded-md overflow-hidden">
            {SUPPORT.expenses.map((e) => (
              <li
                key={e.label}
                className="px-5 py-4 flex items-baseline justify-between gap-4 bg-paper/[0.02]"
              >
                <div className="min-w-0">
                  <p className="font-sans text-[14.5px] font-semibold text-paper leading-tight">
                    {e.label}
                  </p>
                  {e.note && (
                    <p className="mt-1 font-sans text-[12.5px] text-paper/55 leading-[1.55]">
                      {e.note}
                    </p>
                  )}
                </div>
                <p className="shrink-0 font-sans text-[15px] font-semibold text-[#d4af37] tabular-nums">
                  {formatUsd(e.monthlyUsd)}/mo
                </p>
              </li>
            ))}
            <li className="px-5 py-4 flex items-baseline justify-between gap-4 bg-paper/[0.06]">
              <p className="font-sans text-[14.5px] font-bold text-paper">
                Monthly total
              </p>
              <p className="font-sans text-[16px] font-bold text-paper tabular-nums">
                {formatUsd(totalMonthlyExpense)}/mo
              </p>
            </li>
          </ul>
        </section>

        {/* Supporter tier note */}
        <section className="mt-14 rounded-lg border border-paper/12 bg-paper/[0.02] p-6">
          <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
            A note on a future supporter tier
          </p>
          <p className="font-serif text-[17px] text-paper/85 leading-[1.7]">
            Some future features cost meaningfully more to run than what
            ships today: audio recordings of the daily services, optional
            account-and-sync (so your highlights follow you across
            devices), custom prayer plans. When those land, we will offer
            an optional supporter tier to fund them. **Everything that is
            free today will stay free.** We will not move features behind
            a paywall after the fact.
          </p>
        </section>

        {/* Closing */}
        <p className="mt-14 font-serif italic text-center text-[18px] text-paper/70">
          Whatever you give, or do not give, we are glad you are here.
        </p>
      </article>
    </section>
  );
}
